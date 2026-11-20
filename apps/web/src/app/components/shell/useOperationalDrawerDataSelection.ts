/** Own selection and clipboard feedback for the displayed sample. */
import type { Row } from '@tanstack/react-table';
import { useState } from 'react';

type Cell = Readonly<{ row: number; column: number }>;
type Cells = ReadonlyMap<string, Cell>;
type Feedback = 'copied' | 'copyFailed' | 'copiedRange' | 'copyRangeFailed';
type Selection<T> = Readonly<{
  anchor: Cell;
  active: Cell;
  cells: Cells;
  rows: readonly Row<T>[];
  columns: readonly string[];
}>;

const directions: ReadonlyMap<string, Cell> = new Map([
  ['ArrowUp', { row: -1, column: 0 }],
  ['ArrowDown', { row: 1, column: 0 }],
  ['ArrowLeft', { row: 0, column: -1 }],
  ['ArrowRight', { row: 0, column: 1 }],
]);

function cellKey({ row, column }: Cell): string {
  return `${row}:${column}`;
}

function rectangle(anchor: Cell, active: Cell): Cells {
  const cells = new Map<string, Cell>();
  for (let row = Math.min(anchor.row, active.row); row <= Math.max(anchor.row, active.row); row++) {
    for (
      let column = Math.min(anchor.column, active.column);
      column <= Math.max(anchor.column, active.column);
      column++
    ) {
      const cell = { row, column };
      cells.set(cellKey(cell), cell);
    }
  }
  return cells;
}

function rebaseSelection<T>(
  selection: Selection<T>,
  rows: readonly Row<T>[],
  columns: readonly string[]
): Selection<T> | null {
  const sameColumns =
    columns.length === selection.columns.length &&
    columns.every((column, index) => column === selection.columns[index]);
  if (rows === selection.rows && sameColumns) return selection;
  if (!selection.cells.has(cellKey(selection.active))) return null;
  const original = selection.rows[selection.active.row]?.original;
  const row = rows.findIndex((candidate) => candidate.original === original);
  const column = columns.indexOf(selection.columns[selection.active.column]!);
  if (row < 0 || column < 0) return null;
  const active = { row, column };
  return { active, anchor: active, cells: rectangle(active, active), rows, columns };
}

function escapeTabularValue(value: string): string {
  return /[\t\r\n"]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

function clipboardText<T>(rows: readonly Row<T>[], cells: Cells, nullLabel: string): string {
  const positions = [...cells.values()];
  if (positions.length === 1) {
    const { row, column } = positions[0]!;
    return rows[row]?.getVisibleCells()[column]?.getValue<string>() ?? nullLabel;
  }

  let top = Infinity;
  let bottom = 0;
  let left = Infinity;
  let right = 0;
  for (const { row, column } of positions) {
    top = Math.min(top, row);
    bottom = Math.max(bottom, row);
    left = Math.min(left, column);
    right = Math.max(right, column);
  }
  return rows
    .slice(top, bottom + 1)
    .map((row, offset) =>
      row
        .getVisibleCells()
        .slice(left, right + 1)
        .map((cell, column) =>
          cells.has(cellKey({ row: top + offset, column: left + column }))
            ? escapeTabularValue(cell.getValue<string>() ?? nullLabel)
            : ''
        )
        .join('\t')
    )
    .join('\n');
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

  const count = selection?.cells.size ?? 0;
  const isRange = count > 1;

  function select(active: Cell, toggle: boolean) {
    const cells = new Map(toggle ? selection?.cells : undefined);
    const key = cellKey(active);
    if (!cells.delete(key)) cells.set(key, active);
    setSelection({ anchor: active, active, cells, rows, columns });
  }

  function move(from: Cell, key: string, extend: boolean): Cell | null {
    const direction = directions.get(key);
    if (direction == null) return null;
    const active = {
      row: Math.max(0, Math.min(rows.length - 1, from.row + direction.row)),
      column: Math.max(0, Math.min(columns.length - 1, from.column + direction.column)),
    };
    const origin =
      selection?.active.row === from.row && selection.active.column === from.column
        ? selection.anchor
        : from;
    const anchor = extend ? origin : active;
    setSelection({ anchor, active, cells: rectangle(anchor, active), rows, columns });
    return active;
  }

  async function copy() {
    if (selection == null || count === 0) return;
    try {
      await navigator.clipboard.writeText(clipboardText(rows, selection.cells, nullLabel));
      setLastCopy({ selection, result: isRange ? 'copiedRange' : 'copied' });
    } catch {
      setLastCopy({ selection, result: isRange ? 'copyRangeFailed' : 'copyFailed' });
    }
  }

  return {
    canCopy: count > 0,
    isRange,
    copy,
    move,
    select,
    feedback: lastCopy?.selection === selection ? lastCopy.result : null,
    contains: (cell: Cell) => selection?.cells.has(cellKey(cell)) ?? false,
  };
}
