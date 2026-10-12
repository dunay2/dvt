/** Condition rows contain presentation and user intent only. */
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import type { SemanticWorkbenchJoinConditionRow } from './conditionRows';
import type { ComparisonRow } from './conditionDraft';

export function JoinConditionList({
  rows,
  activeKey = null,
  onEdit,
  onRemove,
}: Readonly<{
  rows: readonly SemanticWorkbenchJoinConditionRow[];
  activeKey?: string | null;
  onEdit?: (row: ComparisonRow) => void;
  onRemove?: (key: string) => void;
}>) {
  const canRemove = rows.filter((row) => row.kind === 'comparison').length > 1;
  return (
    <div className="mt-2 grid gap-1 text-xs">
      {rows.length === 0 ? <p className="text-(--text-muted)">Sin condiciones.</p> : null}
      {rows.map((row, index) =>
        row.kind === 'comparison' ? (
          <div
            key={`${row.conditionKey}-${index}`}
            data-slot="semantic-workbench-join-condition-row"
            hidden={activeKey === row.conditionKey}
            className={`items-center gap-1 rounded border border-cyan-900 p-2 ${activeKey === row.conditionKey ? 'hidden' : 'flex'}`}
            style={{ marginLeft: row.depth * 12 }}
          >
            <span className="min-w-0 flex-1 break-words font-mono text-emerald-100">
              {row.label}
            </span>
            {onEdit == null ? null : (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Editar condición"
                title="Editar condición"
                onClick={() => onEdit(row)}
              >
                <Pencil size={12} aria-hidden />
              </Button>
            )}
            {canRemove && onRemove != null ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Eliminar condición"
                title="Eliminar condición"
                onClick={() => onRemove(row.conditionKey)}
              >
                <Trash2 size={12} aria-hidden />
              </Button>
            ) : null}
          </div>
        ) : (
          <div
            key={`${row.kind}-${row.depth}-${index}`}
            className="font-mono font-semibold text-emerald-300"
            style={{ marginLeft: row.depth * 12 }}
          >
            {row.label}
          </div>
        )
      )}
    </div>
  );
}
