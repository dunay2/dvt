/**
 * Owned concern: render run event chronology as a dense table while shared
 * event presentation models own severity, headline, detail, and step semantics.
 */
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table';
import { useMemo } from 'react';

import { Badge } from '../../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import type { RunEvent } from '../../types/engine';
import { buildRunEventTableRows, type RunEventTableRow } from './runEventTableModel';

type RunEventTimelineTableProps = {
  events: RunEvent[];
};

function levelTone(level: string): string {
  if (level === 'ERROR') {
    return 'bg-red-600';
  }
  if (level === 'WARN') {
    return 'bg-yellow-600 text-slate-950';
  }
  if (level === 'SUCCESS') {
    return 'bg-green-600';
  }
  return 'bg-blue-600';
}

export function RunEventTimelineTable({ events }: RunEventTimelineTableProps) {
  const rows = useMemo(() => buildRunEventTableRows(events), [events]);
  const columns = useMemo<ColumnDef<RunEventTableRow>[]>(
    () => [
      {
        accessorKey: 'runSeq',
        header: '#',
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.runSeq}</span>,
      },
      {
        accessorKey: 'level',
        header: 'Level',
        cell: ({ row }) => (
          <Badge className={levelTone(row.original.level)}>{row.original.level}</Badge>
        ),
      },
      {
        accessorKey: 'emittedAt',
        header: 'Emitted',
        cell: ({ row }) => row.original.emittedAtLabel,
      },
      {
        accessorKey: 'headline',
        header: 'Event',
        cell: ({ row }) => (
          <div className="min-w-[16rem]">
            <div>{row.original.headline}</div>
            {row.original.detail ? (
              <div className="mt-1 text-xs text-slate-400">{row.original.detail}</div>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: 'stepId',
        header: 'Step',
        cell: ({ row }) =>
          row.original.stepId ? (
            <span className="font-mono text-xs">{row.original.stepId}</span>
          ) : (
            <span className="text-slate-500">-</span>
          ),
      },
      {
        accessorKey: 'eventType',
        header: 'Type',
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.eventType}</span>,
      },
    ],
    []
  );
  const table = useReactTable({ data: rows, columns, getCoreRowModel: getCoreRowModel() });

  return (
    <div data-slot="run-event-timeline-table">
      <Table className="min-w-[760px]">
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
