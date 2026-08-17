/**
 * Owned concern: render the Runs dense operational table with TanStack Table
 * while delegating row, filter, sort, and route semantics to local models.
 */
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown } from 'lucide-react';
import { useMemo } from 'react';

import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { RunControlActions } from '../../components/runs/RunControlActions';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { cn } from '../../components/ui/utils';
import { routeWorkbenchDenseTableClasses } from '../../components/workbench/routeWorkbenchTableTokens';
import { routeWorkbenchMutedTextClassName } from '../../components/workbench/RouteWorkbenchFrame';
import { getRunStatusTone } from './runStatesModel';
import {
  type RunOperationalRow,
  type RunOperationalSortColumn,
  type RunOperationalTableFilters,
  type RunOperationalTableSort,
} from './runOperationalTableModel';
import { useRunStatesCopy } from './runStatesCopy';
import type { RunControlCommandController } from './useRunControlCommands';

type RunOperationalTableProps = {
  rows: RunOperationalRow[];
  filters: RunOperationalTableFilters;
  sort: RunOperationalTableSort;
  onFiltersChange: (filters: RunOperationalTableFilters) => void;
  onSortChange: (sort: RunOperationalTableSort) => void;
  onOpenRun: (runId: string) => void;
  runControls?: RunControlCommandController;
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
  runControls,
  isLoading,
}: RunOperationalTableProps) {
  const { copy } = useRunStatesCopy();
  const columns = useMemo<ColumnDef<RunOperationalRow>[]>(
    () => [
      {
        accessorKey: 'runId',
        header: copy.runTableHeaders.runId,
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.runId}</span>,
      },
      {
        accessorKey: 'status',
        header: copy.runTableHeaders.status,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Badge className={cn(getRunStatusTone(row.original.status))}>
              {copy.statusLabels[row.original.status]}
            </Badge>
            {row.original.substatus ? (
              <Badge variant="outline">{row.original.substatus}</Badge>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: 'startedAt',
        header: copy.runTableHeaders.started,
        cell: ({ row }) => row.original.startedAtLabel,
      },
      {
        accessorKey: 'duration',
        header: copy.runTableHeaders.duration,
        cell: ({ row }) => row.original.durationLabel,
      },
      {
        accessorKey: 'environment',
        header: copy.runTableHeaders.environment,
        cell: ({ row }) => row.original.environment ?? '-',
      },
      {
        accessorKey: 'gitSha',
        header: copy.runTableHeaders.gitSha,
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.gitSha ?? '-'}</span>,
      },
      {
        id: 'action',
        header: '',
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenRun(row.original.runId)}>
              {copy.viewDetails}
            </Button>
            {runControls ? (
              <RunControlActions
                runId={row.original.runId}
                availability={row.original.controls}
                activity={runControls.activity}
                outcome={runControls.outcome}
                failure={runControls.failure}
                onCancel={() => runControls.cancelRun(row.original.runId)}
                onRecover={() => runControls.recoverRun(row.original.runId)}
              />
            ) : null}
          </div>
        ),
      },
    ],
    [copy, onOpenRun, runControls]
  );
  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.runId,
  });
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
            className={cn(routeWorkbenchDenseTableClasses.field, 'w-full')}
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
          className={routeWorkbenchDenseTableClasses.field}
        >
          <option value="all">{copy.runTableAllStatuses}</option>
          <option value="pending">{copy.statusLabels.pending}</option>
          <option value="running">{copy.statusLabels.running}</option>
          <option value="completed">{copy.statusLabels.completed}</option>
          <option value="failed">{copy.statusLabels.failed}</option>
          <option value="cancelled">{copy.statusLabels.cancelled}</option>
          <option value="unknown">{copy.statusLabels.unknown}</option>
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
          ) : !isLoading ? (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className={routeWorkbenchDenseTableClasses.emptyCell}
              >
                {copy.runTableEmptyFiltered}
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </div>
  );
}
