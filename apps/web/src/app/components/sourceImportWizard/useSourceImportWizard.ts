import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import type { ImportSourcesResult, WarehouseConnection } from '../../ports/workspace';
import type { IWorkspacePort } from '../../ports/workspace';
import { sourceImportWizardCopy as copy } from './copy';
import {
  canProceedForStep,
  getNextStep,
  getPreviousStep,
  getSelectedCount,
} from './sourceImportWizardModel';
import { useConnectionsLoader, useTablesLoader } from './useSourceImportWizardDataLoaders';
import type { DataObjectSourceType, SourceImportWizardState, TableInfo, WizardStep } from './types';

interface UseSourceImportWizardParams {
  open: boolean;
  workspaceService: IWorkspacePort;
  onComplete?: (result: ImportSourcesResult) => void;
  onClose: () => void;
}

const initialState: SourceImportWizardState = {
  currentStep: 'sourceType',
  selectedSourceType: 'database',
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
};

export function useSourceImportWizard({
  open,
  workspaceService,
  onComplete,
  onClose,
}: UseSourceImportWizardParams) {
  const [state, setState] = useState<SourceImportWizardState>(initialState);
  const selectedCount = useMemo(() => getSelectedCount(state.tables), [state.tables]);
  const selectedConnectionObject = useMemo<WarehouseConnection | undefined>(
    () => state.connections.find((connection) => connection.id === state.selectedConnection),
    [state.connections, state.selectedConnection]
  );

  useConnectionsLoader({ open, workspaceService, setState });
  useTablesLoader({
    open,
    selectedConnection: state.selectedConnection,
    workspaceService,
    setState,
  });

  const setCurrentStep = (currentStep: WizardStep) =>
    setState((prev) => ({ ...prev, currentStep }));
  const setSelectedSourceType = (selectedSourceType: DataObjectSourceType) =>
    setState((prev) => ({ ...prev, selectedSourceType }));
  const setSelectedConnection = (selectedConnection: string | null) =>
    setState((prev) => ({ ...prev, selectedConnection }));
  const setGroupingStrategy = (groupingStrategy: 'schema' | 'database' | 'custom') =>
    setState((prev) => ({ ...prev, groupingStrategy }));
  const setIncludeColumns = (includeColumns: boolean) =>
    setState((prev) => ({ ...prev, includeColumns }));
  const setAddTests = (addTests: boolean) => setState((prev) => ({ ...prev, addTests }));
  const setAddFreshness = (addFreshness: boolean) =>
    setState((prev) => ({ ...prev, addFreshness }));

  const handleNext = () => {
    if (state.currentStep === 'sourceType' && state.selectedSourceType !== 'database') {
      toast.error(copy.databaseOnlyError);
      return;
    }
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
      const result = await workspaceService.importSources({
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
      toast.success(copy.importSuccess);
    } catch (error) {
      const message = error instanceof Error ? error.message : copy.importError;
      setState((prev) => ({ ...prev, loadError: message }));
      toast.error(message);
    } finally {
      setState((prev) => ({ ...prev, isProcessing: false }));
    }
  };

  const handleComplete = () => {
    if (state.importResult) {
      onComplete?.(state.importResult);
    }
    onClose();
    setState(initialState);
  };

  const toggleTable = (index: number) => {
    setState((prev) => ({
      ...prev,
      tables: prev.tables.map((table, i) =>
        i === index ? { ...table, selected: !table.selected } : table
      ),
    }));
  };

  const toggleSchema = (schema: string) => {
    setState((prev) => {
      const schemaTables = prev.tables.filter((table) => table.schema === schema);
      const allSelected = schemaTables.every((table) => table.selected);
      return {
        ...prev,
        tables: prev.tables.map((table) =>
          table.schema === schema ? { ...table, selected: !allSelected } : table
        ),
      };
    });
  };

  const canProceed = canProceedForStep(state.currentStep, state.selectedConnection, selectedCount);

  return {
    state,
    selectedCount,
    selectedConnectionObject,
    canProceed,
    setSelectedSourceType,
    setSelectedConnection,
    setGroupingStrategy,
    setIncludeColumns,
    setAddTests,
    setAddFreshness,
    handleNext,
    handleBack,
    handleImport,
    handleComplete,
    toggleTable,
    toggleSchema,
  };
}

export type SourceImportWizardController = ReturnType<typeof useSourceImportWizard>;
