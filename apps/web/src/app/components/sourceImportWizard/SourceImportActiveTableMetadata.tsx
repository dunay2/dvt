/** Owned concern: render active warehouse source metadata without owning wizard flow state. */
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';
import { sourceImportCatalogNumberFormatter, sourceImportWizardCopy as copy } from './copy';
import { buildSourceImportTableViewModel } from './sourceImportCatalogModel';
import type { TableInfo } from './types';

type SourceImportActiveTableMetadataProps = Readonly<{
  activeTable: TableInfo | null;
}>;

export const sourceImportActiveMetadataClassNames = {
  root: 'space-y-3',
  title: 'mb-2 text-lg font-medium',
  description: 'text-sm text-slate-300',
  card: 'border-slate-600 p-4',
  summary: 'mb-3 flex flex-wrap items-start justify-between gap-3',
  identity: 'min-w-0',
  tableName: 'font-mono text-sm text-slate-100',
  metrics: 'mt-1 text-xs text-slate-400',
  columnList: 'space-y-2',
  columnRow:
    'grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 rounded border border-slate-800 bg-slate-950/50 px-3 py-2',
  columnIdentity: 'min-w-0',
  columnName: 'truncate font-mono text-xs text-slate-100',
  constraintList: 'mt-1 flex flex-wrap gap-1',
  columnType: 'font-mono text-[11px] text-slate-300',
  unavailable: 'rounded border border-slate-800 bg-slate-950/40 p-3 text-sm text-slate-300',
} as const;

export function SourceImportActiveTableMetadata({
  activeTable,
}: SourceImportActiveTableMetadataProps): JSX.Element {
  const activeTableViewModel = activeTable
    ? buildSourceImportTableViewModel(
        activeTable,
        0,
        copy.catalog,
        sourceImportCatalogNumberFormatter
      )
    : null;
  const tableName = activeTableViewModel?.canonicalName ?? copy.metadata.noTableSelected;

  return (
    <div className={sourceImportActiveMetadataClassNames.root}>
      <div>
        <h3 className={sourceImportActiveMetadataClassNames.title}>{copy.metadata.title}</h3>
        <p className={sourceImportActiveMetadataClassNames.description}>
          {copy.metadata.description}
        </p>
      </div>

      <Card
        className={sourceImportActiveMetadataClassNames.card}
        data-source-import-active-table={activeTableViewModel?.canonicalName}
      >
        <div className={sourceImportActiveMetadataClassNames.summary}>
          <div className={sourceImportActiveMetadataClassNames.identity}>
            <div className={sourceImportActiveMetadataClassNames.tableName}>{tableName}</div>
            <div className={sourceImportActiveMetadataClassNames.metrics}>
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
            <div className={sourceImportActiveMetadataClassNames.columnList}>
              {activeTableViewModel.columns.map((column) => (
                <div
                  key={`${tableName}.${column.name}`}
                  className={sourceImportActiveMetadataClassNames.columnRow}
                  data-source-import-metadata-column={`${tableName}.${column.name}`}
                >
                  <div className={sourceImportActiveMetadataClassNames.columnIdentity}>
                    <div className={sourceImportActiveMetadataClassNames.columnName}>
                      {column.name}
                    </div>
                    <div className={sourceImportActiveMetadataClassNames.constraintList}>
                      {column.constraintLabels.map((label) => (
                        <Badge key={`${column.name}.${label}`} variant="outline">
                          {label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <span className={sourceImportActiveMetadataClassNames.columnType}>
                    {column.type}
                  </span>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className={sourceImportActiveMetadataClassNames.unavailable}>
            {copy.metadata.columnsUnavailable}
          </div>
        )}
      </Card>
    </div>
  );
}
