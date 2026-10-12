/**
 * Owned concern: project local interactions over an immutable bounded sample.
 * @baseline ADR-0044: Diagnostic prose is not a semantic contract.
 * @decision Keep filter, order and selection outside the authoritative query lifecycle.
 * @consequence No interaction here changes provider data, field order or query scope.
 * @version 1.0.0
 */
import {
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { useMemo, useState } from 'react';
import { useOperationalDrawerDataColumns } from './useOperationalDrawerDataColumns';

type SampleRow = Readonly<{ values: readonly (string | null)[] }>;
export type OperationalDrawerDataTableInput = Readonly<{
  caption: string;
  columns: readonly Readonly<{ name: string; type?: string }>[];
  nullValueLabel: string;
  rows: readonly SampleRow[];
}>;
type Selection = { row: SampleRow; columnId: string };

export function useOperationalDrawerDataTable(input: OperationalDrawerDataTableInput) {
  const { columns, rows, nullValueLabel } = input;
  const [sorting, setSorting] = useState<SortingState>([]);
  const [search, setSearch] = useState('');
  const [comfortable, setComfortable] = useState(false);
  const [wrap, setWrap] = useState(false);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [feedback, setFeedback] = useState<{
    selection: Selection;
    result: 'copied' | 'copyFailed';
  } | null>(null);
  const columnMovement = useOperationalDrawerDataColumns(columns);
  const tableColumns = useMemo<ColumnDef<SampleRow>[]>(
    () =>
      columns.map((column, index) => ({
        id: column.name,
        accessorFn: (row) => row.values[index] ?? undefined,
        sortingFn: 'alphanumeric',
        sortUndefined: 'last',
        filterFn: 'includesString',
      })),
    [columns]
  );
  const tableData = useMemo(() => [...rows], [rows]);
  const table = useReactTable({
    columns: tableColumns,
    data: tableData,
    enableMultiSort: false,
    autoResetPageIndex: false,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: 'includesString',
    getColumnCanGlobalFilter: () => true,
    onSortingChange: setSorting,
    state: { sorting, columnOrder: columnMovement.order, globalFilter: search },
  });
  const visibleRows = table.getRowModel().rows;
  const selectedCell = visibleRows
    .find((row) => row.original === selection?.row)
    ?.getVisibleCells()
    .find((cell) => cell.column.id === selection?.columnId);
  const copyCell = async () => {
    if (selection == null || selectedCell == null) return;
    try {
      await navigator.clipboard.writeText(
        selectedCell.getValue<string | undefined>() ?? nullValueLabel
      );
      setFeedback({ selection, result: 'copied' });
    } catch {
      setFeedback({ selection, result: 'copyFailed' });
    }
  };
  return {
    caption: input.caption,
    nullValueLabel,
    search,
    setSearch,
    comfortable,
    setComfortable,
    wrap,
    setWrap,
    total: rows.length,
    canCopy: selectedCell != null,
    copyCell,
    feedback: selectedCell != null && feedback?.selection === selection ? feedback.result : null,
    headers: table.getFlatHeaders().map((header) => ({
      id: header.column.id,
      type: columns.find((column) => column.name === header.column.id)?.type,
      sort:
        header.column.getIsSorted() === 'asc'
          ? ('ascending' as const)
          : header.column.getIsSorted() === 'desc'
            ? ('descending' as const)
            : ('none' as const),
      toggleSort: header.column.getToggleSortingHandler(),
      movement: columnMovement.bind(header.column.id),
    })),
    rows: visibleRows.map((row, index) => ({
      id: row.id,
      number: index + 1,
      cells: row.getVisibleCells().map((cell) => ({
        id: cell.id,
        value: cell.getValue<string | undefined>(),
        selected: cell.id === selectedCell?.id,
        select: () => {
          setSelection({ row: row.original, columnId: cell.column.id });
          setFeedback(null);
        },
      })),
    })),
  };
}
