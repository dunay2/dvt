import { Loader2, Table } from 'lucide-react';

import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import { ScrollArea } from '../ui/scroll-area';
import { sourceImportWizardCopy as copy } from './copy';
import { groupTablesBySchema } from './sourceImportWizardModel';
import type { TableInfo } from './types';

interface SelectionStepProps {
  tables: TableInfo[];
  selectedCount: number;
  isLoadingTables: boolean;
  loadError: string | null;
  onToggleSchema: (schema: string) => void;
  onToggleTable: (index: number) => void;
}

export function SelectionStep({
  tables,
  selectedCount,
  isLoadingTables,
  loadError,
  onToggleSchema,
  onToggleTable,
}: SelectionStepProps) {
  const schemaGroups = groupTablesBySchema(tables);
  const formatTableName = (table: Pick<TableInfo, 'database' | 'schema' | 'table'>): string =>
    `${table.database}.${table.schema}.${table.table}`;
  const formatRowCount = (rowCount: number | undefined): string => {
    if (rowCount == null) {
      return 'Rows unknown';
    }

    return `${new Intl.NumberFormat('en-US').format(rowCount)} ${copy.selection.rowsSuffix}`;
  };
  const formatColumnCount = (table: Pick<TableInfo, 'columns'>): string => {
    const columnCount = table.columns?.length ?? 0;
    return `${columnCount} ${columnCount === 1 ? 'column' : 'columns'}`;
  };
  const formatColumnNullability = (nullable: boolean): string =>
    nullable ? 'Nullable' : 'Required';

  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-2 text-lg font-medium">{copy.selection.title}</h3>
        <p className="mb-4 text-sm text-slate-300">
          {copy.selection.descriptionPrefix} {selectedCount}
        </p>
        <div className="rounded border border-amber-800/70 bg-amber-950/20 px-3 py-2 text-xs text-amber-100/80">
          Destination is configured on a DVT Sink node after origin registration; choose the output
          target template from Insert and verify schema/table in the inspector.
        </div>
      </div>

      {loadError ? (
        <Card className="border-red-700 bg-red-950/30 p-3 text-sm text-red-200">{loadError}</Card>
      ) : null}

      {isLoadingTables ? (
        <Card className="flex items-center gap-3 border-slate-600 p-4 text-slate-300">
          <Loader2 className="size-4 animate-spin" />
          {copy.selection.loading}
        </Card>
      ) : (
        <ScrollArea className="h-96">
          <div className="space-y-4">
            {Object.entries(schemaGroups).length === 0 ? (
              <Card className="border-slate-600 p-4 text-sm text-slate-300">
                {copy.selection.empty}
              </Card>
            ) : (
              Object.entries(schemaGroups).map(([schema, schemaTables]) => (
                <div key={schema}>
                  <div className="mb-2 flex items-center gap-2">
                    <Checkbox
                      checked={schemaTables.every((table) => table.selected)}
                      onCheckedChange={() => onToggleSchema(schema)}
                    />
                    <h4 className="text-sm font-medium">{schema}</h4>
                    <Badge variant="secondary" className="text-xs">
                      {schemaTables.length}
                    </Badge>
                  </div>
                  <div className="ml-6 space-y-1">
                    {schemaTables.map((table) => {
                      const globalIndex = tables.findIndex(
                        (candidate) =>
                          candidate.database === table.database &&
                          candidate.schema === table.schema &&
                          candidate.table === table.table
                      );
                      return (
                        <div
                          key={`${table.database}.${table.schema}.${table.table}`}
                          data-source-import-table={formatTableName(table)}
                          className="cursor-pointer rounded border border-slate-700 bg-slate-950/30 p-3 hover:bg-slate-950"
                          onClick={() => onToggleTable(globalIndex)}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-start gap-2">
                              <Checkbox
                                checked={table.selected}
                                onCheckedChange={() => onToggleTable(globalIndex)}
                              />
                              <Table className="mt-0.5 size-4 shrink-0 text-slate-300" />
                              <div className="min-w-0">
                                <span className="block truncate font-mono text-sm">
                                  {table.table}
                                </span>
                                <span className="block truncate font-mono text-xs text-slate-400">
                                  {formatTableName(table)}
                                </span>
                              </div>
                            </div>
                            <div className="shrink-0 text-right text-xs text-slate-400">
                              <div>{formatRowCount(table.rowCount)}</div>
                              <div>{formatColumnCount(table)}</div>
                            </div>
                          </div>
                          {table.columns && table.columns.length > 0 ? (
                            <div className="mt-3 grid gap-1">
                              {table.columns.slice(0, 4).map((column) => (
                                <div
                                  key={`${formatTableName(table)}.${column.name}`}
                                  className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 rounded border border-slate-800 bg-slate-950/60 px-2 py-1.5"
                                >
                                  <span className="truncate font-mono text-xs text-slate-100">
                                    {column.name}
                                  </span>
                                  <span className="font-mono text-[11px] text-slate-300">
                                    {column.type}
                                  </span>
                                  <span className="text-[11px] text-slate-400">
                                    {formatColumnNullability(column.nullable)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
