/** Owned concern: present Add Source catalog structure without owning selection state. */
import { Database, FileJson, Globe2, RadioTower, Table2, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import type {
  SourceImportCatalogFilterId,
  SourceImportCatalogFilterViewModel,
  SourceImportLocatorGroupViewModel,
  SourceImportObjectViewModel,
} from './sourceImportCatalogModel';

export const sourceImportCatalogClassNames = {
  emptyState: 'border-slate-600 p-4 text-sm text-slate-300',
  groups: 'space-y-4',
  group: 'space-y-3',
  groupHeader: 'rounded border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm text-slate-100',
  groupHeaderContent: 'flex items-center justify-between gap-3',
  groupIdentity: 'flex min-w-0 items-center gap-2',
  groupTitle: 'font-mono font-medium',
  groupMetrics: 'flex flex-wrap justify-end gap-2 text-xs text-slate-400',
  filterList: 'flex flex-wrap gap-2',
  filterButton:
    'rounded border border-slate-700 bg-slate-950/50 px-2.5 py-1 text-xs text-slate-300 transition hover:border-sky-500 hover:text-slate-100 disabled:cursor-not-allowed disabled:opacity-40',
  activeFilterButton: 'border-sky-400 bg-sky-950/40 text-sky-100',
  filterCount: 'ml-1 text-slate-500',
  schemaHeader: 'mb-2 flex items-center gap-2',
  schemaTitle: 'text-sm font-medium',
  objectList: 'ml-6 space-y-1',
  objectCard:
    'rounded border border-slate-700 bg-slate-950/30 px-2.5 py-2 outline-none hover:bg-slate-950 focus-visible:border-sky-400 focus-visible:ring-2 focus-visible:ring-sky-400/40',
  selectedObjectCard: 'border-sky-400 bg-sky-950/30 shadow-[0_0_0_1px_rgba(56,189,248,0.35)]',
  objectHeader: 'flex items-center justify-between gap-2',
  objectIdentity: 'flex min-w-0 items-center gap-2',
  objectInspectButton:
    'flex min-w-0 cursor-pointer items-center gap-2 rounded text-left outline-none focus-visible:ring-2 focus-visible:ring-sky-400/40',
  objectIcon: 'size-4 shrink-0 text-slate-300',
  objectNameBlock: 'min-w-0',
  objectName: 'block truncate font-mono text-sm',
  objectCanonicalName: 'block truncate font-mono text-xs text-slate-400',
  importability: 'mt-2 text-[11px] leading-4 text-amber-300',
} as const;

const sourceObjectIconByKind: Readonly<
  Record<SourceImportObjectViewModel['locatorKind'], LucideIcon>
> = {
  relation: Table2,
  file: FileJson,
  endpoint: Globe2,
  stream: RadioTower,
};

type SourceImportSchemaHeaderProps = Readonly<{
  schema: string;
  accessibilityLabel: string;
  schemaIdentityKey: string;
  selected: boolean;
  objectCountLabel: string;
  onToggle: () => void;
}>;

type SourceImportDatabaseHeaderProps = Readonly<{
  database: string;
  accessibilityLabel: string;
  schemaCountLabel: string;
  objectCountLabel: string;
  selected: boolean;
  selectedLabel: string | null;
  onToggle: () => void;
}>;

type SourceImportObjectCardProps = Readonly<{
  sourceObject: SourceImportObjectViewModel;
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

export function SourceImportCatalogGroups({
  children,
}: Readonly<{ children: ReactNode }>): JSX.Element {
  return <div className={sourceImportCatalogClassNames.groups}>{children}</div>;
}

export function SourceImportCatalogGroup({
  children,
}: Readonly<{ children: ReactNode }>): JSX.Element {
  return <div className={sourceImportCatalogClassNames.group}>{children}</div>;
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
  objectCountLabel,
  selected,
  selectedLabel,
  onToggle,
}: SourceImportDatabaseHeaderProps): JSX.Element {
  return (
    <div
      data-source-import-database={database}
      className={sourceImportCatalogClassNames.groupHeader}
    >
      <div className={sourceImportCatalogClassNames.groupHeaderContent}>
        <span className={sourceImportCatalogClassNames.groupIdentity}>
          <Checkbox aria-label={accessibilityLabel} checked={selected} onCheckedChange={onToggle} />
          <Database className={sourceImportCatalogClassNames.objectIcon} aria-hidden="true" />
          <span className={sourceImportCatalogClassNames.groupTitle}>{database}</span>
        </span>
        <span className={sourceImportCatalogClassNames.groupMetrics}>
          <Badge variant="secondary">{schemaCountLabel}</Badge>
          <Badge variant="secondary">{objectCountLabel}</Badge>
          {selectedLabel ? <Badge variant="outline">{selectedLabel}</Badge> : null}
        </span>
      </div>
    </div>
  );
}

export function SourceImportLocatorGroup({
  group,
  children,
}: Readonly<{
  group: SourceImportLocatorGroupViewModel;
  children: ReactNode;
}>): JSX.Element {
  const Icon = sourceObjectIconByKind[group.locatorKind];
  return (
    <SourceImportCatalogGroup>
      <div
        data-source-import-locator-kind={group.locatorKind}
        className={sourceImportCatalogClassNames.groupHeader}
      >
        <div className={sourceImportCatalogClassNames.groupHeaderContent}>
          <span className={sourceImportCatalogClassNames.groupIdentity}>
            <Icon className={sourceImportCatalogClassNames.objectIcon} aria-hidden="true" />
            <span className={sourceImportCatalogClassNames.groupTitle}>{group.label}</span>
          </span>
          <Badge variant="secondary">{group.objectCountLabel}</Badge>
        </div>
      </div>
      {children}
    </SourceImportCatalogGroup>
  );
}

export function SourceImportSchemaHeader({
  schema,
  accessibilityLabel,
  schemaIdentityKey,
  selected,
  objectCountLabel,
  onToggle,
}: SourceImportSchemaHeaderProps): JSX.Element {
  return (
    <div
      data-source-import-schema={schemaIdentityKey}
      className={sourceImportCatalogClassNames.schemaHeader}
    >
      <Checkbox aria-label={accessibilityLabel} checked={selected} onCheckedChange={onToggle} />
      <h4 className={sourceImportCatalogClassNames.schemaTitle}>{schema}</h4>
      <Badge variant="secondary" className="text-xs">
        {objectCountLabel}
      </Badge>
    </div>
  );
}

export function SourceImportObjectList({
  children,
}: Readonly<{ children: ReactNode }>): JSX.Element {
  return <div className={sourceImportCatalogClassNames.objectList}>{children}</div>;
}

export function SourceImportObjectCard({
  sourceObject,
  onActivate,
  onToggle,
}: SourceImportObjectCardProps): JSX.Element {
  const Icon = sourceObjectIconByKind[sourceObject.locatorKind];
  const objectCardClassName = sourceObject.selected
    ? `${sourceImportCatalogClassNames.objectCard} ${sourceImportCatalogClassNames.selectedObjectCard}`
    : sourceImportCatalogClassNames.objectCard;

  return (
    <article data-source-import-object={sourceObject.identityKey} className={objectCardClassName}>
      <div className={sourceImportCatalogClassNames.objectHeader}>
        <div className={sourceImportCatalogClassNames.objectIdentity}>
          <Checkbox
            aria-label={sourceObject.accessibilityLabel}
            data-source-import-object-select={sourceObject.identityKey}
            checked={sourceObject.selected}
            disabled={!sourceObject.selectable}
            onCheckedChange={onToggle}
          />
          <button
            type="button"
            aria-label={sourceObject.inspectionAccessibilityLabel}
            className={sourceImportCatalogClassNames.objectInspectButton}
            onClick={onActivate}
          >
            <Icon className={sourceImportCatalogClassNames.objectIcon} aria-hidden="true" />
            <span className={sourceImportCatalogClassNames.objectNameBlock}>
              <span className={sourceImportCatalogClassNames.objectName}>
                {sourceObject.displayName}
              </span>
              <span className={sourceImportCatalogClassNames.objectCanonicalName}>
                {sourceObject.canonicalName}
              </span>
            </span>
          </button>
        </div>
      </div>
      {sourceObject.importabilityLabel ? (
        <p className={sourceImportCatalogClassNames.importability}>
          {sourceObject.importabilityLabel}
        </p>
      ) : null}
    </article>
  );
}
