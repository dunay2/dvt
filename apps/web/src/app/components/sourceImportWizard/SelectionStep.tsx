import { Loader2 } from 'lucide-react';

import { Card } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';
import { sourceImportWizardCopy as copy } from './copy';
import { SourceImportCatalogView } from './SourceImportCatalogView';
import { buildSourceImportCatalogViewModel } from './sourceImportWizardModel';
import type { TableInfo } from './types';

interface SelectionStepProps {
  tables: TableInfo[];
  selectedCount: number;
  isLoadingTables: boolean;
  loadError: string | null;
  onToggleSchema: (schema: string) => void;
  onToggleTable: (index: number) => void;
}

export function SelectionStep({
  tables,
  selectedCount,
  isLoadingTables,
  loadError,
  onToggleSchema,
  onToggleTable,
}: SelectionStepProps) {
  const catalogViewModel = buildSourceImportCatalogViewModel({
    tables,
    activeTableKey: null,
  });

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
        <ScrollArea className="h-96">
          <SourceImportCatalogView
            catalog={catalogViewModel}
            emptyLabel={copy.selection.empty}
            onToggleSchema={onToggleSchema}
            onToggleTable={onToggleTable}
          />
        </ScrollArea>
      )}
    </div>
  );
}
