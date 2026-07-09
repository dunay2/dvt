/** Owned concern: present Add Source catalog structure without owning selection state. */
import { Table } from 'lucide-react';
import type { ReactNode } from 'react';

import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import type {
  SourceImportCatalogFilterId,
  SourceImportCatalogFilterViewModel,
  SourceImportTableViewModel,
} from './sourceImportCatalogModel';

export const sourceImportCatalogClassNames = {
  emptyState: 'border-slate-600 p-4 text-sm text-slate-300',
  schemaGroups: 'space-y-4',
  databaseGroup: 'space-y-3',
  databaseHeader:
    'rounded border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm text-slate-100',
  databaseHeaderContent: 'flex items-center justify-between gap-3',
  databaseIdentity: 'flex min-w-0 items-center gap-2',
  databaseTitle: 'font-mono font-medium',
  databaseMetrics: 'flex flex-wrap justify-end gap-2 text-xs text-slate-400',
  filterList: 'flex flex-wrap gap-2',
  filterButton:
    'rounded border border-slate-700 bg-slate-950/50 px-2.5 py-1 text-xs text-slate-300 transition hover:border-sky-500 hover:text-slate-100 disabled:cursor-not-allowed disabled:opacity-40',
  activeFilterButton: 'border-sky-400 bg-sky-950/40 text-sky-100',
  filterCount: 'ml-1 text-slate-500',
  schemaHeader: 'mb-2 flex items-center gap-2',
  schemaTitle: 'text-sm font-medium',
  schemaTableList: 'ml-6 space-y-1',
  tableCard:
    'cursor-pointer rounded border border-slate-700 bg-slate-950/30 p-3 outline-none hover:bg-slate-950 focus-visible:border-sky-400 focus-visible:ring-2 focus-visible:ring-sky-400/40',
  selectedTableCard: 'border-sky-400 bg-sky-950/30 shadow-[0_0_0_1px_rgba(56,189,248,0.35)]',
  tableHeader: 'flex items-start justify-between gap-3',
  tableIdentity: 'flex min-w-0 items-start gap-2',
  tableIcon: 'mt-0.5 size-4 shrink-0 text-slate-300',
  tableNameBlock: 'min-w-0',
  tableName: 'block truncate font-mono text-sm',
  tableCanonicalName: 'block truncate font-mono text-xs text-slate-400',
  tableMetrics: 'shrink-0 text-right text-xs text-slate-400',
  columnList: 'mt-3 grid gap-1',
  columnRow:
    'grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 rounded border border-slate-800 bg-slate-950/60 px-2 py-1.5',
  columnName: 'truncate font-mono text-xs text-slate-100',
  columnType: 'font-mono text-[11px] text-slate-300',
  columnNullability: 'text-[11px] text-slate-400',
} as const;

type SourceImportSchemaHeaderProps = Readonly<{
  schema: string;
  accessibilityLabel: string;
  schemaIdentityKey: string;
  selected: boolean;
  tableCountLabel: string;
  onToggle: () => void;
}>;

type SourceImportDatabaseHeaderProps = Readonly<{
  database: string;
  accessibilityLabel: string;
  schemaCountLabel: string;
  tableCountLabel: string;
  selected: boolean;
  selectedLabel: string | null;
  onToggle: () => void;
}>;

type SourceImportTableCardProps = Readonly<{
  table: SourceImportTableViewModel;
  onActivate: () => void;
  onToggle: () => void;
}>;

type SourceImportCatalogFilterListProps = Readonly<{
  label: string;
  filters: readonly SourceImportCatalogFilterViewModel[];
  onSelectFilter: (filterId: SourceImportCatalogFilterId) => void;
}>;

export function SourceImportCatalogEmptyState({
  children,
}: Readonly<{ children: string }>): JSX.Element {
  return <Card className={sourceImportCatalogClassNames.emptyState}>{children}</Card>;
}

export function SourceImportSchemaGroups({
  children,
}: Readonly<{ children: ReactNode }>): JSX.Element {
  return <div className={sourceImportCatalogClassNames.schemaGroups}>{children}</div>;
}

export function SourceImportDatabaseGroup({
  children,
}: Readonly<{ children: ReactNode }>): JSX.Element {
  return <div className={sourceImportCatalogClassNames.databaseGroup}>{children}</div>;
}

export function SourceImportCatalogFilterList({
  label,
  filters,
  onSelectFilter,
}: SourceImportCatalogFilterListProps): JSX.Element {
  return (
    <div className={sourceImportCatalogClassNames.filterList} aria-label={label}>
      {filters.map((filter) => {
        const className = filter.active
          ? `${sourceImportCatalogClassNames.filterButton} ${sourceImportCatalogClassNames.activeFilterButton}`
          : sourceImportCatalogClassNames.filterButton;

        return (
          <button
            key={filter.id}
            type="button"
            aria-label={filter.accessibilityLabel}
            aria-pressed={filter.active}
            data-source-import-catalog-filter={filter.id}
            className={className}
            disabled={filter.disabled}
            onClick={() => onSelectFilter(filter.id)}
          >
            {filter.label}
            <span className={sourceImportCatalogClassNames.filterCount}>{filter.countLabel}</span>
          </button>
        );
      })}
    </div>
  );
}

