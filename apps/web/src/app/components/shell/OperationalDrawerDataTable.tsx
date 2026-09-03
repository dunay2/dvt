/** Owned concern: present one source sample with local column positioning and row sorting. */
import { getCoreRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import type { ColumnDef, SortingState } from '@tanstack/react-table';
import { useMemo, useRef, useState } from 'react';

const operationalDrawerDataTableClassNames = {
  frame:
    'w-full max-w-full min-w-0 overflow-auto rounded border border-[color:var(--border-default)]',
  table: 'w-max min-w-full border-collapse text-left font-mono text-xs',
  header:
    'sticky top-0 z-10 border-b border-[color:var(--border-default)] bg-[var(--surface-raised)] text-[var(--text-strong)]',
  headerCell:
    'min-w-32 max-w-80 overflow-hidden border-r border-[color:var(--border-default)] p-0 font-semibold last:border-r-0 data-[drop-edge=before]:shadow-[inset_3px_0_0_0_var(--accent-primary)] data-[drop-edge=after]:shadow-[inset_-3px_0_0_0_var(--accent-primary)]',
  headerButton:
    "block w-full cursor-grab overflow-hidden px-3 py-2 text-left text-ellipsis whitespace-nowrap after:ml-2 data-[sort=ascending]:after:content-['↑'] data-[sort=descending]:after:content-['↓'] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-400 active:cursor-grabbing",
  row: 'last:[&>td]:border-b-0',
  cell: 'min-w-32 max-w-80 overflow-hidden border-r border-b border-[color:var(--border-muted)] px-3 py-2 text-[var(--text-default)] last:border-r-0',
  value: 'block max-w-80 truncate',
  nullValue: 'italic text-[var(--text-muted)]',
  screenReaderOnly: 'sr-only',
} as const;

export type OperationalDrawerDataTableSort = 'ascending' | 'descending' | 'none';

export function OperationalDrawerDataTable({
  caption,
  columns,
  nullValueLabel,
  rows,
}: Readonly<{
  caption: string;
  columns: readonly Readonly<{ name: string }>[];
  nullValueLabel: string;
  rows: readonly Readonly<{ values: readonly (string | null)[] }>[];
}>): JSX.Element {
  const [columnOrder, setColumnOrder] = useState(() => columns.map((column) => column.name));
  const [sorting, setSorting] = useState<SortingState>([]);
  const draggedColumnId = useRef<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{
    id: string;
    edge: 'before' | 'after';
  } | null>(null);
  const tableColumns = useMemo<ColumnDef<(typeof rows)[number]>[]>(
    () =>
      columns.map((column, index) => ({
        id: column.name,
        header: column.name,
        accessorFn: (row) => row.values[index] ?? undefined,
        sortingFn: 'alphanumeric',
        sortUndefined: 'last',
      })),
    [columns]
  );
  const tableData = useMemo(() => [...rows], [rows]);
  const table = useReactTable({
    columns: tableColumns,
    data: tableData,
    enableMultiSort: false,
    enableSortingRemoval: true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onColumnOrderChange: setColumnOrder,
    onSortingChange: setSorting,
    state: { columnOrder, sorting },
  });

  const moveColumn = (sourceId: string, targetId: string, edge: 'before' | 'after'): void => {
    if (sourceId === targetId || !columnOrder.includes(sourceId)) return;
    setColumnOrder((current) => {
      const next = current.filter((id) => id !== sourceId);
      const targetIndex = next.indexOf(targetId);
      if (targetIndex < 0) return current;
      next.splice(targetIndex + (edge === 'after' ? 1 : 0), 0, sourceId);
      return next;
    });
  };

  return (
    <div
      data-slot="bottom-operational-data-table-frame"
      className={operationalDrawerDataTableClassNames.frame}
    >
      <table
        data-slot="bottom-operational-data-table"
        className={operationalDrawerDataTableClassNames.table}
      >
        <caption className={operationalDrawerDataTableClassNames.screenReaderOnly}>
          {caption}
        </caption>
        <thead className={operationalDrawerDataTableClassNames.header}>
          <tr>
            {table.getFlatHeaders().map((header) => {
              const sorted = header.column.getIsSorted();
              const ariaSort: OperationalDrawerDataTableSort =
                sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : 'none';
              return (
                <th
                  key={header.id}
                  scope="col"
                  aria-sort={ariaSort}
                  data-drop-edge={dropTarget?.id === header.column.id ? dropTarget.edge : undefined}
                  className={operationalDrawerDataTableClassNames.headerCell}
                >
                  <button
                    type="button"
                    draggable
                    data-column-id={header.column.id}
                    data-sort={ariaSort}
                    aria-keyshortcuts="Alt+ArrowLeft Alt+ArrowRight"
                    className={operationalDrawerDataTableClassNames.headerButton}
                    onClick={header.column.getToggleSortingHandler()}
                    onDragStart={(event) => {
                      draggedColumnId.current = header.column.id;
                      event.dataTransfer.effectAllowed = 'move';
                      event.dataTransfer.setData('text/x-dvt-data-column', header.column.id);
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      const bounds = event.currentTarget.getBoundingClientRect();
                      const edge =
                        bounds.width === 0 || event.clientX <= bounds.left + bounds.width / 2
                          ? 'before'
                          : 'after';
                      event.dataTransfer.dropEffect = 'move';
                      setDropTarget({ id: header.column.id, edge });
                    }}
                    onDragEnd={() => {
                      draggedColumnId.current = null;
                      setDropTarget(null);
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      const sourceId =
                        event.dataTransfer.getData('text/x-dvt-data-column') ||
                        draggedColumnId.current ||
                        '';
                      const bounds = event.currentTarget.getBoundingClientRect();
                      const edge =
                        bounds.width === 0 || event.clientX <= bounds.left + bounds.width / 2
                          ? 'before'
                          : 'after';
                      moveColumn(sourceId, header.column.id, edge);
                      draggedColumnId.current = null;
                      setDropTarget(null);
                    }}
                    onKeyDown={(event) => {
                      if (!event.altKey || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
                      event.preventDefault();
                      const index = columnOrder.indexOf(header.column.id);
                      const targetId = columnOrder[index + (event.key === 'ArrowLeft' ? -1 : 1)];
                      if (targetId != null) {
                        moveColumn(
                          header.column.id,
                          targetId,
                          event.key === 'ArrowLeft' ? 'before' : 'after'
                        );
                      }
                    }}
                  >
                    {String(header.column.columnDef.header)}
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className={operationalDrawerDataTableClassNames.row}>
              {row.getVisibleCells().map((cell) => {
                const value = cell.getValue<string | undefined>();
                return (
                  <td key={cell.id} className={operationalDrawerDataTableClassNames.cell}>
                    {value == null ? (
                      <span className={operationalDrawerDataTableClassNames.nullValue}>
                        {nullValueLabel}
                      </span>
                    ) : (
                      <span
                        data-slot="bottom-operational-data-value"
                        className={operationalDrawerDataTableClassNames.value}
                        title={value}
                        aria-label={value}
                      >
                        {value}
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
