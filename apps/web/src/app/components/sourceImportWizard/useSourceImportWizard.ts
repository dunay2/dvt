/** Owned concern: coordinate source import wizard state through the import port. */
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import type {
  CreateWarehouseConnectionInput,
  ImportSourcesResult,
  IWarehouseSourceImportPort,
  WarehouseConnection,
} from '../../ports/workspace';
import type { SourceImportOptionContribution, SourceImportOptionId } from '../../plugins/registry';
import { sourceImportWizardCopy as copy } from './copy';
import { buildSourceObjectIdentityKey, isSourceObjectImportable } from './sourceImportCatalogModel';
import {
  applySourceImportOptionDefaults,
  buildSourceImportOptionValues,
  canEnterSourceImportSection,
  canProceedForStep,
  getNextStep,
  getPreviousStep,
  getSelectedCount,
  getSelectedSourceObjects,
  resolveActiveSourceObject,
  resolveSectionForStep,
  resolveStepForSection,
  toggleSourceImportDatabaseSelection,
  toggleSourceImportSchemaSelection,
} from './sourceImportWizardModel';
import { useConnectionsLoader, useSourceObjectsLoader } from './useSourceImportWizardDataLoaders';
import type {
  SourceImportInitialSelection,
  SourceImportDatabaseIdentity,
  SourceImportGroupingStrategy,
  SourceImportSchemaIdentity,
  SourceImportSection,
  SourceImportWizardState,
  WizardStep,
} from './types';

interface UseSourceImportWizardParams {
  open: boolean;
  warehouseSourceImport: IWarehouseSourceImportPort;
  sourceImportOptions: readonly SourceImportOptionContribution[];
  onComplete?: (result: ImportSourcesResult) => void;
  onClose: () => void;
  initialSelection?: SourceImportInitialSelection | null;
}

const initialState: SourceImportWizardState = {
  currentStep: 'connection',
  connections: [],
  selectedConnection: null,
  createConnectionFormOpen: false,
  createConnectionForm: {
    name: '',
    type: 'postgres',
    database: '',
    credentialRef: '',
  },
  sourceObjects: [],
  groupingStrategy: 'schema',
  includeColumns: false,
  addTests: false,
  addFreshness: false,
  isProcessing: false,
  isLoadingConnections: false,
  isLoadingSourceObjects: false,
  isCreatingConnection: false,
  isTestingConnection: false,
  connectionTestResult: null,
  loadError: null,
  createConnectionError: null,
  importResult: null,
  activeSourceObjectKey: null,
  sourceObjectSearchQuery: '',
};

function hasImportedCanvasNodes(result: ImportSourcesResult): boolean {
  return (result.importedNodeIds?.length ?? 0) > 0;
}

function normalizeCreateConnectionInput(
  input: CreateWarehouseConnectionInput
): CreateWarehouseConnectionInput {
  return {
    name: input.name.trim(),
    type: input.type,
    database: input.database.trim(),
    credentialRef: input.credentialRef.trim(),
  };
}

function isCreateConnectionInputComplete(input: CreateWarehouseConnectionInput): boolean {
  return input.name.length > 0 && input.database.length > 0 && input.credentialRef.length > 0;
}

function upsertWarehouseConnection(
  connections: readonly WarehouseConnection[],
  nextConnection: WarehouseConnection
): WarehouseConnection[] {
  const replaced = connections.map((connection) =>
    connection.id === nextConnection.id ? nextConnection : connection
  );
  return replaced.some((connection) => connection.id === nextConnection.id)
    ? replaced
    : [...connections, nextConnection];
}

