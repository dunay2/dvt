import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import type { SourceImportOptionContribution, SourceImportOptionId } from '../../plugins/registry';
import { resolveString } from '../../plugins/contracts/PluginManifest';
import { sourceImportWizardCopy as copy } from './copy';
import {
  buildPreviewGroups,
  buildSourceImportCatalogViewModel,
  buildSourceImportTableViewModel,
} from './sourceImportWizardModel';
import type { TableInfo } from './types';

interface ReviewStepProps {
  tables: TableInfo[];
  selectedCount: number;
  groupingStrategy: 'schema' | 'database' | 'custom';
  selectedConnectionName: string;
  sourceImportOptions: readonly SourceImportOptionContribution[];
  sourceImportOptionValues: Readonly<Record<SourceImportOptionId, boolean>>;
}

export function ReviewStep({
  tables,
  selectedCount,
  groupingStrategy,
  selectedConnectionName,
  sourceImportOptions,
  sourceImportOptionValues,
}: ReviewStepProps) {
  const previewGroups = buildPreviewGroups(tables, groupingStrategy);
  const catalogViewModel = buildSourceImportCatalogViewModel({
    tables,
    activeTableKey: null,
  });

  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-2 text-lg font-medium">{copy.review.title}</h3>
        <p className="mb-4 text-sm text-slate-300">{copy.review.description}</p>
      </div>

      <Card className="border-slate-600 p-4">
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-300">Connection:</span>
            <span className="font-medium">{selectedConnectionName}</span>
          </div>
          <Separator />
          <div className="flex justify-between">
            <span className="text-slate-300">Tables Selected:</span>
            <span className="font-medium">{selectedCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-300">Data object groups:</span>
            <span className="font-medium">{previewGroups.size}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-300">Grouping Strategy:</span>
            <Badge variant="outline">{groupingStrategy}</Badge>
          </div>
          <Separator />
          {sourceImportOptions.map((option) => {
            const enabled = sourceImportOptionValues[option.id];
            return (
              <div key={option.id} className="flex justify-between gap-4">
                <span className="text-slate-300">{resolveString(option.label)}:</span>
                <Badge variant={enabled ? 'default' : 'secondary'}>{enabled ? 'Yes' : 'No'}</Badge>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="border-slate-600 p-4">
        <h4 className="mb-3 text-sm font-medium">{copy.review.previewTitle}</h4>
        <div className="mb-3 rounded border border-amber-800/70 bg-amber-950/20 px-3 py-2 text-xs text-amber-100/80">
          Destination is configured on a DVT Sink node after origin registration; verify the output
          target before previewing or running the graph.
        </div>
        <ScrollArea className="h-48">
          <div className="space-y-2">
            {Array.from(previewGroups.entries()).map(([key, groupTables]) => (
              <div key={key} className="rounded border border-slate-600 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <code className="text-sm text-blue-400">
                    data-object-group: {key.toLowerCase()}
                  </code>
                  <Badge variant="secondary" className="text-xs">
                    {groupTables.length} tables
                  </Badge>
                </div>
                <div className="space-y-1 text-xs text-slate-400">
                  {groupTables.slice(0, 3).map((table) => (
                    <ReviewSourceTableRow
                      key={`${table.database}.${table.schema}.${table.table}`}
                      table={table}
                    />
                  ))}
                  {groupTables.length > 3 ? <div>... and {groupTables.length - 3} more</div> : null}
                </div>
              </div>
            ))}
            {previewGroups.size === 0
              ? catalogViewModel.selectedTables.map((table) => (
                  <div
                    key={table.canonicalName}
                    className="flex min-w-0 items-center justify-between gap-2 rounded border border-slate-700 px-2 py-1"
                  >
                    <span className="truncate font-mono">{table.canonicalName}</span>
                    <span className="shrink-0">{table.columnCountLabel}</span>
                  </div>
                ))
              : null}
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
}

function ReviewSourceTableRow({ table }: Readonly<{ table: TableInfo }>): JSX.Element {
  const tableViewModel = buildSourceImportTableViewModel(table, 0);

  return (
    <div className="flex min-w-0 items-center justify-between gap-2">
      <span className="truncate font-mono">{tableViewModel.canonicalName}</span>
      <span className="shrink-0">{tableViewModel.columnCountLabel}</span>
    </div>
  );
}
