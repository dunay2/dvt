/** Owned concern: render active warehouse source metadata without owning wizard flow state. */
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';
import { sourceImportWizardCopy as copy } from './copy';
import { buildSourceImportTableViewModel } from './sourceImportWizardModel';
import type { TableInfo } from './types';

type SourceImportActiveTableMetadataProps = Readonly<{
  activeTable: TableInfo | null;
}>;

export function SourceImportActiveTableMetadata({
  activeTable,
}: SourceImportActiveTableMetadataProps): JSX.Element {
  const activeTableViewModel = activeTable ? buildSourceImportTableViewModel(activeTable, 0) : null;
  const tableName = activeTableViewModel?.canonicalName ?? copy.metadata.noTableSelected;

  return (
    <div className="space-y-3">
      <div>
        <h3 className="mb-2 text-lg font-medium">{copy.metadata.title}</h3>
        <p className="text-sm text-slate-300">{copy.metadata.description}</p>
      </div>

      <Card className="border-slate-600 p-4">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-mono text-sm text-slate-100">{tableName}</div>
            <div className="mt-1 text-xs text-slate-400">
              {activeTableViewModel?.rowCountLabel ?? copy.metadata.rowsUnknown} /{' '}
              {activeTableViewModel?.byteSizeLabel ?? copy.metadata.sizeUnknown} /{' '}
              {activeTableViewModel?.columnCountLabel ?? copy.metadata.noColumns}
            </div>
          </div>
          {activeTableViewModel ? (
            <Badge variant="outline">{copy.metadata.warehouseSource}</Badge>
          ) : null}
        </div>

        {activeTableViewModel && activeTableViewModel.columns.length > 0 ? (
          <ScrollArea className="h-64">
            <div className="space-y-2">
              {activeTableViewModel.columns.map((column) => (
                <div
                  key={`${tableName}.${column.name}`}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 rounded border border-slate-800 bg-slate-950/50 px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="truncate font-mono text-xs text-slate-100">{column.name}</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {column.constraintLabels.map((label) => (
                        <Badge key={`${column.name}.${label}`} variant="outline">
                          {label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <span className="font-mono text-[11px] text-slate-300">{column.type}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="rounded border border-slate-800 bg-slate-950/40 p-3 text-sm text-slate-300">
            {copy.metadata.columnsUnavailable}
          </div>
        )}
      </Card>
    </div>
  );
}