export function useSourceImportWizard({
  open,
  warehouseSourceImport,
  sourceImportOptions,
  onComplete,
  onClose,
  initialSelection,
}: UseSourceImportWizardParams) {
  const initialWizardState = useMemo(
    () => applySourceImportOptionDefaults(initialState, sourceImportOptions),
    [sourceImportOptions]
  );
  const [state, setState] = useState<SourceImportWizardState>(initialWizardState);
  useEffect(() => {
    setState((prev) => ({
      ...prev,
      includeColumns: initialWizardState.includeColumns,
      addTests: initialWizardState.addTests,
      addFreshness: initialWizardState.addFreshness,
    }));
  }, [initialWizardState]);
  useEffect(() => {
    if (!open || initialSelection == null) {
      return;
    }

    setState((prev) => ({
      ...prev,
      currentStep: 'selection',
      selectedConnection: initialSelection.connectionId,
      createConnectionFormOpen: false,
      createConnectionError: null,
      sourceObjects: [],
      activeSourceObjectKey: null,
      sourceObjectSearchQuery: '',
      loadError: null,
      importResult: null,
    }));
  }, [initialSelection, open]);
  const selectedCount = useMemo(() => getSelectedCount(state.sourceObjects), [state.sourceObjects]);
  const selectedSourceObjects = useMemo(
    () => getSelectedSourceObjects(state.sourceObjects),
    [state.sourceObjects]
  );
  const activeSourceObject = useMemo(
    () => resolveActiveSourceObject(state.sourceObjects, state.activeSourceObjectKey),
    [state.activeSourceObjectKey, state.sourceObjects]
  );
  const activeSection = resolveSectionForStep(state.currentStep);
  const sourceImportOptionValues = useMemo(
    () => buildSourceImportOptionValues(state),
    [state.includeColumns, state.addTests, state.addFreshness]
  );
  const selectedConnectionObject = useMemo<WarehouseConnection | undefined>(
    () => state.connections.find((connection) => connection.id === state.selectedConnection),
    [state.connections, state.selectedConnection]
  );
  const initiallySelectedSourceObjectsForConnection =
    state.selectedConnection === initialSelection?.connectionId
      ? initialSelection.sourceObjects
      : undefined;

  useConnectionsLoader({ open, warehouseSourceImport, setState });
  useSourceObjectsLoader({
    open,
    selectedConnection: state.selectedConnection,
    initiallySelectedSourceObjects: initiallySelectedSourceObjectsForConnection,
    warehouseSourceImport,
    setState,
  });

  const setCurrentStep = (currentStep: WizardStep) =>
    setState((prev) => ({ ...prev, currentStep }));
  const setCurrentSection = (section: SourceImportSection) => {
    if (
      !canEnterSourceImportSection(
        section,
        state.selectedConnection,
        selectedCount,
        activeSourceObject != null
      )
    ) {
      return;
    }

    setCurrentStep(resolveStepForSection(section));
  };
  const setSelectedConnection = (selectedConnection: string | null) =>
    setState((prev) => ({
      ...prev,
      selectedConnection,
      createConnectionError: null,
      sourceObjects: selectedConnection === prev.selectedConnection ? prev.sourceObjects : [],
      activeSourceObjectKey:
        selectedConnection === prev.selectedConnection ? prev.activeSourceObjectKey : null,
      sourceObjectSearchQuery:
        selectedConnection === prev.selectedConnection ? prev.sourceObjectSearchQuery : '',
      connectionTestResult:
        selectedConnection === prev.selectedConnection ? prev.connectionTestResult : null,
      importResult: null,
    }));
  const setGroupingStrategy = (groupingStrategy: SourceImportGroupingStrategy) =>
    setState((prev) => ({ ...prev, groupingStrategy }));
  const setIncludeColumns = (includeColumns: boolean) =>
    setState((prev) => ({ ...prev, includeColumns }));
  const setAddTests = (addTests: boolean) => setState((prev) => ({ ...prev, addTests }));
  const setAddFreshness = (addFreshness: boolean) =>
    setState((prev) => ({ ...prev, addFreshness }));
  const setSourceImportOption = (optionId: SourceImportOptionId, value: boolean) =>
    setState((prev) => ({ ...prev, [optionId]: value }));
  const setSourceObjectSearchQuery = (sourceObjectSearchQuery: string) =>
    setState((prev) => ({ ...prev, sourceObjectSearchQuery }));
  const openCreateConnectionForm = () =>
    setState((prev) => ({
      ...prev,
      createConnectionFormOpen: true,
      createConnectionError: null,
      loadError: null,
    }));
  const cancelCreateConnectionForm = () =>
    setState((prev) => ({
      ...prev,
      createConnectionFormOpen: false,
      createConnectionError: null,
    }));
  const setCreateConnectionFormField = <Field extends keyof CreateWarehouseConnectionInput>(
    field: Field,
    value: CreateWarehouseConnectionInput[Field]
  ) =>
    setState((prev) => ({
      ...prev,
      createConnectionForm: {
        ...prev.createConnectionForm,
        [field]: value,
      },
      createConnectionError: null,
    }));

  const handleNext = () => {
    if (state.currentStep === 'connection' && !state.selectedConnection) {
      toast.error(copy.selectConnectionError);
      return;
    }
    if (state.currentStep === 'selection' && selectedCount === 0) {
      toast.error(copy.selectAtLeastOneObjectError);
      return;
    }
    setCurrentStep(getNextStep(state.currentStep));
  };

  const handleBack = () => setCurrentStep(getPreviousStep(state.currentStep));

  const handleTestConnection = async () => {
    if (!state.selectedConnection) {
      setState((prev) => ({ ...prev, loadError: copy.selectConnectionError }));
      return;
    }

    setState((prev) => ({
      ...prev,
      isTestingConnection: true,
      connectionTestResult: null,
      loadError: null,
    }));
    try {
      const connectionTestResult = await warehouseSourceImport.testWarehouseConnection(
        state.selectedConnection
      );
      setState((prev) => ({ ...prev, connectionTestResult }));
    } catch (error) {
      const message = error instanceof Error ? error.message : copy.connection.testError;
      setState((prev) => ({ ...prev, loadError: message }));
      toast.error(message);
    } finally {
      setState((prev) => ({ ...prev, isTestingConnection: false }));
    }
  };

  const handleCreateConnection = async () => {
    const input = normalizeCreateConnectionInput(state.createConnectionForm);
    if (!isCreateConnectionInputComplete(input)) {
      setState((prev) => ({
        ...prev,
        createConnectionError: copy.connection.createValidationError,
      }));
      return;
    }

    setState((prev) => ({
      ...prev,
      isCreatingConnection: true,
      createConnectionError: null,
      loadError: null,
      connectionTestResult: null,
    }));
    try {
      const connection = await warehouseSourceImport.createWarehouseConnection(input);
      setState((prev) => ({
        ...prev,
        connections: upsertWarehouseConnection(prev.connections, connection),
        selectedConnection: connection.id,
        createConnectionFormOpen: false,
        createConnectionForm: initialWizardState.createConnectionForm,
        sourceObjects: [],
        activeSourceObjectKey: null,
        sourceObjectSearchQuery: '',
        connectionTestResult: null,
        importResult: null,
      }));
      toast.success(copy.connection.createSuccess);
    } catch (error) {
      const message = error instanceof Error ? error.message : copy.connection.createError;
      setState((prev) => ({ ...prev, createConnectionError: message }));
      toast.error(message);
    } finally {
      setState((prev) => ({ ...prev, isCreatingConnection: false }));
    }
  };

  const handleImport = async () => {
    if (!state.selectedConnection) {
      setState((prev) => ({ ...prev, loadError: copy.selectConnectionError }));
      return;
    }
    setState((prev) => ({ ...prev, isProcessing: true, loadError: null }));
    try {
      const result = await warehouseSourceImport.importSources({
        connectionId: state.selectedConnection,
        objects: selectedSourceObjects.map((sourceObject) => ({
          objectId: sourceObject.objectId,
        })),
        groupingStrategy: state.groupingStrategy,
        includeColumns: state.includeColumns,
        addTests: state.addTests,
        addFreshness: state.addFreshness,
      });
      setState((prev) => ({
        ...prev,
        importResult: result,
        currentStep: 'result',
      }));
      if (hasImportedCanvasNodes(result)) {
        onComplete?.(result);
        toast.success(copy.importSuccess);
      } else {
        toast.info(copy.importNoop);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : copy.importError;
      setState((prev) => ({ ...prev, loadError: message }));
      toast.error(message);
    } finally {
      setState((prev) => ({ ...prev, isProcessing: false }));
    }
  };

  const handleComplete = () => {
    onClose();
    setState(initialWizardState);
  };

  const toggleSourceObject = (index: number) => {
    setState((prev) => {
      const sourceObject = prev.sourceObjects[index];
      if (sourceObject == null || !isSourceObjectImportable(sourceObject)) {
        return prev;
      }

      return {
        ...prev,
        sourceObjects: prev.sourceObjects.map((candidate, candidateIndex) =>
          candidateIndex === index ? { ...candidate, selected: !candidate.selected } : candidate
        ),
        activeSourceObjectKey: buildSourceObjectIdentityKey(sourceObject),
      };
    });
  };

  const activateSourceObject = (index: number) => {
    setState((prev) => ({
      ...prev,
      activeSourceObjectKey: prev.sourceObjects[index]
        ? buildSourceObjectIdentityKey(prev.sourceObjects[index])
        : null,
    }));
  };

  const toggleSchema = (schema: SourceImportSchemaIdentity) => {
    setState((prev) => {
      const schemaSelection = toggleSourceImportSchemaSelection(prev.sourceObjects, schema);

      return {
        ...prev,
        sourceObjects: schemaSelection.sourceObjects,
        activeSourceObjectKey: schemaSelection.activeSourceObjectKey,
      };
    });
  };

  const toggleDatabase = (database: SourceImportDatabaseIdentity) => {
    setState((prev) => {
      const databaseSelection = toggleSourceImportDatabaseSelection(prev.sourceObjects, database);

      return {
        ...prev,
        sourceObjects: databaseSelection.sourceObjects,
        activeSourceObjectKey: databaseSelection.activeSourceObjectKey,
      };
    });
  };

  const canProceed = canProceedForStep(state.currentStep, state.selectedConnection, selectedCount);
  const canImport = state.selectedConnection != null && selectedCount > 0 && !state.isProcessing;

  return {
    state,
    selectedCount,
    selectedSourceObjects,
    activeSourceObject,
    activeSection,
    selectedConnectionObject,
    sourceImportOptions,
    sourceImportOptionValues,
    canProceed,
    canImport,
    canEnterSection: (section: SourceImportSection) =>
      canEnterSourceImportSection(
        section,
        state.selectedConnection,
        selectedCount,
        activeSourceObject != null
      ),
    setCurrentSection,
    setSelectedConnection,
    openCreateConnectionForm,
    cancelCreateConnectionForm,
    setCreateConnectionFormField,
    setGroupingStrategy,
    setIncludeColumns,
    setAddTests,
    setAddFreshness,
    setSourceImportOption,
    setSourceObjectSearchQuery,
    handleNext,
    handleBack,
    handleCreateConnection,
    handleTestConnection,
    handleImport,
    handleComplete,
    activateSourceObject,
    toggleSourceObject,
    toggleDatabase,
    toggleSchema,
  };
}

export type SourceImportWizardController = ReturnType<typeof useSourceImportWizard>;
