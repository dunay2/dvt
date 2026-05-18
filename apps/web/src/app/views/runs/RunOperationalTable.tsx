/**
 * Owned concern: render the Runs dense operational table with TanStack Table
 * while delegating row, filter, sort, and route semantics to local models.
 */
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown } from 'lucide-react';
import { useMemo } from 'react';

import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { cn } from '../../components/ui/utils';
import { routeWorkbenchMutedTextClassName } from '../../components/workbench/RouteWorkbenchFrame';
import { getRunStatusTone } from './runStatesModel';
import {
  type RunOperationalRow,
  type RunOperationalSortColumn,
  type RunOperationalTableFilters,
  type RunOperationalTableSort,
} from './runOperationalTableModel';
import { runStatesCopy as copy } from './runStatesCopy';

type RunOperationalTableProps = {
  rows: RunOperationalRow[];
  filters: RunOperationalTableFilters;
  sort: RunOperationalTableSort;
  onFiltersChange: (filters: RunOperationalTableFilters) => void;
  onSortChange: (sort: RunOperationalTableSort) => void;
  onOpenRun: (runId: string) => void;
  isLoading?: boolean;
};

function nextSort(current: RunOperationalTableSort, columnId: RunOperationalSortColumn) {
  if (current.columnId !== columnId) {
    return { columnId, direction: 'asc' as const };
  }

  return {
    columnId,
    direction: current.direction === 'asc' ? ('desc' as const) : ('asc' as const),
  };
}

export function RunOperationalTable({
  rows,
  filters,
  sort,
  onFiltersChange,
  onSortChange,
  onOpenRun,
  isLoading,
}: RunOperationalTableProps) {
  const columns = useMemo<ColumnDef<RunOperationalRow>[]>(
    () => [
      {
        accessorKey: 'runId',
        header: 'Run ID',
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.runId}</span>,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Badge className={cn(getRunStatusTone(row.original.status))}>
              {row.original.status}
            </Badge>
            {row.original.substatus ? (
              <Badge variant="outline">{row.original.substatus}</Badge>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: 'startedAt',
        header: 'Started',
        cell: ({ row }) => row.original.startedAtLabel,
      },
      {
        accessorKey: 'duration',
        header: 'Duration',
        cell: ({ row }) => row.original.durationLabel,
      },
      {
        accessorKey: 'environment',
        header: 'Environment',
        cell: ({ row }) => row.original.environment ?? '-',
      },
      {
        accessorKey: 'gitSha',
        header: 'Git SHA',
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.gitSha ?? '-'}</span>,
      },
      {
        id: 'action',
        header: '',
        cell: ({ row }) => (
          <Button variant="outline" size="sm" onClick={() => onOpenRun(row.original.runId)}>
            {copy.viewDetails}
          </Button>
        ),
      },
    ],
    [onOpenRun]
  );
  const table = useReactTable({ data: rows, columns, getCoreRowModel: getCoreRowModel() });
  const sortableHeaders: Partial<Record<string, RunOperationalSortColumn>> = {
    runId: 'runId',
    status: 'status',
    startedAt: 'startedAt',
    duration: 'duration',
    environment: 'environment',
    gitSha: 'gitSha',
  };

  return (
    <div data-slot="run-operational-table" className="space-y-3">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <label className="min-w-0 flex-1">
          <span className="sr-only">{copy.runTableSearchLabel}</span>
          <input
            name="run-query-filter"
            value={filters.query}
            onChange={(event) => onFiltersChange({ ...filters, query: event.target.value })}
            placeholder={copy.runTableSearchPlaceholder}
            className="h-9 w-full rounded border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100"
          />
        </label>
        <select
          name="run-status-filter"
          value={filters.status}
          onChange={(event) =>
            onFiltersChange({
              ...filters,
              status: event.target.value as RunOperationalTableFilters['status'],
            })
          }
          className="h-9 rounded border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100"
        >
          <option value="all">{copy.runTableAllStatuses}</option>
          <option value="pending">pending</option>
          <option value="running">running</option>
          <option value="completed">completed</option>
          <option value="failed">failed</option>
          <option value="cancelled">cancelled</option>
        </select>
      </div>

      {isLoading ? (
        <p className={cn('text-sm', routeWorkbenchMutedTextClassName)}>{copy.loadingRuns}</p>
      ) : null}

      <Table className="min-w-[760px]">
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const sortableColumn = sortableHeaders[header.column.id];
                return (
                  <TableHead key={header.id}>
                    {sortableColumn ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-1"
                        onClick={() => onSortChange(nextSort(sort, sortableColumn))}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        <ArrowUpDown className="ml-1 size-3" aria-hidden="true" />
                      </Button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length > 0 ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="text-slate-400">
                {copy.runTableEmptyFiltered}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
