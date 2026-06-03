/** Owned concern: load warehouse source import choices through the source import port. */
import { useEffect, type Dispatch, type SetStateAction } from 'react';

import type { IWarehouseSourceImportPort } from '../../ports/workspace';
import { sourceImportWizardCopy as copy } from './copy';
import type { SourceImportWizardState } from './types';

interface LoaderParams {
  open: boolean;
  warehouseSourceImport: IWarehouseSourceImportPort;
  setState: Dispatch<SetStateAction<SourceImportWizardState>>;
}

export function useConnectionsLoader({ open, warehouseSourceImport, setState }: LoaderParams) {
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
        const connections = await warehouseSourceImport.listWarehouseConnections();
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
  }, [open, setState, warehouseSourceImport]);
}

interface TablesLoaderParams extends LoaderParams {
  selectedConnection: string | null;
}

export function useTablesLoader({
  open,
  selectedConnection,
  warehouseSourceImport,
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
        const tables = await warehouseSourceImport.listWarehouseTables(selectedConnection);
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
  }, [open, selectedConnection, setState, warehouseSourceImport]);
}
