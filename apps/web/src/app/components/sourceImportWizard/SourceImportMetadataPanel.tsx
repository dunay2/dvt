import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';
import type { SourceImportOptionContribution, SourceImportOptionId } from '../../plugins/registry';
import type { TableInfo } from './types';
import { GroupingStep } from './GroupingStep';
import { OptionsStep } from './OptionsStep';
import { buildSourceImportTableViewModel } from './sourceImportWizardModel';

type SourceImportMetadataPanelProps = Readonly<{
  activeTable: TableInfo | null;
  groupingStrategy: 'schema' | 'database' | 'custom';
  sourceImportOptions: readonly SourceImportOptionContribution[];
  sourceImportOptionValues: Readonly<Record<SourceImportOptionId, boolean>>;
  onGroupingChange: (grouping: 'schema' | 'database' | 'custom') => void;
  onSourceImportOptionChange: (optionId: SourceImportOptionId, value: boolean) => void;
}>;

export function SourceImportMetadataPanel({
  activeTable,
  groupingStrategy,
  sourceImportOptions,
  sourceImportOptionValues,
  onGroupingChange,
  onSourceImportOptionChange,
}: SourceImportMetadataPanelProps) {
  const activeTableViewModel = activeTable ? buildSourceImportTableViewModel(activeTable, 0) : null;
  const tableName = activeTableViewModel?.canonicalName ?? 'No source table selected';

  return (
    <div id="source-import-section-metadata" className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
      <div className="space-y-4">
        <div>
          <h3 className="mb-2 text-lg font-medium">Source metadata</h3>
          <p className="text-sm text-slate-300">
            Inspect the active source object before registering it into the canvas graph.
          </p>
        </div>

        <Card className="border-slate-600 p-4">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="font-mono text-sm text-slate-100">{tableName}</div>
              <div className="mt-1 text-xs text-slate-400">
                {activeTableViewModel?.rowCountLabel ?? 'Rows unknown'} /{' '}
                {activeTableViewModel?.columnCountLabel ?? '0 columns'}
              </div>
            </div>
            {activeTableViewModel ? <Badge variant="outline">Warehouse source</Badge> : null}
          </div>

          {activeTableViewModel && activeTableViewModel.columns.length > 0 ? (
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {activeTableViewModel.columns.map((column) => (
                  <div
                    key={`${tableName}.${column.name}`}
                    className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 rounded border border-slate-800 bg-slate-950/50 px-3 py-2"
                  >
                    <span className="truncate font-mono text-xs text-slate-100">{column.name}</span>
                    <span className="font-mono text-[11px] text-slate-300">{column.type}</span>
                    <span className="text-[11px] text-slate-400">{column.nullabilityLabel}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="rounded border border-slate-800 bg-slate-950/40 p-3 text-sm text-slate-300">
              Column metadata is not recorded for the active source object.
            </div>
          )}
        </Card>
      </div>

      <div className="space-y-4">
        <GroupingStep groupingStrategy={groupingStrategy} onGroupingChange={onGroupingChange} />
        <OptionsStep
          sourceImportOptions={sourceImportOptions}
          sourceImportOptionValues={sourceImportOptionValues}
          onSourceImportOptionChange={onSourceImportOptionChange}
        />
      </div>
    </div>
  );
}
