import { Loader2 } from 'lucide-react';
import { useState } from 'react';

import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { useSourceImportLocalization } from './copy';
import { SourceImportObjectsMetadata } from './SourceImportObjectsMetadata';
import { SourceImportCatalogView } from './SourceImportCatalogView';
import { SourceImportSelectionBasket } from './SourceImportSelectionBasket';
import {
  buildSourceObjectIdentityKey,
  buildSourceImportCatalogViewModel,
  type SourceImportCatalogFilterId,
} from './sourceImportCatalogModel';
import type {
  SelectableSourceObject,
  SourceImportDatabaseIdentity,
  SourceImportSchemaIdentity,
} from './types';

interface SelectionStepProps {
  sourceObjects: SelectableSourceObject[];
  selectedCount: number;
  activeSourceObjectKey: string | null;
  sourceObjectSearchQuery: string;
  isLoadingSourceObjects: boolean;
  loadError: string | null;
  onSourceObjectSearchQueryChange: (query: string) => void;
  onActivateSourceObject: (index: number) => void;
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
} as const;

export function SelectionStep({
  sourceObjects,
  selectedCount,
  activeSourceObjectKey,
  sourceObjectSearchQuery,
  isLoadingSourceObjects,
  loadError,
  onSourceObjectSearchQueryChange,
  onActivateSourceObject,
  onToggleDatabase,
  onToggleSchema,
  onToggleSourceObject,
}: SelectionStepProps) {
  const { copy, numberFormatter } = useSourceImportLocalization();
  const [catalogFilterId, setCatalogFilterId] = useState<SourceImportCatalogFilterId>('all');
  const catalogViewModel = buildSourceImportCatalogViewModel({
    sourceObjects,
    activeSourceObjectKey,
    searchQuery: sourceObjectSearchQuery,
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
                {catalogViewModel.resultCountLabel}
              </div>
            </div>
            <ScrollArea
              data-source-import-catalog-scroll
              className="h-96 min-w-0 [&_[data-slot=scroll-area-viewport]>div]:!block"
            >
              <SourceImportCatalogView
                catalog={catalogViewModel}
                emptyLabel={copy.selection.empty}
                onActivateSourceObject={onActivateSourceObject}
                onSelectFilter={setCatalogFilterId}
                onToggleDatabase={onToggleDatabase}
                onToggleSchema={onToggleSchema}
                onToggleSourceObject={onToggleSourceObject}
                revealMatchingSchemas={
                  sourceObjectSearchQuery.trim().length > 0 || catalogFilterId !== 'all'
                }
              />
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
