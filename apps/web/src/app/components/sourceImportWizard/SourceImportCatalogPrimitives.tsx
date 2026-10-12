/** Owned concern: present Add Source catalog structure without owning selection state. */
import {
  ChevronDown,
  ChevronRight,
  Database,
  FileJson,
  Globe2,
  Loader2,
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

import styles from './SourceImportCatalog.module.css';
export const sourceImportCatalogClassNames = styles;

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
  selectable: boolean;
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
  selectable: boolean;
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
  selectable,
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
          <Checkbox
            aria-label={accessibilityLabel}
            checked={selected}
            disabled={!selectable}
            onCheckedChange={onToggle}
          />
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
  selectable,
  objectCountLabel,
  onToggle,
}: SourceImportSchemaHeaderProps): JSX.Element {
  return (
    <div
      data-source-import-schema={schemaIdentityKey}
      className={sourceImportCatalogClassNames.schemaHeader}
    >
      <Checkbox
        aria-label={accessibilityLabel}
        checked={selected}
        disabled={!selectable}
        onCheckedChange={onToggle}
      />
      <CollapsibleTrigger asChild>
        <button
          type="button"
          aria-label={expanded ? collapseAccessibilityLabel : expandAccessibilityLabel}
          className={sourceImportCatalogClassNames.schemaDisclosure}
        >
          {expanded ? (
            <ChevronDown className={sourceImportCatalogClassNames.objectIcon} aria-hidden="true" />
          ) : (
            <ChevronRight className={sourceImportCatalogClassNames.objectIcon} aria-hidden="true" />
          )}
          <h4 className={sourceImportCatalogClassNames.schemaTitle} title={canonicalName}>
            {schema}
          </h4>
        </button>
      </CollapsibleTrigger>
      <Badge variant="secondary" className={sourceImportCatalogClassNames.countBadge}>
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
  loadingLabel,
  loadMoreLabel,
  onLoadMore,
}: Readonly<{
  children: ReactNode;
  loadingLabel: string | null;
  loadMoreLabel: string | null;
  onLoadMore?: () => void;
}>): JSX.Element {
  return (
    <CollapsibleContent>
      <SourceImportObjectList>
        {loadingLabel ? (
          <div className={sourceImportCatalogClassNames.loadingState} role="status">
            <Loader2 className={sourceImportCatalogClassNames.spinner} aria-hidden="true" />
            {loadingLabel}
          </div>
        ) : null}
        {children}
        {loadMoreLabel && onLoadMore ? (
          <button
            type="button"
            className={sourceImportCatalogClassNames.loadMoreButton}
            disabled={loadingLabel !== null}
            onClick={onLoadMore}
          >
            {loadMoreLabel}
          </button>
        ) : null}
      </SourceImportObjectList>
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
