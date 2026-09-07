/** Owned concern: load warehouse source import choices through the source import port. */
import { useCallback, useEffect, type Dispatch, type SetStateAction } from 'react';

import {
  isRelationalSourceObject,
  SOURCE_OBJECT_CATALOG_DEFAULT_PAGE_SIZE,
  type DbtProjectSourceTableDeclaration,
  type SourceObjectCatalogSchemaSummary,
} from '@dvt/contracts';

import type { IWarehouseSourceImportPort, SourceObject } from '../../ports/workspace';
import {
  buildSourceImportSchemaKey,
  buildSourceObjectIdentityKey,
} from './sourceImportCatalogModel';
import { matchRequestedDbtSourceTargets } from './sourceImportWizardModel';
import {
  buildSourceImportFailure,
  type SelectableSourceObject,
  type SourceImportSchemaIdentity,
  type SourceImportWizardState,
} from './types';

interface LoaderParams {
  open: boolean;
  warehouseSourceImport: IWarehouseSourceImportPort;
  setState: Dispatch<SetStateAction<SourceImportWizardState>>;
}

const unloadedPage = { loaded: false, loading: false, nextCursor: null } as const;

export function useConnectionsLoader({ open, warehouseSourceImport, setState }: LoaderParams) {
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const loadConnections = async () => {
      setState((prev) => ({ ...prev, isLoadingConnections: true, loadError: null }));
      try {
        const connections = await warehouseSourceImport.listWarehouseConnections();
        if (!cancelled) setState((prev) => ({ ...prev, connections }));
      } catch (error) {
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            loadError: buildSourceImportFailure('load-connections', error),
          }));
        }
      } finally {
        if (!cancelled) setState((prev) => ({ ...prev, isLoadingConnections: false }));
      }
    };
    void loadConnections();
    return () => {
      cancelled = true;
    };
  }, [open, setState, warehouseSourceImport]);
}

function mergeSchemaSummaries(
  current: readonly SourceObjectCatalogSchemaSummary[],
  incoming: readonly SourceObjectCatalogSchemaSummary[]
): SourceObjectCatalogSchemaSummary[] {
  const byKey = new Map(
    current.map((summary) => [
      buildSourceImportSchemaKey({ database: summary.catalog, schema: summary.schema }),
      summary,
    ])
  );
  incoming.forEach((summary) =>
    byKey.set(
      buildSourceImportSchemaKey({ database: summary.catalog, schema: summary.schema }),
      summary
    )
  );
  return [...byKey.values()].sort(
    (left, right) =>
      left.catalog.localeCompare(right.catalog) || left.schema.localeCompare(right.schema)
  );
}

export function mergeSourceImportCatalogObjects(
  current: readonly SelectableSourceObject[],
  incoming: readonly SourceObject[],
  selectedObjectIds: ReadonlySet<string> = new Set()
): SelectableSourceObject[] {
  const byId = new Map(current.map((sourceObject) => [sourceObject.objectId, sourceObject]));
  incoming.forEach((sourceObject) => {
    const existing = byId.get(sourceObject.objectId);
    byId.set(sourceObject.objectId, {
      ...sourceObject,
      selected:
        existing?.selected ??
        (isRelationalSourceObject(sourceObject) && selectedObjectIds.has(sourceObject.objectId)),
    });
  });
  return [...byId.values()];
}

interface SourceCatalogLoaderParams extends LoaderParams {
  selectedConnection: string | null;
  sourceObjectSearchQuery: string;
  initiallySelectedSourceObjects?: readonly SourceObject[];
  requestedDbtSourceDeclarations?: readonly DbtProjectSourceTableDeclaration[];
}

const emptyInitiallySelectedSourceObjects: readonly SourceObject[] = [];

