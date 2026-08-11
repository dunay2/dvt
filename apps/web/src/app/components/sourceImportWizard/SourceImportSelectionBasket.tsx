/** Owned concern: render selected source objects without owning wizard flow state. */
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { MetricEvidenceHotspot } from '../metrics/MetricEvidenceHotspot';
import { useSourceImportWizardLocalization } from './copy';
import type { SourceImportObjectViewModel } from './sourceImportCatalogModel';

const selectionBasketClassNames = {
  card: 'border-slate-700 bg-slate-950/40 p-3',
  header: 'mb-3 flex items-center justify-between gap-3',
  title: 'text-sm font-medium text-slate-100',
  empty: 'text-sm text-slate-400',
  list: 'space-y-2',
  item: 'rounded border border-slate-800 bg-slate-950/50 px-3 py-2',
  itemHeader: 'flex items-start justify-between gap-3',
  itemName: 'truncate font-mono text-xs text-slate-100',
  itemMeta: 'mt-1 flex flex-wrap gap-1 text-[11px] text-slate-400',
  columnList: 'mt-2 flex flex-wrap gap-1',
  columnBadge:
    'max-w-full justify-start gap-1 border-slate-700 bg-slate-900/70 font-mono text-[11px] text-slate-200',
  columnName: 'truncate',
  columnType: 'text-slate-400',
  columnEmpty: 'mt-2 text-xs text-slate-500',
  columnOverflow: 'text-[11px] text-slate-500',
} as const;

const selectedSourceColumnPreviewLimit = 4;

type SourceImportSelectionBasketProps = Readonly<{
  selectedSourceObjects: readonly SourceImportObjectViewModel[];
  onRemoveSourceObject?: (sourceObjectIndex: number) => void;
}>;

export function SourceImportSelectionBasket({
  selectedSourceObjects,
  onRemoveSourceObject,
}: SourceImportSelectionBasketProps): JSX.Element {
  const { copy } = useSourceImportWizardLocalization();

  return (
    <Card className={selectionBasketClassNames.card}>
      <div className={selectionBasketClassNames.header}>
        <h4 className={selectionBasketClassNames.title}>{copy.selectionBasket.title}</h4>
        <Badge variant="outline">
          {selectedSourceObjects.length} {copy.selectionBasket.selected}
        </Badge>
      </div>
      {selectedSourceObjects.length === 0 ? (
        <p className={selectionBasketClassNames.empty}>{copy.selectionBasket.empty}</p>
      ) : (
        <div className={selectionBasketClassNames.list}>
          {selectedSourceObjects.map((sourceObject) => (
            <div key={sourceObject.identityKey} className={selectionBasketClassNames.item}>
              <div className={selectionBasketClassNames.itemHeader}>
                <div className={selectionBasketClassNames.itemName}>
                  {sourceObject.canonicalName}
                </div>
                {onRemoveSourceObject ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={`${copy.selectionBasket.remove} ${sourceObject.canonicalName}`}
                    onClick={() => onRemoveSourceObject(sourceObject.index)}
                  >
                    {copy.selectionBasket.remove}
                  </Button>
                ) : null}
              </div>
              <div className={selectionBasketClassNames.itemMeta}>
                <MetricEvidenceHotspot
                  detail={sourceObject.rowCountDetail}
                  tone={sourceObject.rowCountTone}
                  value={sourceObject.rowCountLabel}
                />
                <MetricEvidenceHotspot
                  detail={sourceObject.byteSizeDetail}
                  tone={sourceObject.byteSizeTone}
                  value={sourceObject.byteSizeLabel}
                />
                <span>{sourceObject.columnCountLabel}</span>
              </div>
              <SourceImportSelectedColumnPreview sourceObject={sourceObject} />
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function SourceImportSelectedColumnPreview({
  sourceObject,
}: Readonly<{ sourceObject: SourceImportObjectViewModel }>): JSX.Element {
  const { copy } = useSourceImportWizardLocalization();

  if (sourceObject.columns.length === 0) {
    return (
      <p className={selectionBasketClassNames.columnEmpty}>{copy.selectionBasket.noColumns}</p>
    );
  }

  const visibleColumns = sourceObject.columns.slice(0, selectedSourceColumnPreviewLimit);
  const overflowColumnCount = sourceObject.columns.length - visibleColumns.length;

  return (
    <div className={selectionBasketClassNames.columnList}>
      {visibleColumns.map((column) => (
        <Badge
          key={`${sourceObject.identityKey}.${column.name}`}
          variant="outline"
          className={selectionBasketClassNames.columnBadge}
          data-source-import-selected-column={`${sourceObject.canonicalName}.${column.name}`}
        >
          <span className={selectionBasketClassNames.columnName}>{column.name}</span>
          <span className={selectionBasketClassNames.columnType}>{column.type}</span>
          {column.constraintLabels.map((constraint) => (
            <span key={constraint}>{constraint}</span>
          ))}
        </Badge>
      ))}
      {overflowColumnCount > 0 ? (
        <span className={selectionBasketClassNames.columnOverflow}>
          {copy.selectionBasket.moreColumnsPrefix} {overflowColumnCount}{' '}
          {copy.selectionBasket.moreColumnsSuffix}
        </span>
      ) : null}
    </div>
  );
}
