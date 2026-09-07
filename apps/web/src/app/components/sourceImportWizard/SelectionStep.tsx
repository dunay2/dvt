import { Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';

import type { SourceObjectCatalogSchemaSummary } from '@dvt/contracts';

import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { useSourceImportLocalization } from './copy';
import { SourceImportCatalogView } from './SourceImportCatalogView';
import { SourceImportObjectsMetadata } from './SourceImportObjectsMetadata';
import { SourceImportSelectionBasket } from './SourceImportSelectionBasket';
import {
  buildSourceImportCatalogViewModel,
  buildSourceObjectIdentityKey,
  type SourceImportCatalogFilterId,
} from './sourceImportCatalogModel';
import type {
  SelectableSourceObject,
  SourceImportCatalogPageState,
  SourceImportDatabaseIdentity,
  SourceImportSchemaIdentity,
  SourceImportSearchPageState,
} from './types';

interface SelectionStepProps {
  sourceObjects: SelectableSourceObject[];
  sourceObjectSchemas: readonly SourceObjectCatalogSchemaSummary[];
  sourceObjectSchemaListPage: SourceImportCatalogPageState;
  sourceObjectSchemaPages: Readonly<Record<string, SourceImportCatalogPageState>>;
  sourceObjectSearchPage: SourceImportSearchPageState;
  sourceObjectSearchObjectIds: readonly string[];
  selectedCount: number;
  activeSourceObjectKey: string | null;
  sourceObjectSearchQuery: string;
  isLoadingSourceObjects: boolean;
  loadError: string | null;
  onSourceObjectSearchQueryChange: (query: string) => void;
  onActivateSourceObject: (index: number) => void;
  onExpandSchema: (schema: SourceImportSchemaIdentity) => void;
  onLoadMoreSchema: (schema: SourceImportSchemaIdentity, cursor: string) => void;
  onLoadMoreSchemas: (cursor: string) => void;
  onLoadMoreSearchResults: (cursor: string) => void;
  onToggleDatabase: (database: SourceImportDatabaseIdentity) => void;
  onToggleSchema: (schema: SourceImportSchemaIdentity) => void;
  onToggleSourceObject: (index: number) => void;
}

export const sourceImportSelectionStepClassNames = {
  root: 'space-y-4',
  title: 'mb-2 text-lg font-medium',
  description: 'mb-4 text-sm text-slate-300',
  error: 'border-red-700 bg-red-950/30 p-3 text-sm text-red-200',
  loading: 'flex items-center gap-3 border-slate-600 p-4 text-slate-300',
  content: 'grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]',
  catalog: 'space-y-3',
  search: 'grid gap-2',
  searchLabel: 'text-xs font-medium uppercase tracking-wide text-slate-400',
  resultCount: 'text-xs text-slate-400',
  detail: 'space-y-4',
  loadMore:
    'rounded border border-slate-700 px-2.5 py-1 text-xs text-slate-300 disabled:opacity-50',
} as const;

export function SelectionStep({
  sourceObjects,
  sourceObjectSchemas,
  sourceObjectSchemaListPage,
  sourceObjectSchemaPages,
  sourceObjectSearchPage,
  sourceObjectSearchObjectIds,
  selectedCount,
  activeSourceObjectKey,
  sourceObjectSearchQuery,
  isLoadingSourceObjects,
  loadError,
  onSourceObjectSearchQueryChange,
  onActivateSourceObject,
  onExpandSchema,
  onLoadMoreSchema,
  onLoadMoreSchemas,
  onLoadMoreSearchResults,
  onToggleDatabase,
  onToggleSchema,
  onToggleSourceObject,
}: SelectionStepProps) {
  const { copy, numberFormatter } = useSourceImportLocalization();
  const [catalogFilterId, setCatalogFilterId] = useState<SourceImportCatalogFilterId>('all');
  const normalizedSearch = sourceObjectSearchQuery.trim();
  const visibleObjectIds = useMemo(
    () => (normalizedSearch.length > 0 ? new Set(sourceObjectSearchObjectIds) : undefined),
    [normalizedSearch.length, sourceObjectSearchObjectIds]
  );
  const catalogViewModel = buildSourceImportCatalogViewModel({
    sourceObjects,
    activeSourceObjectKey,
    searchQuery: normalizedSearch,
    schemaSummaries: normalizedSearch.length === 0 ? sourceObjectSchemas : [],
    schemaPageStates: sourceObjectSchemaPages,
    visibleObjectIds,
    filterId: catalogFilterId,
    copy: copy.catalog,
    numberFormatter,
  });
  const activeBrowseSourceObject =
    sourceObjects.find(
      (sourceObject) =>
        buildSourceObjectIdentityKey(sourceObject) ===
        catalogViewModel.activeSourceObject?.identityKey
    ) ?? null;
  const loadMoreLabel = copy.selection.loadMore ?? 'Load more';

  return (
    <div className={sourceImportSelectionStepClassNames.root}>
      <div>
        <h3 className={sourceImportSelectionStepClassNames.title}>{copy.selection.title}</h3>
        <p className={sourceImportSelectionStepClassNames.description}>
          {copy.selection.descriptionPrefix} {selectedCount}
        </p>
      </div>

      {loadError ? (
        <Card className={sourceImportSelectionStepClassNames.error}>{loadError}</Card>
      ) : null}

      {isLoadingSourceObjects ? (
        <Card className={sourceImportSelectionStepClassNames.loading}>
          <Loader2 className="size-4 animate-spin" />
          {copy.selection.loading}
        </Card>
      ) : (
        <div className={sourceImportSelectionStepClassNames.content}>
          <div className={sourceImportSelectionStepClassNames.catalog}>
            <div className={sourceImportSelectionStepClassNames.search}>
              <label
                htmlFor="source-import-object-search"
                className={sourceImportSelectionStepClassNames.searchLabel}
              >
                {copy.selection.searchLabel}
              </label>
              <Input
                id="source-import-object-search"
                data-slot="source-import-object-search"
                value={sourceObjectSearchQuery}
                placeholder={copy.selection.searchPlaceholder}
                onChange={(event) => onSourceObjectSearchQueryChange(event.target.value)}
              />
              <div className={sourceImportSelectionStepClassNames.resultCount}>
                {sourceObjectSearchPage.loading
                  ? copy.selection.loading
                  : catalogViewModel.resultCountLabel}
              </div>
            </div>
            <ScrollArea
              data-source-import-catalog-scroll
              className="h-96 min-w-0 [&_[data-slot=scroll-area-viewport]>div]:!block"
            >
              <SourceImportCatalogView
                catalog={catalogViewModel}
                emptyLabel={copy.selection.empty}
                loadMoreLabel={loadMoreLabel}
                loadingLabel={copy.selection.loading}
                onActivateSourceObject={onActivateSourceObject}
                onExpandSchema={onExpandSchema}
                onLoadMoreSchema={onLoadMoreSchema}
                onSelectFilter={setCatalogFilterId}
                onToggleDatabase={onToggleDatabase}
                onToggleSchema={onToggleSchema}
                onToggleSourceObject={onToggleSourceObject}
                revealMatchingSchemas={normalizedSearch.length > 0 || catalogFilterId !== 'all'}
              />
              {normalizedSearch.length === 0 && sourceObjectSchemaListPage.nextCursor ? (
                <button
                  type="button"
                  className={sourceImportSelectionStepClassNames.loadMore}
                  disabled={sourceObjectSchemaListPage.loading}
                  onClick={() => onLoadMoreSchemas(sourceObjectSchemaListPage.nextCursor!)}
                >
                  {loadMoreLabel}
                </button>
              ) : null}
              {normalizedSearch.length > 0 && sourceObjectSearchPage.nextCursor ? (
                <button
                  type="button"
                  className={sourceImportSelectionStepClassNames.loadMore}
                  disabled={sourceObjectSearchPage.loading}
                  onClick={() => onLoadMoreSearchResults(sourceObjectSearchPage.nextCursor!)}
                >
                  {loadMoreLabel}
                </button>
              ) : null}
            </ScrollArea>
          </div>
          <div className={sourceImportSelectionStepClassNames.detail}>
            <SourceImportObjectsMetadata
              sourceObjects={activeBrowseSourceObject ? [activeBrowseSourceObject] : []}
              activeSourceObjectKey={catalogViewModel.activeSourceObject?.identityKey ?? null}
              scope="active"
            />
            <SourceImportSelectionBasket
              selectedSourceObjects={catalogViewModel.selectedSourceObjects}
              onRemoveSourceObject={onToggleSourceObject}
            />
          </div>
        </div>
      )}
    </div>
  );
}
