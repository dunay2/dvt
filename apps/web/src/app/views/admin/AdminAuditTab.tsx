import { FileText, Search } from 'lucide-react';
import type { AuditLogEntry } from '../../types/dbt';
import { Badge } from '../../components/ui/badge';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { cn } from '../../components/ui/utils';
import { adminViewCopy as copy } from './copy';

type AuditTabProps = {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  entries: AuditLogEntry[];
};

export function AdminAuditTab({
  searchQuery,
  onSearchQueryChange,
  entries,
}: Readonly<AuditTabProps>) {
  return (
    <div className="mt-6">
      <div className="mb-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-300" />
          <Input
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            placeholder={copy.filters.auditPlaceholder}
            className="border-slate-600 bg-slate-950 pl-10"
          />
        </div>
      </div>

      <Card className="border-slate-700 bg-slate-900">
        <div className="p-2">
          <div className="mb-2 flex items-center gap-2 px-3 pt-2">
            <FileText className="size-4 text-violet-400" />
            <span className="text-xs uppercase tracking-wide text-slate-400">
              {copy.tabs.audit}
            </span>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="border-slate-700">
                <TableHead className="text-white">{copy.labels.timestamp}</TableHead>
                <TableHead className="text-white">{copy.labels.user}</TableHead>
                <TableHead className="text-white">{copy.labels.action}</TableHead>
                <TableHead className="text-white">{copy.labels.resource}</TableHead>
                <TableHead className="text-white">{copy.labels.details}</TableHead>
                <TableHead className="text-white">{copy.labels.status}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id} className="border-slate-700">
                  <TableCell className="font-mono text-xs text-slate-300">
                    {new Date(entry.timestamp).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-sm">{entry.user}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {entry.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{entry.resource}</TableCell>
                  <TableCell className="max-w-md truncate text-sm text-slate-300">
                    {entry.details}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={cn(
                        entry.status === 'success' && 'bg-green-600',
                        entry.status === 'failed' && 'bg-red-600'
                      )}
                    >
                      {entry.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
