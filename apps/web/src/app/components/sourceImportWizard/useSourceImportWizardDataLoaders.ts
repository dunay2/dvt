/** Owned concern: load warehouse source import choices through the source import port. */
import { useEffect, type Dispatch, type SetStateAction } from 'react';

import { isRelationalSourceObject } from '@dvt/contracts';

import type { IWarehouseSourceImportPort, SourceObject } from '../../ports/workspace';
import { buildSourceObjectIdentityKey } from './sourceImportCatalogModel';
import { buildSourceImportFailure, type SourceImportWizardState } from './types';

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
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            loadError: buildSourceImportFailure('load-connections', error),
          }));
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

interface SourceObjectsLoaderParams extends LoaderParams {
  selectedConnection: string | null;
  initiallySelectedSourceObjects?: readonly SourceObject[];
}

const emptyInitiallySelectedSourceObjects: readonly SourceObject[] = [];

export function useSourceObjectsLoader({
  open,
  selectedConnection,
  initiallySelectedSourceObjects = emptyInitiallySelectedSourceObjects,
  warehouseSourceImport,
  setState,
}: SourceObjectsLoaderParams) {
  useEffect(() => {
    if (!open || !selectedConnection) {
      return;
    }
    let cancelled = false;
    const loadSourceObjects = async () => {
      setState((prev) => ({ ...prev, isLoadingSourceObjects: true, loadError: null }));
      try {
        const discoveredSourceObjects =
          await warehouseSourceImport.listSourceObjects(selectedConnection);
        if (!cancelled) {
          const selectedObjectKeys = new Set(
            initiallySelectedSourceObjects.map(buildSourceObjectIdentityKey)
          );
          const selectableSourceObjects = discoveredSourceObjects.map((sourceObject) => ({
            ...sourceObject,
            selected:
              isRelationalSourceObject(sourceObject) &&
              selectedObjectKeys.has(buildSourceObjectIdentityKey(sourceObject)),
          }));
          const selectedSourceObject = selectableSourceObjects.find(
            (sourceObject) => sourceObject.selected
          );
          setState((prev) => ({
            ...prev,
            sourceObjects: selectableSourceObjects,
            activeSourceObjectKey: selectedSourceObject
              ? buildSourceObjectIdentityKey(selectedSourceObject)
              : selectableSourceObjects[0]
                ? buildSourceObjectIdentityKey(selectableSourceObjects[0])
                : null,
          }));
        }
      } catch (error) {
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            loadError: buildSourceImportFailure('load-source-objects', error),
            sourceObjects: [],
            activeSourceObjectKey: null,
          }));
        }
      } finally {
        if (!cancelled) {
          setState((prev) => ({ ...prev, isLoadingSourceObjects: false }));
        }
      }
    };
    void loadSourceObjects();
    return () => {
      cancelled = true;
    };
  }, [initiallySelectedSourceObjects, open, selectedConnection, setState, warehouseSourceImport]);
}