export function SourceImportDatabaseHeader({
  database,
  accessibilityLabel,
  schemaCountLabel,
  tableCountLabel,
  selected,
  selectedLabel,
  onToggle,
}: SourceImportDatabaseHeaderProps): JSX.Element {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={accessibilityLabel}
      data-source-import-database={database}
      className={sourceImportCatalogClassNames.databaseHeader}
      onClick={onToggle}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onToggle();
        }
      }}
    >
      <div className={sourceImportCatalogClassNames.databaseHeaderContent}>
        <span className={sourceImportCatalogClassNames.databaseIdentity}>
          <Checkbox checked={selected} />
          <span className={sourceImportCatalogClassNames.databaseTitle}>{database}</span>
        </span>
        <span className={sourceImportCatalogClassNames.databaseMetrics}>
          <Badge variant="secondary">{schemaCountLabel}</Badge>
          <Badge variant="secondary">{tableCountLabel}</Badge>
          {selectedLabel ? <Badge variant="outline">{selectedLabel}</Badge> : null}
        </span>
      </div>
    </div>
  );
}

export function SourceImportSchemaHeader({
  schema,
  accessibilityLabel,
  schemaIdentityKey,
  selected,
  tableCountLabel,
  onToggle,
}: SourceImportSchemaHeaderProps): JSX.Element {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={accessibilityLabel}
      data-source-import-schema={schemaIdentityKey}
      className={sourceImportCatalogClassNames.schemaHeader}
      onClick={onToggle}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onToggle();
        }
      }}
    >
      <Checkbox checked={selected} />
      <h4 className={sourceImportCatalogClassNames.schemaTitle}>{schema}</h4>
      <Badge variant="secondary" className="text-xs">
        {tableCountLabel}
      </Badge>
    </div>
  );
}

export function SourceImportSchemaTableList({
  children,
}: Readonly<{ children: ReactNode }>): JSX.Element {
  return <div className={sourceImportCatalogClassNames.schemaTableList}>{children}</div>;
}

export function SourceImportColumnPreviewList({
  table,
}: Readonly<{ table: SourceImportTableViewModel }>): JSX.Element | null {
  if (table.columns.length === 0) {
    return null;
  }

  return (
    <div className={sourceImportCatalogClassNames.columnList}>
      {table.columns.slice(0, 4).map((column) => (
        <div
          key={`${table.identityKey}.${column.name}`}
          className={sourceImportCatalogClassNames.columnRow}
        >
          <span className={sourceImportCatalogClassNames.columnName}>{column.name}</span>
          <span className={sourceImportCatalogClassNames.columnType}>{column.type}</span>
          <span className={sourceImportCatalogClassNames.columnNullability}>
            {column.nullabilityLabel}
          </span>
        </div>
      ))}
    </div>
  );
}

export function SourceImportTableCard({
  table,
  onActivate,
  onToggle,
}: SourceImportTableCardProps): JSX.Element {
  const tableCardClassName = table.selected
    ? `${sourceImportCatalogClassNames.tableCard} ${sourceImportCatalogClassNames.selectedTableCard}`
    : sourceImportCatalogClassNames.tableCard;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={table.inspectionAccessibilityLabel}
      data-source-import-table={table.canonicalName}
      className={tableCardClassName}
      onClick={onActivate}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onActivate();
        }
      }}
    >
      <div className={sourceImportCatalogClassNames.tableHeader}>
        <div className={sourceImportCatalogClassNames.tableIdentity}>
          <Checkbox
            aria-label={table.accessibilityLabel}
            data-source-import-table-select={table.canonicalName}
            checked={table.selected}
            onClick={(event) => {
              event.stopPropagation();
              onToggle();
            }}
          />
          <Table className={sourceImportCatalogClassNames.tableIcon} />
          <div className={sourceImportCatalogClassNames.tableNameBlock}>
            <span className={sourceImportCatalogClassNames.tableName}>{table.displayName}</span>
            <span className={sourceImportCatalogClassNames.tableCanonicalName}>
              {table.canonicalName}
            </span>
          </div>
        </div>
        <div className={sourceImportCatalogClassNames.tableMetrics}>
          {table.selected ? <Badge variant="outline">{table.selectedLabel}</Badge> : null}
          <div>{table.rowCountLabel}</div>
          {table.byteSizeLabel == null ? null : <div>{table.byteSizeLabel}</div>}
          <div>{table.columnCountLabel}</div>
        </div>
      </div>
      <SourceImportColumnPreviewList table={table} />
    </div>
  );
}
