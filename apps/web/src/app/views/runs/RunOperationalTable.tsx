/**
 * Owned concern: render the Runs dense operational table with TanStack Table
 * while delegating row, filter, sort, and route semantics to local models.
 */
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router';

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
import { getRunStatusTone } from './runStatesModel';
import {
  type RunOperationalRow,
  type RunOperationalSortColumn,
  type RunOperationalTableFilters,
  type RunOperationalTableSort,
} from './runOperationalTableModel';
import { useRunStatesCopy } from './runStatesCopy';
import type { RunControlCommandController } from './useRunControlCommands';
import styles from './RunOperationalTable.module.css';

type RunOperationalTableProps = {
  rows: RunOperationalRow[];
  filters: RunOperationalTableFilters;
  sort: RunOperationalTableSort;
  onFiltersChange: (filters: RunOperationalTableFilters) => void;
  onSortChange: (sort: RunOperationalTableSort) => void;
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
  runControls,
  isLoading,
}: RunOperationalTableProps) {
  const { copy } = useRunStatesCopy();
  const columns = useMemo<ColumnDef<RunOperationalRow>[]>(
    () => [
      {
        accessorKey: 'runId',
        header: copy.runTableHeaders.runId,
        cell: ({ row }) => (
          <div className={styles.identity}>
            <Link className={styles.runLink} to={`/runs/${encodeURIComponent(row.original.runId)}`}>
              {row.original.runId}
            </Link>
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
        cell: ({ row }) => <span className={styles.identifier}>{row.original.gitSha ?? '-'}</span>,
      },
      {
        accessorKey: 'status',
        header: copy.runTableHeaders.status,
        cell: ({ row }) => (
          <div className={styles.status}>
            <Badge className={cn(getRunStatusTone(row.original.status), styles.statusBadge)}>
              {copy.statusLabels[row.original.status]}
            </Badge>
            {row.original.substatus ? (
              <Badge variant="outline" className={styles.statusBadge}>
                {row.original.substatus}
              </Badge>
            ) : null}
          </div>
        ),
      },
    ],
    [copy, runControls]
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
    <div data-slot="run-operational-table" className={styles.surface}>
      <div className={styles.filters}>
        <label className={styles.search}>
          <span className="sr-only">{copy.runTableSearchLabel}</span>
          <input
            name="run-query-filter"
            value={filters.query}
            onChange={(event) => onFiltersChange({ ...filters, query: event.target.value })}
            placeholder={copy.runTableSearchPlaceholder}
            className={cn(routeWorkbenchDenseTableClasses.field, styles.field)}
          />
        </label>
        <select
          name="run-status-filter"
          aria-label={copy.runTableStatusFilterLabel}
          value={filters.status}
          onChange={(event) =>
            onFiltersChange({
              ...filters,
              status: event.target.value as RunOperationalTableFilters['status'],
            })
          }
          className={cn(routeWorkbenchDenseTableClasses.field, styles.field)}
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

      {isLoading ? <p className={styles.loading}>{copy.loadingRuns}</p> : null}

      <Table className={styles.table}>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const sortableColumn = sortableHeaders[header.column.id];
                return (
                  <TableHead
                    key={header.id}
                    scope="col"
                    data-column={header.column.id}
                    className={styles.heading}
                    aria-sort={
                      sortableColumn === sort.columnId
                        ? sort.direction === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : undefined
                    }
                  >
                    {sortableColumn ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className={styles.sortButton}
                        onClick={() => onSortChange(nextSort(sort, sortableColumn))}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        <ArrowUpDown className={styles.sortIcon} aria-hidden="true" />
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
                  <TableCell key={cell.id} data-column={cell.column.id} className={styles.cell}>
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
