/** Owned concern: render selected source tables without owning wizard flow state. */
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { sourceImportWizardCopy as copy } from './copy';
import type { SourceImportTableViewModel } from './sourceImportCatalogModel';

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
} as const;

type SourceImportSelectionBasketProps = Readonly<{
  selectedTables: readonly SourceImportTableViewModel[];
  onRemoveTable?: (tableIndex: number) => void;
}>;

export function SourceImportSelectionBasket({
  selectedTables,
  onRemoveTable,
}: SourceImportSelectionBasketProps): JSX.Element {
  return (
    <Card className={selectionBasketClassNames.card}>
      <div className={selectionBasketClassNames.header}>
        <h4 className={selectionBasketClassNames.title}>{copy.selectionBasket.title}</h4>
        <Badge variant="outline">
          {selectedTables.length} {copy.selectionBasket.selected}
        </Badge>
      </div>
      {selectedTables.length === 0 ? (
        <p className={selectionBasketClassNames.empty}>{copy.selectionBasket.empty}</p>
      ) : (
        <div className={selectionBasketClassNames.list}>
          {selectedTables.map((table) => (
            <div key={table.canonicalName} className={selectionBasketClassNames.item}>
              <div className={selectionBasketClassNames.itemHeader}>
                <div className={selectionBasketClassNames.itemName}>{table.canonicalName}</div>
                {onRemoveTable ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={`${copy.selectionBasket.remove} ${table.canonicalName}`}
                    onClick={() => onRemoveTable(table.index)}
                  >
                    {copy.selectionBasket.remove}
                  </Button>
                ) : null}
              </div>
              <div className={selectionBasketClassNames.itemMeta}>
                <span>{table.rowCountLabel}</span>
                {table.byteSizeLabel == null ? null : <span>{table.byteSizeLabel}</span>}
                <span>{table.columnCountLabel}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
