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
  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-2 text-lg font-medium">{copy.selection.title}</h3>
        <p className="mb-4 text-sm text-slate-300">
          {copy.selection.descriptionPrefix} {selectedCount}
        </p>
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
              <Card className="border-slate-600 p-4 text-sm text-slate-300">{copy.selection.empty}</Card>
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
                          className="flex cursor-pointer items-center justify-between rounded p-2 hover:bg-slate-950"
                          onClick={() => onToggleTable(globalIndex)}
                        >
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={table.selected}
                              onCheckedChange={() => onToggleTable(globalIndex)}
                            />
                            <Table className="size-4 text-slate-300" />
                            <span className="font-mono text-sm">{table.table}</span>
                          </div>
                          {table.rowCount ? (
                            <span className="text-xs text-slate-400">
                              {table.rowCount.toLocaleString()} {copy.selection.rowsSuffix}
                            </span>
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
