/** Owned concern: coordinate source import wizard state through the import port. */
import { PostgresCredentialRefSchema } from '@dvt/contracts';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import type {
  CreateWarehouseConnectionInput,
  ImportSourcesResult,
  IWarehouseSourceImportPort,
  RenameWarehouseConnectionInput,
  WarehouseConnection,
} from '../../ports/workspace';
import type { SourceImportOptionContribution, SourceImportOptionId } from '../../plugins/registry';
import {
  extractHttpErrorReason,
  extractHttpErrorTarget,
} from '../../services/api/classifyHttpError';
import { resolveSourceImportFailureMessage, useSourceImportLocalization } from './copy';
import {
  buildSourceImportCommand,
  resolveSourceImportCommandIdentity,
  type SourceImportCommandIdentity,
} from './sourceImportCommandModel';
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
  matchRequestedDbtSourceTargets,
  resolveActiveSourceObject,
  resolveSectionForStep,
  resolveStepForSection,
  toggleSourceImportDatabaseSelection,
  toggleSourceImportSchemaSelection,
} from './sourceImportWizardModel';
import { useConnectionsLoader, useSourceObjectsLoader } from './useSourceImportWizardDataLoaders';
import {
  buildSourceImportFailure,
  type SourceImportDatabaseIdentity,
  type SourceImportGroupingStrategy,
  type SourceImportInitialSelection,
  type SourceImportSchemaIdentity,
  type SourceImportSection,
  type SourceImportWizardState,
  type WizardStep,
} from './types';

interface UseSourceImportWizardParams {
  open: boolean;
  canvasId: string;
  warehouseSourceImport: IWarehouseSourceImportPort;
  sourceImportOptions: readonly SourceImportOptionContribution[];
  onComplete?: (result: ImportSourcesResult) => void;
  onConnectionRenamed?: (connection: WarehouseConnection) => void | Promise<void>;
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
  renameConnectionFormOpen: false,
  renameConnectionForm: { name: '' },
  sourceObjects: [],
  groupingStrategy: 'schema',
  includeColumns: false,
  addTests: false,
  addFreshness: false,
  isProcessing: false,
  isLoadingConnections: false,
  isLoadingSourceObjects: false,
  isCreatingConnection: false,
  isRenamingConnection: false,
  isTestingConnection: false,
  connectionTestResult: null,
  loadError: null,
  createConnectionError: null,
  renameConnectionError: null,
  renameConnectionSucceeded: false,
  importResult: null,
  activeSourceObjectKey: null,
  sourceObjectSearchQuery: '',
};

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
  const nextConnections = replaced.some((connection) => connection.id === nextConnection.id)
    ? replaced
    : [...connections, nextConnection];
  return nextConnections.sort((left, right) => left.name.localeCompare(right.name));
}

