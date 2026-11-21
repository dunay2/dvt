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
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table';
import { useMemo, useState } from 'react';
import { useOperationalDrawerDataColumns } from './useOperationalDrawerDataColumns';
import { useOperationalDrawerDataSelection } from './useOperationalDrawerDataSelection';

type SampleRow = Readonly<{ values: readonly (string | null)[] }>;
export type OperationalDrawerDataTableInput = Readonly<{
  caption: string;
  columns: readonly Readonly<{ name: string; type?: string }>[];
  nullValueLabel: string;
  rows: readonly SampleRow[];
}>;
export function useOperationalDrawerDataTable(input: OperationalDrawerDataTableInput) {
  const { columns, rows, nullValueLabel } = input;
  const [sorting, setSorting] = useState<SortingState>([]);
  const [search, setSearch] = useState('');
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [comfortable, setComfortable] = useState(false);
  const [wrap, setWrap] = useState(false);
  const [backgroundColor, setBackgroundColor] = useState('#191a1c');
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
    isMultiSortEvent: () => true,
    sortDescFirst: false,
    autoResetPageIndex: false,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: 'includesString',
    getColumnCanGlobalFilter: () => true,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      columnOrder: columnMovement.order,
      globalFilter: search,
    },
  });
  const visibleRows = table.getRowModel().rows;
  const displayedColumns = table.getVisibleLeafColumns();
  const displayedOrder = displayedColumns.map(({ id }) => id);
  const selection = useOperationalDrawerDataSelection(visibleRows, displayedOrder, nullValueLabel);
  return {
    caption: input.caption,
    nullValueLabel,
    search,
    setSearch,
    hasFilters: search !== '' || columnFilters.length > 0,
    comfortable,
    setComfortable,
    wrap,
    setWrap,
    backgroundColor,
    setBackgroundColor,
    total: rows.length,
    selection,
    columnVisibility: table.getAllLeafColumns().map((column) => ({
      id: column.id,
      visible: column.getIsVisible(),
      toggle: () => column.toggleVisibility(),
    })),
    headers: displayedColumns.map((column) => ({
      id: column.id,
      type: columns.find(({ name }) => name === column.id)?.type,
      sort:
        column.getIsSorted() === 'asc'
          ? ('ascending' as const)
          : column.getIsSorted() === 'desc'
            ? ('descending' as const)
            : ('none' as const),
      toggleSort: column.getToggleSortingHandler(),
      sortPriority: column.getSortIndex() + 1,
      filter: String(column.getFilterValue() ?? ''),
      filterPriority: columnFilters.findIndex(({ id }) => id === column.id) + 1,
      setFilter: (value: string) => column.setFilterValue(value),
      movement: columnMovement.bind(column.id, displayedOrder),
    })),
    rows: visibleRows.map((row, index) => ({
      id: row.id,
      number: index + 1,
      cells: row.getVisibleCells().map((cell, column) => ({
        id: cell.id,
        value: cell.getValue<string | undefined>(),
        selected: selection.contains({ row: index, column }),
        select: (toggle: boolean) => selection.select({ row: index, column }, toggle),
      })),
    })),
  };
}