export function useSourceCatalogLoader({
  open,
  selectedConnection,
  sourceObjectSearchQuery,
  initiallySelectedSourceObjects = emptyInitiallySelectedSourceObjects,
  requestedDbtSourceDeclarations,
  warehouseSourceImport,
  setState,
}: SourceCatalogLoaderParams) {
  useEffect(() => {
    if (!open || !selectedConnection) return;
    let cancelled = false;
    const loadCatalog = async () => {
      setState((prev) => ({
        ...prev,
        isLoadingSourceObjects: true,
        loadError: null,
        sourceObjectSchemas: [],
        sourceObjectSchemaListPage: { ...unloadedPage, loading: true },
        sourceObjectSchemaPages: {},
        sourceObjectSearchPage: { query: '', loading: false, nextCursor: null },
        sourceObjectSearchObjectIds: [],
        sourceObjects: initiallySelectedSourceObjects.map((sourceObject) => ({
          ...sourceObject,
          selected: isRelationalSourceObject(sourceObject),
        })),
      }));
      try {
        const summaryPage = await warehouseSourceImport.listSourceObjectCatalog(
          selectedConnection,
          {
            kind: 'schema-list',
            limit: SOURCE_OBJECT_CATALOG_DEFAULT_PAGE_SIZE,
          }
        );
        if (summaryPage.kind !== 'schema-list') throw new Error('Expected a source schema list.');

        let requestedObjects: SourceObject[] = [];
        if (requestedDbtSourceDeclarations?.length) {
          const names = [
            ...new Set(requestedDbtSourceDeclarations.map((declaration) => declaration.tableName)),
          ];
          const pages: SourceObject[][] = [];
          for (const name of names) {
            const objects: SourceObject[] = [];
            let cursor: string | undefined;
            do {
              const page = await warehouseSourceImport.listSourceObjectCatalog(selectedConnection, {
                kind: 'name-search',
                name,
                limit: SOURCE_OBJECT_CATALOG_DEFAULT_PAGE_SIZE,
                ...(cursor ? { cursor } : {}),
              });
              if (page.kind !== 'object-page') throw new Error('Expected a source object page.');
              objects.push(...page.objects);
              cursor = page.nextCursor;
            } while (cursor);
            pages.push(objects);
          }
          requestedObjects = pages.flat();
        }

        if (!cancelled) {
          setState((prev) => {
            let sourceObjects = mergeSourceImportCatalogObjects(
              prev.sourceObjects,
              requestedObjects
            );
            const requestedMatch =
              requestedDbtSourceDeclarations === undefined
                ? null
                : matchRequestedDbtSourceTargets(requestedDbtSourceDeclarations, sourceObjects);
            const selectedIds = new Set(
              requestedMatch?.objectIds ??
                initiallySelectedSourceObjects.map(buildSourceObjectIdentityKey)
            );
            sourceObjects = sourceObjects.map((sourceObject) => ({
              ...sourceObject,
              selected:
                isRelationalSourceObject(sourceObject) && selectedIds.has(sourceObject.objectId),
            }));
            const active =
              sourceObjects.find((sourceObject) => sourceObject.selected) ?? sourceObjects[0];
            return {
              ...prev,
              sourceObjectSchemas: summaryPage.schemas,
              sourceObjectSchemaListPage: {
                loaded: true,
                loading: false,
                nextCursor: summaryPage.nextCursor ?? null,
              },
              sourceObjects,
              activeSourceObjectKey: active?.objectId ?? null,
              loadError: requestedMatch?.unmatchedSourceUniqueIds.length
                ? buildSourceImportFailure('match-dbt-source-tables')
                : null,
            };
          });
        }
      } catch (error) {
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            loadError: buildSourceImportFailure('load-source-objects', error),
            sourceObjects: [],
            sourceObjectSchemas: [],
            sourceObjectSchemaListPage: { ...unloadedPage, loaded: true },
            activeSourceObjectKey: null,
          }));
        }
      } finally {
        if (!cancelled) setState((prev) => ({ ...prev, isLoadingSourceObjects: false }));
      }
    };
    void loadCatalog();
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

  const loadSchemaPage = useCallback(
    async (schema: SourceImportSchemaIdentity, cursor?: string) => {
      if (!selectedConnection) return;
      const key = buildSourceImportSchemaKey(schema);
      setState((prev) =>
        prev.selectedConnection !== selectedConnection
          ? prev
          : {
              ...prev,
              loadError: null,
              sourceObjectSchemaPages: {
                ...prev.sourceObjectSchemaPages,
                [key]: {
                  ...(prev.sourceObjectSchemaPages[key] ?? unloadedPage),
                  loading: true,
                },
              },
            }
      );
      try {
        const page = await warehouseSourceImport.listSourceObjectCatalog(selectedConnection, {
          kind: 'schema-page',
          catalog: schema.database,
          schema: schema.schema,
          limit: SOURCE_OBJECT_CATALOG_DEFAULT_PAGE_SIZE,
          ...(cursor ? { cursor } : {}),
        });
        if (page.kind !== 'object-page') throw new Error('Expected a source object page.');
        setState((prev) =>
          prev.selectedConnection !== selectedConnection
            ? prev
            : {
                ...prev,
                sourceObjects: mergeSourceImportCatalogObjects(prev.sourceObjects, page.objects),
                sourceObjectSchemaPages: {
                  ...prev.sourceObjectSchemaPages,
                  [key]: { loaded: true, loading: false, nextCursor: page.nextCursor ?? null },
                },
              }
        );
      } catch (error) {
        setState((prev) =>
          prev.selectedConnection !== selectedConnection
            ? prev
            : {
                ...prev,
                loadError: buildSourceImportFailure('load-source-objects', error),
                sourceObjectSchemaPages: {
                  ...prev.sourceObjectSchemaPages,
                  [key]: {
                    ...(prev.sourceObjectSchemaPages[key] ?? unloadedPage),
                    loading: false,
                  },
                },
              }
        );
      }
    },
    [selectedConnection, setState, warehouseSourceImport]
  );

  const loadMoreSchemas = useCallback(
    async (cursor: string) => {
      if (!selectedConnection) return;
      setState((prev) =>
        prev.selectedConnection !== selectedConnection
          ? prev
          : {
              ...prev,
              sourceObjectSchemaListPage: {
                ...prev.sourceObjectSchemaListPage,
                loading: true,
              },
            }
      );
      try {
        const page = await warehouseSourceImport.listSourceObjectCatalog(selectedConnection, {
          kind: 'schema-list',
          limit: SOURCE_OBJECT_CATALOG_DEFAULT_PAGE_SIZE,
          cursor,
        });
        if (page.kind !== 'schema-list') throw new Error('Expected a source schema list.');
        setState((prev) =>
          prev.selectedConnection !== selectedConnection
            ? prev
            : {
                ...prev,
                sourceObjectSchemas: mergeSchemaSummaries(prev.sourceObjectSchemas, page.schemas),
                sourceObjectSchemaListPage: {
                  loaded: true,
                  loading: false,
                  nextCursor: page.nextCursor ?? null,
                },
              }
        );
      } catch (error) {
        setState((prev) =>
          prev.selectedConnection !== selectedConnection
            ? prev
            : {
                ...prev,
                loadError: buildSourceImportFailure('load-source-objects', error),
                sourceObjectSchemaListPage: {
                  ...prev.sourceObjectSchemaListPage,
                  loading: false,
                },
              }
        );
      }
    },
    [selectedConnection, setState, warehouseSourceImport]
  );

  const loadSearchPage = useCallback(
    async (query: string, cursor?: string) => {
      if (!selectedConnection) return;
      setState((prev) =>
        prev.selectedConnection !== selectedConnection ||
        prev.sourceObjectSearchQuery.trim() !== query
          ? prev
          : {
              ...prev,
              loadError: null,
              sourceObjectSearchPage: { query, loading: true, nextCursor: cursor ?? null },
            }
      );
      try {
        const page = await warehouseSourceImport.listSourceObjectCatalog(selectedConnection, {
          kind: 'name-search',
          name: query,
          limit: SOURCE_OBJECT_CATALOG_DEFAULT_PAGE_SIZE,
          ...(cursor ? { cursor } : {}),
        });
        if (page.kind !== 'object-page') throw new Error('Expected a source object page.');
        setState((prev) =>
          prev.selectedConnection !== selectedConnection ||
          prev.sourceObjectSearchQuery.trim() !== query
            ? prev
            : {
                ...prev,
                sourceObjects: mergeSourceImportCatalogObjects(prev.sourceObjects, page.objects),
                sourceObjectSearchObjectIds: cursor
                  ? [
                      ...new Set([
                        ...prev.sourceObjectSearchObjectIds,
                        ...page.objects.map((sourceObject) => sourceObject.objectId),
                      ]),
                    ]
                  : page.objects.map((sourceObject) => sourceObject.objectId),
                sourceObjectSearchPage: {
                  query,
                  loading: false,
                  nextCursor: page.nextCursor ?? null,
                },
              }
        );
      } catch (error) {
        setState((prev) =>
          prev.selectedConnection !== selectedConnection ||
          prev.sourceObjectSearchQuery.trim() !== query
            ? prev
            : {
                ...prev,
                loadError: buildSourceImportFailure('load-source-objects', error),
                sourceObjectSearchPage: { query, loading: false, nextCursor: null },
              }
        );
      }
    },
    [selectedConnection, setState, warehouseSourceImport]
  );

  useEffect(() => {
    const query = sourceObjectSearchQuery.trim();
    if (!open || !selectedConnection || query.length === 0) {
      setState((prev) =>
        prev.sourceObjectSearchObjectIds.length === 0 && !prev.sourceObjectSearchPage.loading
          ? prev
          : {
              ...prev,
              sourceObjectSearchObjectIds: [],
              sourceObjectSearchPage: { query: '', loading: false, nextCursor: null },
            }
      );
      return;
    }
    const timer = window.setTimeout(() => {
      void loadSearchPage(query);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [loadSearchPage, open, selectedConnection, setState, sourceObjectSearchQuery]);

  return { loadSchemaPage, loadMoreSchemas, loadSearchPage };
}
