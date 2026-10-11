/**
 * Owned concern: compose accessible catalogue inspection and selection in the source workspace.
 * @baseline GH-3610: catalogue/detail resizing retains the import controller and permissions.
 * @decision Supply the same unique panel identity to the DOM and keyboard separator.
 * @consequence Assistive technology can address the mounted catalogue panel.
 * @version 1.0.0
 */
import { Database, Loader2 } from 'lucide-react';
import { useId, useMemo, useState } from 'react';

import type { SourceObjectCatalogSchemaSummary } from '@dvt/contracts';

import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '../ui/resizable';
import { useSourceImportLocalization } from './copy';
import { SourceImportCatalogView } from './SourceImportCatalogView';
import { SourceImportObjectsMetadata } from './SourceImportObjectsMetadata';
import { SourceImportSelectionBasket } from './SourceImportSelectionBasket';
import { SourceImportSample } from './SourceImportSample';
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
  connectionId?: string;
  connectionName?: string;
  onChangeConnection?: () => void;
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

import styles from './SourceImportWorkspace.module.css';
export const sourceImportSelectionStepClassNames = styles;

export function SelectionStep({
  connectionId,
  connectionName,
  onChangeConnection,
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
  const cataloguePanelId = useId();
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
  const loadMoreLabel = copy.selection.loadMore;

  return (
    <div className={sourceImportSelectionStepClassNames.root}>
      <div className={styles.catalogToolbar}>
        <h3 className={sourceImportSelectionStepClassNames.title}>{copy.selection.title}</h3>
        {connectionName == null ? null : (
          <Button variant="outline" onClick={onChangeConnection}>
            <Database aria-hidden="true" />
            {connectionName}
          </Button>
        )}
        <span className={styles.description}>
          {copy.footer.selectionCount.replace('{count}', String(selectedCount))}
        </span>
      </div>

      {loadError ? (
        <Card className={sourceImportSelectionStepClassNames.error}>{loadError}</Card>
      ) : null}

      {isLoadingSourceObjects ? (
        <Card className={sourceImportSelectionStepClassNames.loading}>
          <Loader2 className={styles.spinner} aria-hidden="true" />
          {copy.selection.loading}
        </Card>
      ) : (
        <ResizablePanelGroup direction="horizontal" autoSaveId="source-import-catalog-detail">
          <ResizablePanel
            id={cataloguePanelId}
            defaultSize={55}
            minSize={30}
            className={sourceImportSelectionStepClassNames.catalog}
          >
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
            <ScrollArea data-source-import-catalog-scroll className={styles.catalogScroll}>
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
          </ResizablePanel>
          <ResizableHandle className={styles.resize} aria-label={copy.catalogDetailResize} />
          <ResizablePanel
            defaultSize={45}
            minSize={30}
            className={sourceImportSelectionStepClassNames.detail}
          >
            <SourceImportObjectsMetadata
              sourceObjects={activeBrowseSourceObject ? [activeBrowseSourceObject] : []}
              activeSourceObjectKey={catalogViewModel.activeSourceObject?.identityKey ?? null}
              scope="active"
            />
            {connectionId == null || activeBrowseSourceObject == null ? null : (
              <SourceImportSample
                connectionId={connectionId}
                objectId={activeBrowseSourceObject.objectId}
                name={
                  catalogViewModel.activeSourceObject?.canonicalName ??
                  activeBrowseSourceObject.objectId
                }
              />
            )}
            <SourceImportSelectionBasket
              selectedSourceObjects={catalogViewModel.selectedSourceObjects}
              onRemoveSourceObject={onToggleSourceObject}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      )}
    </div>
  );
}
