/** Own selection and clipboard feedback for the displayed sample. */
import type { Row } from '@tanstack/react-table';
import { useState } from 'react';

type Cell = Readonly<{ row: number; column: number }>;
type Feedback = 'copied' | 'copyFailed' | 'copiedRange' | 'copyRangeFailed';
type Selection<T> = Readonly<{
  anchor: Cell;
  active: Cell;
  rows: readonly Row<T>[];
  columns: readonly string[];
}>;

const directions: ReadonlyMap<string, Cell> = new Map([
  ['ArrowUp', { row: -1, column: 0 }],
  ['ArrowDown', { row: 1, column: 0 }],
  ['ArrowLeft', { row: 0, column: -1 }],
  ['ArrowRight', { row: 0, column: 1 }],
]);

function rebaseSelection<T>(
  selection: Selection<T>,
  rows: readonly Row<T>[],
  columns: readonly string[]
): Selection<T> | null {
  const sameColumns =
    columns.length === selection.columns.length &&
    columns.every((column, index) => column === selection.columns[index]);
  if (rows === selection.rows && sameColumns) return selection;
  const original = selection.rows[selection.active.row]?.original;
  const row = rows.findIndex((candidate) => candidate.original === original);
  const column = columns.indexOf(selection.columns[selection.active.column]!);
  if (row < 0 || column < 0) return null;
  const active = { row, column };
  return { active, anchor: active, rows, columns };
}

function boundsOf({ anchor, active }: Readonly<{ anchor: Cell; active: Cell }>) {
  return {
    top: Math.min(anchor.row, active.row),
    bottom: Math.max(anchor.row, active.row),
    left: Math.min(anchor.column, active.column),
    right: Math.max(anchor.column, active.column),
  };
}

function escapeTabularValue(value: string): string {
  return /[\t\r\n"]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

export function useOperationalDrawerDataSelection<T>(
  rows: readonly Row<T>[],
  columns: readonly string[],
  nullLabel: string
) {
  const [previous, setSelection] = useState<Selection<T> | null>(null);
  const [lastCopy, setLastCopy] = useState<{ selection: Selection<T>; result: Feedback } | null>(
    null
  );
  const selection = previous == null ? null : rebaseSelection(previous, rows, columns);
  if (selection !== previous) setSelection(selection);

  const bounds = selection == null ? null : boundsOf(selection);
  const isRange = bounds != null && (bounds.top !== bounds.bottom || bounds.left !== bounds.right);

  function select(active: Cell, extend: boolean) {
    const anchor = (extend ? selection?.anchor : undefined) ?? active;
    setSelection({ anchor, active, rows, columns });
  }

  function move(from: Cell, key: string, extend: boolean): Cell | null {
    const direction = directions.get(key);
    if (direction == null) return null;
    const active = {
      row: Math.max(0, Math.min(rows.length - 1, from.row + direction.row)),
      column: Math.max(0, Math.min(columns.length - 1, from.column + direction.column)),
    };
    const anchor =
      extend && selection?.active.row === from.row && selection.active.column === from.column
        ? selection.anchor
        : from;
    setSelection({ anchor: extend ? anchor : active, active, rows, columns });
    return active;
  }

  async function copy() {
    if (bounds == null || selection == null) return;
    const values = rows.slice(bounds.top, bounds.bottom + 1).map((row) =>
      row
        .getVisibleCells()
        .slice(bounds.left, bounds.right + 1)
        .map((cell) => cell.getValue<string | undefined>() ?? nullLabel)
    );
    const text = isRange
      ? values.map((row) => row.map(escapeTabularValue).join('\t')).join('\n')
      : (values[0]?.[0] ?? '');
    try {
      await navigator.clipboard.writeText(text);
      setLastCopy({ selection, result: isRange ? 'copiedRange' : 'copied' });
    } catch {
      setLastCopy({ selection, result: isRange ? 'copyRangeFailed' : 'copyFailed' });
    }
  }

  return {
    canCopy: selection != null,
    isRange,
    copy,
    move,
    select,
    feedback: lastCopy?.selection === selection ? lastCopy.result : null,
    contains: ({ row, column }: Cell) =>
      bounds != null &&
      row >= bounds.top &&
      row <= bounds.bottom &&
      column >= bounds.left &&
      column <= bounds.right,
  };
}
