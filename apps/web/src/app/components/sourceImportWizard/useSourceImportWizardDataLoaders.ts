import { useEffect, type Dispatch, type SetStateAction } from 'react';

import type { IWorkspacePort } from '../../ports/workspace';
import { sourceImportWizardCopy as copy } from './copy';
import type { SourceImportWizardState } from './types';

interface LoaderParams {
  open: boolean;
  workspaceService: IWorkspacePort;
  setState: Dispatch<SetStateAction<SourceImportWizardState>>;
}

export function useConnectionsLoader({ open, workspaceService, setState }: LoaderParams) {
  useEffect(() => {
    if (!open) {
      return;
    }
    let cancelled = false;
    const loadConnections = async () => {
      setState((prev) => ({
        ...prev,
        isLoadingConnections: true,
        loadError: null,
      }));
      try {
        const connections = await workspaceService.listWarehouseConnections();
        if (!cancelled) {
          setState((prev) => ({ ...prev, connections }));
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : copy.loadConnectionsError;
        if (!cancelled) {
          setState((prev) => ({ ...prev, loadError: message }));
        }
      } finally {
        if (!cancelled) {
          setState((prev) => ({ ...prev, isLoadingConnections: false }));
        }
      }
    };
    void loadConnections();
    return () => {
      cancelled = true;
    };
  }, [open, setState, workspaceService]);
}

interface TablesLoaderParams extends LoaderParams {
  selectedConnection: string | null;
}

export function useTablesLoader({
  open,
  selectedConnection,
  workspaceService,
  setState,
}: TablesLoaderParams) {
  useEffect(() => {
    if (!open || !selectedConnection) {
      return;
    }
    let cancelled = false;
    const loadTables = async () => {
      setState((prev) => ({ ...prev, isLoadingTables: true, loadError: null }));
      try {
        const tables = await workspaceService.listWarehouseTables(selectedConnection);
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            tables: tables.map((table) => ({ ...table, selected: false })),
          }));
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : copy.loadTablesError;
        if (!cancelled) {
          setState((prev) => ({ ...prev, loadError: message, tables: [] }));
        }
      } finally {
        if (!cancelled) {
          setState((prev) => ({ ...prev, isLoadingTables: false }));
        }
      }
    };
    void loadTables();
    return () => {
      cancelled = true;
    };
  }, [open, selectedConnection, setState, workspaceService]);
}
