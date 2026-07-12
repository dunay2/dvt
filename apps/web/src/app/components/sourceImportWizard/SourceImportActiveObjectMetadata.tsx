/** Owned concern: render active warehouse source metadata without owning wizard flow state. */
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';
import { MetricEvidenceHotspot } from '../metrics/MetricEvidenceHotspot';
import { sourceImportCatalogNumberFormatter, sourceImportWizardCopy as copy } from './copy';
import { buildSourceImportObjectViewModel } from './sourceImportCatalogModel';
import type { SelectableSourceObject } from './types';

type SourceImportActiveObjectMetadataProps = Readonly<{
  activeSourceObject: SelectableSourceObject | null;
}>;

export const sourceImportActiveMetadataClassNames = {
  root: 'space-y-3',
  title: 'mb-2 text-lg font-medium',
  description: 'text-sm text-slate-300',
  card: 'border-slate-600 p-4',
  summary: 'mb-3 flex flex-wrap items-start justify-between gap-3',
  identity: 'min-w-0',
  objectName: 'font-mono text-sm text-slate-100',
  metrics: 'mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400',
  columnList: 'space-y-2',
  columnRow:
    'grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 rounded border border-slate-800 bg-slate-950/50 px-3 py-2',
  columnIdentity: 'min-w-0',
  columnName: 'truncate font-mono text-xs text-slate-100',
  constraintList: 'mt-1 flex flex-wrap gap-1',
  columnType: 'font-mono text-[11px] text-slate-300',
  unavailable: 'rounded border border-slate-800 bg-slate-950/40 p-3 text-sm text-slate-300',
  importability: 'rounded border border-amber-500/40 bg-amber-950/20 p-3 text-sm text-amber-200',
} as const;

export function SourceImportActiveObjectMetadata({
  activeSourceObject,
}: SourceImportActiveObjectMetadataProps): JSX.Element {
  const activeObjectViewModel = activeSourceObject
    ? buildSourceImportObjectViewModel(
        activeSourceObject,
        0,
        copy.catalog,
        sourceImportCatalogNumberFormatter
      )
    : null;
  const objectName = activeObjectViewModel?.canonicalName ?? copy.metadata.noObjectSelected;

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
        data-source-import-active-object={activeObjectViewModel?.identityKey}
      >
        <div className={sourceImportActiveMetadataClassNames.summary}>
          <div className={sourceImportActiveMetadataClassNames.identity}>
            <div className={sourceImportActiveMetadataClassNames.objectName}>{objectName}</div>
            <div className={sourceImportActiveMetadataClassNames.metrics}>
              {activeObjectViewModel ? (
                <>
                  <MetricEvidenceHotspot
                    detail={activeObjectViewModel.rowCountDetail}
                    tone={activeObjectViewModel.rowCountTone}
                    value={activeObjectViewModel.rowCountLabel}
                  />
                  <MetricEvidenceHotspot
                    detail={activeObjectViewModel.byteSizeDetail}
                    tone={activeObjectViewModel.byteSizeTone}
                    value={activeObjectViewModel.byteSizeLabel}
                  />
                  <span>{activeObjectViewModel.columnCountLabel}</span>
                </>
              ) : (
                <span>
                  {copy.metadata.rowsUnknown} / {copy.metadata.sizeUnknown} /{' '}
                  {copy.metadata.noColumns}
                </span>
              )}
            </div>
          </div>
          {activeObjectViewModel ? (
            <Badge variant="outline">{activeObjectViewModel.kindLabel}</Badge>
          ) : null}
        </div>

        {activeObjectViewModel?.importabilityLabel ? (
          <p className={sourceImportActiveMetadataClassNames.importability}>
            {activeObjectViewModel.importabilityLabel}
          </p>
        ) : null}

        {activeObjectViewModel && activeObjectViewModel.columns.length > 0 ? (
          <ScrollArea className="h-64">
            <div className={sourceImportActiveMetadataClassNames.columnList}>
              {activeObjectViewModel.columns.map((column) => (
                <div
                  key={`${activeObjectViewModel.identityKey}.${column.name}`}
                  className={sourceImportActiveMetadataClassNames.columnRow}
                  data-source-import-metadata-column={`${objectName}.${column.name}`}
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