export function useSourceImportWizard({
  open,
  canvasId,
  warehouseSourceImport,
  sourceImportOptions,
  onComplete,
  onConnectionRenamed,
  onClose,
  initialSelection,
}: UseSourceImportWizardParams) {
  const { copy } = useSourceImportLocalization();
  const initialWizardState = useMemo(
    () => applySourceImportOptionDefaults(initialState, sourceImportOptions),
    [sourceImportOptions]
  );
  const [state, setState] = useState<SourceImportWizardState>(initialWizardState);
  const dbtSourceBinding =
    initialSelection?.kind === 'dbt-source-binding' ? initialSelection : null;
  const catalogInitialSelection =
    initialSelection != null && initialSelection.kind !== 'dbt-source-binding'
      ? initialSelection
      : null;
  const pendingImportIdentity = useRef<SourceImportCommandIdentity | null>(null);
  useEffect(() => {
    if (!open) {
      pendingImportIdentity.current = null;
    }
  }, [open]);
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
      currentStep: initialSelection.kind === 'dbt-source-binding' ? 'connection' : 'selection',
      selectedConnection:
        initialSelection.kind === 'dbt-source-binding' ? null : initialSelection.connectionId,
      createConnectionFormOpen: false,
      renameConnectionFormOpen: false,
      renameConnectionError: null,
      renameConnectionSucceeded: false,
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
    state.selectedConnection === catalogInitialSelection?.connectionId
      ? catalogInitialSelection.sourceObjects
      : undefined;
  const dbtSourceTargetMatch = useMemo(
    () =>
      dbtSourceBinding == null
        ? null
        : matchRequestedDbtSourceTargets(
            dbtSourceBinding.sourceTableDeclarations,
            state.sourceObjects
          ),
    [dbtSourceBinding, state.sourceObjects]
  );
  const dbtSourceBindingReady = useMemo(() => {
    if (dbtSourceBinding == null || dbtSourceTargetMatch == null) return true;
    const selectedObjectIds = new Set(
      selectedSourceObjects.map((sourceObject) => sourceObject.objectId)
    );
    return (
      dbtSourceTargetMatch.unmatchedSourceUniqueIds.length === 0 &&
      dbtSourceTargetMatch.targets.length === dbtSourceBinding.sourceTableDeclarations.length &&
      selectedObjectIds.size === dbtSourceTargetMatch.objectIds.length &&
      dbtSourceTargetMatch.objectIds.every((objectId) => selectedObjectIds.has(objectId))
    );
  }, [dbtSourceBinding, dbtSourceTargetMatch, selectedSourceObjects]);

  useConnectionsLoader({ open, warehouseSourceImport, setState });
  useSourceObjectsLoader({
    open,
    selectedConnection: state.selectedConnection,
    initiallySelectedSourceObjects: initiallySelectedSourceObjectsForConnection,
    requestedDbtSourceDeclarations: dbtSourceBinding?.sourceTableDeclarations,
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
      currentStep: selectedConnection != null ? 'selection' : prev.currentStep,
      selectedConnection,
      createConnectionError: null,
      renameConnectionFormOpen: false,
      renameConnectionError: null,
      renameConnectionSucceeded: false,
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
      renameConnectionFormOpen: false,
      renameConnectionError: null,
      renameConnectionSucceeded: false,
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
  const openRenameConnectionForm = () => {
    if (!selectedConnectionObject) return;
    setState((prev) => ({
      ...prev,
      createConnectionFormOpen: false,
      createConnectionError: null,
      renameConnectionFormOpen: true,
      renameConnectionForm: { name: selectedConnectionObject.name },
      renameConnectionError: null,
      renameConnectionSucceeded: false,
      loadError: null,
    }));
  };
  const cancelRenameConnectionForm = () =>
    setState((prev) => ({
      ...prev,
      renameConnectionFormOpen: false,
      renameConnectionError: null,
      renameConnectionSucceeded: false,
    }));
  const setRenameConnectionName = (name: RenameWarehouseConnectionInput['name']) =>
    setState((prev) => ({
      ...prev,
      renameConnectionForm: { name },
      renameConnectionError: null,
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
      setState((prev) => ({
        ...prev,
        loadError: buildSourceImportFailure('select-connection'),
      }));
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
      const failure = buildSourceImportFailure('test-connection', error);
      setState((prev) => ({ ...prev, loadError: failure }));
      toast.error(resolveSourceImportFailureMessage(copy, failure));
    } finally {
      setState((prev) => ({ ...prev, isTestingConnection: false }));
    }
  };

  const handleCreateConnection = async () => {
    const input = normalizeCreateConnectionInput(state.createConnectionForm);
    if (!isCreateConnectionInputComplete(input)) {
      setState((prev) => ({
        ...prev,
        createConnectionError: buildSourceImportFailure('create-connection-validation'),
      }));
      return;
    }
    if (!PostgresCredentialRefSchema.safeParse(input.credentialRef).success) {
      setState((prev) => ({
        ...prev,
        createConnectionError: buildSourceImportFailure('create-connection-credential-reference'),
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
        currentStep: dbtSourceBinding == null ? prev.currentStep : 'selection',
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
      const reason = extractHttpErrorReason(error);
      const target = extractHttpErrorTarget(error);
      const failure = buildSourceImportFailure(
        reason === 'warehouse_connection_duplicate'
          ? 'connection-name-conflict'
          : reason === 'invalid_credential_reference' && target === 'credentialRef'
            ? 'create-connection-credential-reference'
            : 'create-connection',
        error
      );
      setState((prev) => ({ ...prev, createConnectionError: failure }));
      toast.error(resolveSourceImportFailureMessage(copy, failure));
    } finally {
      setState((prev) => ({ ...prev, isCreatingConnection: false }));
    }
  };

  const handleRenameConnection = async () => {
    if (!selectedConnectionObject) return;
    const name = state.renameConnectionForm.name.trim();
    if (!name || name === selectedConnectionObject.name.trim()) {
      setState((prev) => ({
        ...prev,
        renameConnectionError: buildSourceImportFailure('rename-connection-validation'),
      }));
      return;
    }

    setState((prev) => ({
      ...prev,
      isRenamingConnection: true,
      renameConnectionError: null,
      loadError: null,
    }));
    try {
      const connection = await warehouseSourceImport.renameWarehouseConnection(
        selectedConnectionObject.id,
        { name }
      );
      await onConnectionRenamed?.(connection);
      setState((prev) => ({
        ...prev,
        connections: upsertWarehouseConnection(prev.connections, connection),
        renameConnectionFormOpen: false,
        renameConnectionForm: { name: '' },
        renameConnectionError: null,
        renameConnectionSucceeded: true,
      }));
      toast.success(copy.connection.renameSuccess);
    } catch (error) {
      const failure = buildSourceImportFailure(
        extractHttpErrorReason(error) === 'warehouse_connection_duplicate'
          ? 'connection-name-conflict'
          : 'rename-connection',
        error
      );
      setState((prev) => ({
        ...prev,
        renameConnectionError: failure,
        renameConnectionSucceeded: false,
      }));
      toast.error(resolveSourceImportFailureMessage(copy, failure));
    } finally {
      setState((prev) => ({ ...prev, isRenamingConnection: false }));
    }
  };

  const handleImport = async () => {
    if (!state.selectedConnection) {
      setState((prev) => ({
        ...prev,
        loadError: buildSourceImportFailure('select-connection'),
      }));
      return;
    }
    setState((prev) => ({ ...prev, isProcessing: true, loadError: null }));
    try {
      const commandDraft = {
        canvasId,
        connectionId: state.selectedConnection,
        objects: selectedSourceObjects.map((sourceObject) => ({
          objectId: sourceObject.objectId,
        })),
        groupingStrategy: state.groupingStrategy,
        includeColumns: state.includeColumns,
        addTests: state.addTests,
        addFreshness: state.addFreshness,
        ...(dbtSourceTargetMatch == null
          ? {}
          : { existingDbtSourceTargets: [...dbtSourceTargetMatch.targets] }),
      };
      const commandIdentity = resolveSourceImportCommandIdentity(
        commandDraft,
        pendingImportIdentity.current
      );
      pendingImportIdentity.current = commandIdentity;
      const result = await warehouseSourceImport.importSources(
        buildSourceImportCommand(commandDraft, commandIdentity)
      );
      pendingImportIdentity.current = null;
      setState((prev) => ({
        ...prev,
        importResult: result,
        currentStep: 'result',
      }));
      onComplete?.(result);
      toast.success(copy.importSuccess);
    } catch (error) {
      const failure = buildSourceImportFailure('import-sources', error);
      setState((prev) => ({ ...prev, loadError: failure }));
      toast.error(resolveSourceImportFailureMessage(copy, failure));
    } finally {
      setState((prev) => ({ ...prev, isProcessing: false }));
    }
  };

  const handleComplete = () => {
    onClose();
    setState(initialWizardState);
  };

  const toggleSourceObject = (index: number) => {
    if (dbtSourceBinding != null) return;
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
    if (dbtSourceBinding != null) return;
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
    if (dbtSourceBinding != null) return;
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
  const canImport =
    state.selectedConnection != null &&
    selectedCount > 0 &&
    dbtSourceBindingReady &&
    !state.isProcessing;

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
    openRenameConnectionForm,
    cancelRenameConnectionForm,
    setRenameConnectionName,
    setGroupingStrategy,
    setIncludeColumns,
    setAddTests,
    setAddFreshness,
    setSourceImportOption,
    setSourceObjectSearchQuery,
    handleNext,
    handleBack,
    handleCreateConnection,
    handleRenameConnection,
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
