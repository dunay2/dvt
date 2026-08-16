/** Owned concern: load warehouse source import choices through the source import port. */
import { useEffect, type Dispatch, type SetStateAction } from 'react';

import { isRelationalSourceObject, type DbtProjectSourceTableDeclaration } from '@dvt/contracts';

import type { IWarehouseSourceImportPort, SourceObject } from '../../ports/workspace';
import { buildSourceObjectIdentityKey } from './sourceImportCatalogModel';
import { matchRequestedDbtSourceTargets } from './sourceImportWizardModel';
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
  requestedDbtSourceDeclarations?: readonly DbtProjectSourceTableDeclaration[];
}

const emptyInitiallySelectedSourceObjects: readonly SourceObject[] = [];

export function useSourceObjectsLoader({
  open,
  selectedConnection,
  initiallySelectedSourceObjects = emptyInitiallySelectedSourceObjects,
  requestedDbtSourceDeclarations,
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
          const requestedMatch =
            requestedDbtSourceDeclarations === undefined
              ? null
              : matchRequestedDbtSourceTargets(
                  requestedDbtSourceDeclarations,
                  discoveredSourceObjects
                );
          const selectedObjectKeys = new Set(
            requestedMatch?.objectIds ??
              initiallySelectedSourceObjects.map(buildSourceObjectIdentityKey)
          );
          const selectableSourceObjects = discoveredSourceObjects.map((sourceObject) => ({
            ...sourceObject,
            selected:
              isRelationalSourceObject(sourceObject) &&
              (requestedMatch == null
                ? selectedObjectKeys.has(buildSourceObjectIdentityKey(sourceObject))
                : selectedObjectKeys.has(sourceObject.objectId)),
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
            loadError:
              requestedMatch != null && requestedMatch.unmatchedSourceUniqueIds.length > 0
                ? buildSourceImportFailure('match-dbt-source-tables')
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
  }, [
    initiallySelectedSourceObjects,
    open,
    requestedDbtSourceDeclarations,
    selectedConnection,
    setState,
    warehouseSourceImport,
  ]);
}
