import { Table } from 'lucide-react';

import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import type {
  SourceImportCatalogViewModel,
  SourceImportTableViewModel,
} from './sourceImportWizardModel';

type SourceImportCatalogViewProps = Readonly<{
  catalog: SourceImportCatalogViewModel;
  emptyLabel: string;
  onToggleSchema: (schema: string) => void;
  onToggleTable: (index: number) => void;
}>;

type SourceImportTableCardProps = Readonly<{
  table: SourceImportTableViewModel;
  onToggleTable: (index: number) => void;
}>;

function SourceImportTableColumns({
  table,
}: Readonly<{ table: SourceImportTableViewModel }>): JSX.Element | null {
  if (table.columns.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 grid gap-1">
      {table.columns.slice(0, 4).map((column) => (
        <div
          key={`${table.canonicalName}.${column.name}`}
          className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 rounded border border-slate-800 bg-slate-950/60 px-2 py-1.5"
        >
          <span className="truncate font-mono text-xs text-slate-100">{column.name}</span>
          <span className="font-mono text-[11px] text-slate-300">{column.type}</span>
          <span className="text-[11px] text-slate-400">{column.nullabilityLabel}</span>
        </div>
      ))}
    </div>
  );
}

function SourceImportTableCard({ table, onToggleTable }: SourceImportTableCardProps): JSX.Element {
  return (
    <div
      data-source-import-table={table.canonicalName}
      className="cursor-pointer rounded border border-slate-700 bg-slate-950/30 p-3 hover:bg-slate-950"
      onClick={() => onToggleTable(table.index)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          <Checkbox
            checked={table.selected}
            onClick={(event) => {
              event.stopPropagation();
              onToggleTable(table.index);
            }}
          />
          <Table className="mt-0.5 size-4 shrink-0 text-slate-300" />
          <div className="min-w-0">
            <span className="block truncate font-mono text-sm">{table.displayName}</span>
            <span className="block truncate font-mono text-xs text-slate-400">
              {table.canonicalName}
            </span>
          </div>
        </div>
        <div className="shrink-0 text-right text-xs text-slate-400">
          <div>{table.rowCountLabel}</div>
          <div>{table.columnCountLabel}</div>
        </div>
      </div>
      <SourceImportTableColumns table={table} />
    </div>
  );
}

export function SourceImportCatalogView({
  catalog,
  emptyLabel,
  onToggleSchema,
  onToggleTable,
}: SourceImportCatalogViewProps): JSX.Element {
  if (catalog.schemaGroups.length === 0) {
    return <Card className="border-slate-600 p-4 text-sm text-slate-300">{emptyLabel}</Card>;
  }

  return (
    <div className="space-y-4">
      {catalog.schemaGroups.map((schemaGroup) => (
        <div key={schemaGroup.schema}>
          <div
            role="button"
            tabIndex={0}
            data-source-import-schema={schemaGroup.schema}
            className="mb-2 flex items-center gap-2"
            onClick={() => onToggleSchema(schemaGroup.schema)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onToggleSchema(schemaGroup.schema);
              }
            }}
          >
            <Checkbox checked={schemaGroup.selected} />
            <h4 className="text-sm font-medium">{schemaGroup.schema}</h4>
            <Badge variant="secondary" className="text-xs">
              {schemaGroup.tableCountLabel}
            </Badge>
          </div>
          <div className="ml-6 space-y-1">
            {schemaGroup.tables.map((table) => (
              <SourceImportTableCard
                key={table.canonicalName}
                table={table}
                onToggleTable={onToggleTable}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
