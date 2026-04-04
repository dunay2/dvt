import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { sourceImportWizardCopy as copy } from './copy';
import { buildPreviewGroups } from './sourceImportWizardModel';
import type { TableInfo } from './types';

interface ReviewStepProps {
  tables: TableInfo[];
  selectedCount: number;
  groupingStrategy: 'schema' | 'database' | 'custom';
  selectedConnectionName: string;
  includeColumns: boolean;
  addTests: boolean;
  addFreshness: boolean;
}

export function ReviewStep({
  tables,
  selectedCount,
  groupingStrategy,
  selectedConnectionName,
  includeColumns,
  addTests,
  addFreshness,
}: ReviewStepProps) {
  const previewGroups = buildPreviewGroups(tables, groupingStrategy);
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
          <div className="flex justify-between">
            <span className="text-slate-300">Include Columns:</span>
            <Badge variant={includeColumns ? 'default' : 'secondary'}>
              {includeColumns ? 'Yes' : 'No'}
            </Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-300">Add Tests:</span>
            <Badge variant={addTests ? 'default' : 'secondary'}>{addTests ? 'Yes' : 'No'}</Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-300">Add Freshness:</span>
            <Badge variant={addFreshness ? 'default' : 'secondary'}>
              {addFreshness ? 'Yes' : 'No'}
            </Badge>
          </div>
        </div>
      </Card>

      <Card className="border-slate-600 p-4">
        <h4 className="mb-3 text-sm font-medium">{copy.review.previewTitle}</h4>
        <ScrollArea className="h-48">
          <div className="space-y-2">
            {Array.from(previewGroups.entries()).map(([key, groupTables]) => (
              <div key={key} className="rounded border border-slate-600 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <code className="text-sm text-blue-400">data-object-group: {key.toLowerCase()}</code>
                  <Badge variant="secondary" className="text-xs">
                    {groupTables.length} tables
                  </Badge>
                </div>
                <div className="space-y-1 text-xs text-slate-400">
                  {groupTables.slice(0, 3).map((table) => (
                    <div key={`${table.database}.${table.schema}.${table.table}`}>-&gt; {table.table}</div>
                  ))}
                  {groupTables.length > 3 ? (
                    <div>... and {groupTables.length - 3} more</div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
}
