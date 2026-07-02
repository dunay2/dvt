import { Loader2 } from 'lucide-react';

import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { sourceImportWizardCopy as copy } from './copy';
import { SourceImportActiveTableMetadata } from './SourceImportActiveTableMetadata';
import { SourceImportCatalogView } from './SourceImportCatalogView';
import { SourceImportSelectionBasket } from './SourceImportSelectionBasket';
import {
  buildWarehouseTableKey,
  buildSourceImportCatalogViewModel,
} from './sourceImportWizardModel';
import type { TableInfo } from './types';

interface SelectionStepProps {
  tables: TableInfo[];
  selectedCount: number;
  activeTableKey: string | null;
  tableSearchQuery: string;
  isLoadingTables: boolean;
  loadError: string | null;
  onTableSearchQueryChange: (query: string) => void;
  onActivateTable: (index: number) => void;
  onToggleSchema: (schema: string) => void;
  onToggleTable: (index: number) => void;
}

export function SelectionStep({
  tables,
  selectedCount,
  activeTableKey,
  tableSearchQuery,
  isLoadingTables,
  loadError,
  onTableSearchQueryChange,
  onActivateTable,
  onToggleSchema,
  onToggleTable,
}: SelectionStepProps) {
  const catalogViewModel = buildSourceImportCatalogViewModel({
    tables,
    activeTableKey,
    searchQuery: tableSearchQuery,
  });
  const activeBrowseTable =
    tables.find(
      (table) => buildWarehouseTableKey(table) === catalogViewModel.activeTable?.canonicalName
    ) ?? null;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-2 text-lg font-medium">{copy.selection.title}</h3>
        <p className="mb-4 text-sm text-slate-300">
          {copy.selection.descriptionPrefix} {selectedCount}
        </p>
        <div className="rounded border border-amber-800/70 bg-amber-950/20 px-3 py-2 text-xs text-amber-100/80">
          Destination is configured on a DVT Sink node after origin registration; choose the output
          target template from Insert and verify schema/table in the inspector.
        </div>
      </div>

      {loadError ? (
        <Card className="border-red-700 bg-red-950/30 p-3 text-sm text-red-200">{loadError}</Card>
      ) : null}

      {isLoadingTables ? (
        <Card className="flex items-center gap-3 border-slate-600 p-4 text-slate-300">
          <Loader2 className="size-4 animate-spin" />
          {copy.selection.loading}
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <div className="space-y-3">
            <div className="grid gap-2">
              <label className="text-xs font-medium uppercase tracking-wide text-slate-400">
                {copy.selection.searchLabel}
              </label>
              <Input
                data-slot="source-import-table-search"
                value={tableSearchQuery}
                placeholder={copy.selection.searchPlaceholder}
                onChange={(event) => onTableSearchQueryChange(event.target.value)}
              />
              <div className="text-xs text-slate-400">{catalogViewModel.resultCountLabel}</div>
            </div>
            <ScrollArea className="h-96">
              <SourceImportCatalogView
                catalog={catalogViewModel}
                emptyLabel={copy.selection.empty}
                onActivateTable={onActivateTable}
                onToggleSchema={onToggleSchema}
                onToggleTable={onToggleTable}
              />
            </ScrollArea>
          </div>
          <div className="space-y-4">
            <SourceImportActiveTableMetadata activeTable={activeBrowseTable} />
            <SourceImportSelectionBasket selectedTables={catalogViewModel.selectedTables} />
          </div>
        </div>
      )}
    </div>
  );
}
