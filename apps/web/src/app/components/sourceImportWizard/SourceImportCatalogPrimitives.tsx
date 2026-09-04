/** Owned concern: present Add Source catalog structure without owning selection state. */
import {
  ChevronDown,
  ChevronRight,
  Database,
  FileJson,
  Globe2,
  RadioTower,
  Table2,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';

import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
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
  groupHeaderContent: 'flex min-w-0 items-center justify-between gap-3',
  groupIdentity: 'flex min-w-0 items-center gap-2',
  groupTitle: 'truncate font-mono font-medium',
  groupMetrics: 'flex max-w-full min-w-0 flex-wrap justify-end gap-2 text-xs text-slate-400',
  filterList: 'flex flex-wrap gap-2',
  filterButton:
    'rounded border border-slate-700 bg-slate-950/50 px-2.5 py-1 text-xs text-slate-300 transition hover:border-sky-500 hover:text-slate-100 disabled:cursor-not-allowed disabled:opacity-40',
  activeFilterButton: 'border-sky-400 bg-sky-950/40 text-sky-100',
  filterCount: 'ml-1 text-slate-500',
  schemaHeader: 'mb-2 flex min-w-0 items-center gap-2',
  schemaDisclosure:
    'flex min-w-0 flex-1 cursor-pointer items-center gap-1 rounded text-left outline-none focus-visible:ring-2 focus-visible:ring-sky-400/40',
  schemaTitle: 'min-w-0 truncate text-sm font-medium',
  objectList: 'ml-6 space-y-1',
  objectCard:
    'overflow-hidden rounded border border-slate-700 bg-slate-950/30 px-2.5 py-2 outline-none hover:bg-slate-950 focus-visible:border-sky-400 focus-visible:ring-2 focus-visible:ring-sky-400/40',
  selectedObjectCard: 'border-sky-400 bg-sky-950/30 shadow-[0_0_0_1px_rgba(56,189,248,0.35)]',
  objectHeader: 'flex items-center justify-between gap-2',
  objectIdentity: 'flex min-w-0 flex-1 items-center gap-2 overflow-hidden',
  objectInspectButton:
    'flex min-w-0 flex-1 cursor-pointer items-center gap-2 overflow-hidden rounded text-left outline-none focus-visible:ring-2 focus-visible:ring-sky-400/40',
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
  canonicalName: string;
  accessibilityLabel: string;
  expandAccessibilityLabel: string;
  collapseAccessibilityLabel: string;
  schemaIdentityKey: string;
  expanded: boolean;
  selected: boolean;
  objectCountLabel: string;
  onToggle: () => void;
}>;

type SourceImportSchemaDisclosureProps = Readonly<{
  children: ReactNode;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
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
        <span
          data-slot="source-import-database-metrics"
          className={sourceImportCatalogClassNames.groupMetrics}
        >
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
  canonicalName,
  accessibilityLabel,
  expandAccessibilityLabel,
  collapseAccessibilityLabel,
  schemaIdentityKey,
  expanded,
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
      <CollapsibleTrigger asChild>
        <button
          type="button"
          aria-label={expanded ? collapseAccessibilityLabel : expandAccessibilityLabel}
          className={sourceImportCatalogClassNames.schemaDisclosure}
        >
          {expanded ? (
            <ChevronDown className="size-4 shrink-0" aria-hidden="true" />
          ) : (
            <ChevronRight className="size-4 shrink-0" aria-hidden="true" />
          )}
          <h4 className={sourceImportCatalogClassNames.schemaTitle} title={canonicalName}>
            {schema}
          </h4>
        </button>
      </CollapsibleTrigger>
      <Badge variant="secondary" className="text-xs">
        {objectCountLabel}
      </Badge>
    </div>
  );
}

export function SourceImportSchemaDisclosure({
  children,
  expanded,
  onExpandedChange,
}: SourceImportSchemaDisclosureProps): JSX.Element {
  return (
    <Collapsible open={expanded} onOpenChange={onExpandedChange}>
      {children}
    </Collapsible>
  );
}

export function SourceImportSchemaObjects({
  children,
}: Readonly<{ children: ReactNode }>): JSX.Element {
  return (
    <CollapsibleContent>
      <SourceImportObjectList>{children}</SourceImportObjectList>
    </CollapsibleContent>
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
    <article
      data-source-import-object={sourceObject.identityKey}
      className={objectCardClassName}
      onDoubleClick={() => {
        if (sourceObject.selectable) {
          onToggle();
        }
      }}
    >
      <div className={sourceImportCatalogClassNames.objectHeader}>
        <div className={sourceImportCatalogClassNames.objectIdentity}>
          <Checkbox
            aria-label={sourceObject.accessibilityLabel}
            data-source-import-object-select={sourceObject.identityKey}
            checked={sourceObject.selected}
            disabled={!sourceObject.selectable}
            onClick={(event) => {
              if (event.detail > 1) {
                event.preventDefault();
              }
            }}
            onCheckedChange={onToggle}
            onDoubleClick={(event) => event.stopPropagation()}
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
              {sourceObject.locatorKind === 'relation' ? null : (
                <span className={sourceImportCatalogClassNames.objectCanonicalName}>
                  {sourceObject.canonicalName}
                </span>
              )}
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
