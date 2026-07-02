/** Owned concern: coordinate source import wizard state through the import port. */
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import type {
  ImportSourcesResult,
  IWarehouseSourceImportPort,
  WarehouseConnection,
} from '../../ports/workspace';
import type { SourceImportOptionContribution, SourceImportOptionId } from '../../plugins/registry';
import { sourceImportWizardCopy as copy } from './copy';
import {
  applySourceImportOptionDefaults,
  buildWarehouseTableKey,
  buildSourceImportOptionValues,
  canEnterSourceImportSection,
  canProceedForStep,
  getNextStep,
  getPreviousStep,
  getSelectedCount,
  getSelectedTables,
  resolveActiveTable,
  resolveSectionForStep,
  resolveStepForSection,
} from './sourceImportWizardModel';
import { useConnectionsLoader, useTablesLoader } from './useSourceImportWizardDataLoaders';
import type {
  SourceImportInitialSelection,
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
  tables: [],
  groupingStrategy: 'schema',
  includeColumns: false,
  addTests: false,
  addFreshness: false,
  isProcessing: false,
  isLoadingConnections: false,
  isLoadingTables: false,
  loadError: null,
  importResult: null,
  activeTableKey: null,
  tableSearchQuery: '',
};

function hasImportedCanvasNodes(result: ImportSourcesResult): boolean {
  return (result.importedNodeIds?.length ?? 0) > 0;
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
      tables: [],
      activeTableKey: null,
      tableSearchQuery: '',
      loadError: null,
      importResult: null,
    }));
  }, [initialSelection, open]);
  const selectedCount = useMemo(() => getSelectedCount(state.tables), [state.tables]);
  const selectedTables = useMemo(() => getSelectedTables(state.tables), [state.tables]);
  const activeTable = useMemo(
    () => resolveActiveTable(state.tables, state.activeTableKey),
    [state.activeTableKey, state.tables]
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
  const initiallySelectedTablesForConnection =
    state.selectedConnection === initialSelection?.connectionId
      ? initialSelection.tables
      : undefined;

  useConnectionsLoader({ open, warehouseSourceImport, setState });
  useTablesLoader({
    open,
    selectedConnection: state.selectedConnection,
    initiallySelectedTables: initiallySelectedTablesForConnection,
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
        activeTable != null
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
      tables: selectedConnection === prev.selectedConnection ? prev.tables : [],
      activeTableKey: selectedConnection === prev.selectedConnection ? prev.activeTableKey : null,
      tableSearchQuery: selectedConnection === prev.selectedConnection ? prev.tableSearchQuery : '',
      importResult: null,
    }));
  const setGroupingStrategy = (groupingStrategy: 'schema' | 'database' | 'custom') =>
    setState((prev) => ({ ...prev, groupingStrategy }));
  const setIncludeColumns = (includeColumns: boolean) =>
    setState((prev) => ({ ...prev, includeColumns }));
  const setAddTests = (addTests: boolean) => setState((prev) => ({ ...prev, addTests }));
  const setAddFreshness = (addFreshness: boolean) =>
    setState((prev) => ({ ...prev, addFreshness }));
  const setSourceImportOption = (optionId: SourceImportOptionId, value: boolean) =>
    setState((prev) => ({ ...prev, [optionId]: value }));
  const setTableSearchQuery = (tableSearchQuery: string) =>
    setState((prev) => ({ ...prev, tableSearchQuery }));

  const handleNext = () => {
    if (state.currentStep === 'connection' && !state.selectedConnection) {
      toast.error(copy.selectConnectionError);
      return;
    }
    if (state.currentStep === 'selection' && selectedCount === 0) {
      toast.error(copy.selectAtLeastOneTableError);
      return;
    }
    setCurrentStep(getNextStep(state.currentStep));
  };

  const handleBack = () => setCurrentStep(getPreviousStep(state.currentStep));

  const handleImport = async () => {
    if (!state.selectedConnection) {
      setState((prev) => ({ ...prev, loadError: copy.selectConnectionError }));
      return;
    }
    setState((prev) => ({ ...prev, isProcessing: true, loadError: null }));
    try {
      const result = await warehouseSourceImport.importSources({
        connectionId: state.selectedConnection,
        tables: state.tables
          .filter((table) => table.selected)
          .map((table) => ({
            database: table.database,
            schema: table.schema,
            table: table.table,
            rowCount: table.rowCount,
            columns: table.columns,
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

  const toggleTable = (index: number) => {
    setState((prev) => ({
      ...prev,
      tables: prev.tables.map((table, i) =>
        i === index ? { ...table, selected: !table.selected } : table
      ),
      activeTableKey: prev.tables[index] ? buildWarehouseTableKey(prev.tables[index]) : null,
    }));
  };

  const activateTable = (index: number) => {
    setState((prev) => ({
      ...prev,
      activeTableKey: prev.tables[index] ? buildWarehouseTableKey(prev.tables[index]) : null,
    }));
  };

  const toggleSchema = (schema: string) => {
    setState((prev) => {
      const schemaTables = prev.tables.filter((table) => table.schema === schema);
      const allSelected = schemaTables.every((table) => table.selected);
      const firstSchemaTable = schemaTables[0];
      return {
        ...prev,
        tables: prev.tables.map((table) =>
          table.schema === schema ? { ...table, selected: !allSelected } : table
        ),
        activeTableKey: firstSchemaTable ? buildWarehouseTableKey(firstSchemaTable) : null,
      };
    });
  };

  const canProceed = canProceedForStep(state.currentStep, state.selectedConnection, selectedCount);
  const canImport = state.selectedConnection != null && selectedCount > 0 && !state.isProcessing;

  return {
    state,
    selectedCount,
    selectedTables,
    activeTable,
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
        activeTable != null
      ),
    setCurrentSection,
    setSelectedConnection,
    setGroupingStrategy,
    setIncludeColumns,
    setAddTests,
    setAddFreshness,
    setSourceImportOption,
    setTableSearchQuery,
    handleNext,
    handleBack,
    handleImport,
    handleComplete,
    activateTable,
    toggleTable,
    toggleSchema,
  };
}

export type SourceImportWizardController = ReturnType<typeof useSourceImportWizard>;
