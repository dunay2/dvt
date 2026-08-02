/** Owned concern: render reconciled plugin catalog rows and selected detail. */
import { useMemo, useState } from 'react';

import { CheckCircle2, Info, Radio, Search, XCircle } from 'lucide-react';

import { StatusIndicator } from '../../components/domain';
import { Badge } from '../../components/ui/badge';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { cn } from '../../components/ui/utils';
import {
  routeWorkbenchFieldClassName,
  routeWorkbenchMutedTextClassName,
  routeWorkbenchPanelClassName,
  routeWorkbenchSectionTitleClassName,
  routeWorkbenchSubtleTextClassName,
} from '../../components/workbench/RouteWorkbenchFrame';

import type { PluginCatalogReconciliation } from './pluginCatalogReconciliation';
import type { PluginsViewCopy } from './pluginsViewCopy';
import {
  type PluginBackendState,
  type PluginCapabilitiesSnapshot,
  type PluginReadiness,
  type PluginReadinessItem,
  type PluginSurfaceState,
  resolvePluginReadiness,
} from './pluginsViewModel';

type BackendFilter = 'all' | 'available' | 'blocked' | 'degraded' | 'pending' | 'not-required';
type FrontendFilter = 'all' | 'registered' | 'not-registered' | 'unbound';

type PluginCapabilityTableProps = Readonly<{
  capabilities: PluginCapabilitiesSnapshot | undefined;
  capabilitiesError: unknown;
  capabilitiesLoading: boolean;
  copy: PluginsViewCopy;
  entries: readonly PluginCatalogReconciliation[];
}>;

type PluginCapabilityRow = Readonly<{
  entry: PluginCatalogReconciliation;
  readiness: PluginReadiness;
  frontend: PluginReadinessItem;
  backend: PluginReadinessItem;
  operational: PluginReadinessItem;
}>;

function resolveStatusIcon(state: PluginSurfaceState) {
  if (state === 'ok') return <CheckCircle2 className="size-3" />;
  if (state === 'warning') return <Radio className="size-3" />;
  if (state === 'error') return <XCircle className="size-3" />;
  return <Info className="size-3" />;
}

function resolveBackendFilter(state: PluginBackendState): BackendFilter {
  if (state === 'available') return 'available';
  if (state === 'unavailable' || state === 'not-bound') return 'blocked';
  if (state === 'pending') return 'pending';
  if (state === 'not-required') return 'not-required';
  return 'degraded';
}

function requiredReadinessItem(
  readiness: PluginReadiness,
  key: PluginReadinessItem['key']
): PluginReadinessItem {
  const item = readiness.items.find((candidate) => candidate.key === key);
  if (!item) {
    throw new Error(`Plugin readiness projection is missing ${key} state.`);
  }
  return item;
}

function createCapabilityRows({
  capabilities,
  capabilitiesError,
  capabilitiesLoading,
  copy,
  entries,
}: PluginCapabilityTableProps): PluginCapabilityRow[] {
  return entries.map((entry) => {
    const readiness = resolvePluginReadiness(
      entry,
      capabilities,
      capabilitiesLoading,
      capabilitiesError,
      copy
    );
    return {
      entry,
      readiness,
      frontend: requiredReadinessItem(readiness, 'frontend'),
      backend: requiredReadinessItem(readiness, 'backend'),
      operational: requiredReadinessItem(readiness, 'executable'),
    };
  });
}

function matchesFrontendFilter(row: PluginCapabilityRow, filter: FrontendFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'unbound') return row.readiness.runtimeShape === 'unbound';
  return row.readiness.frontendPresence === filter;
}

function filterCapabilityRows(
  rows: readonly PluginCapabilityRow[],
  searchText: string,
  backendFilter: BackendFilter,
  frontendFilter: FrontendFilter
): PluginCapabilityRow[] {
  const normalizedSearch = searchText.trim().toLowerCase();

  return rows.filter((row) => {
    const { catalog, localContribution } = row.entry;
    const searchable = [
      catalog.id,
      catalog.name,
      catalog.backendPluginId,
      ...(catalog.capabilities ?? []),
      ...(localContribution?.nodeKinds?.map((kind) => kind.kind) ?? []),
    ]
      .filter((value): value is string => value != null)
      .join(' ')
      .toLowerCase();

    return (
      (normalizedSearch.length === 0 || searchable.includes(normalizedSearch)) &&
      (backendFilter === 'all' ||
        resolveBackendFilter(row.readiness.backendState) === backendFilter) &&
      matchesFrontendFilter(row, frontendFilter)
    );
  });
}

function PluginTaxonomy({
  emptyCopy,
  title,
  valueClassName,
  values,
}: Readonly<{
  emptyCopy: string;
  title: string;
  valueClassName?: string;
  values: readonly string[] | undefined;
}>) {
  return (
    <div className="space-y-2">
      <div className={routeWorkbenchSectionTitleClassName}>{title}</div>
      {(values?.length ?? 0) > 0 ? (
        <div className="flex flex-wrap gap-2">
          {values?.map((value) => (
            <Badge
              key={value}
              variant="outline"
              className={cn(routeWorkbenchFieldClassName, 'text-xs', valueClassName)}
            >
              {value}
            </Badge>
          ))}
        </div>
      ) : (
        <p className={cn('text-sm', routeWorkbenchMutedTextClassName)}>{emptyCopy}</p>
      )}
    </div>
  );
}

function runtimeShapeLabel(row: PluginCapabilityRow, copy: PluginsViewCopy): string {
  const labels = {
    'frontend-only': copy.runtimeShapeFrontendOnly,
    'frontend-and-backend': copy.runtimeShapeFrontendAndBackend,
    'backend-only': copy.runtimeShapeBackendOnly,
    unbound: copy.runtimeShapeUnbound,
  } as const;
  return labels[row.readiness.runtimeShape];
}

function PluginCapabilityDetail({
  copy,
  row,
}: Readonly<{ copy: PluginsViewCopy; row: PluginCapabilityRow | undefined }>) {
  if (!row) {
    return (
      <Card
        data-slot="plugin-capability-detail"
        className={cn(routeWorkbenchPanelClassName, 'p-5')}
      >
        <p className={cn('text-sm', routeWorkbenchMutedTextClassName)}>{copy.noPluginMatches}</p>
      </Card>
    );
  }

  const { catalog, localContribution } = row.entry;
  const { readiness } = row;

  return (
    <Card data-slot="plugin-capability-detail" className={cn(routeWorkbenchPanelClassName, 'p-5')}>
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="font-semibold text-(--text-strong)">{catalog.name}</h2>
            <p className={cn('font-mono text-xs', routeWorkbenchSubtleTextClassName)}>
              {catalog.id}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Badge variant="outline" className={cn(routeWorkbenchFieldClassName, 'text-xs')}>
                {copy.versionLabel}: {catalog.version}
              </Badge>
              <Badge variant="outline" className={cn(routeWorkbenchFieldClassName, 'text-xs')}>
                {runtimeShapeLabel(row, copy)}
              </Badge>
            </div>
          </div>
          <StatusIndicator
            state={readiness.summary.state}
            label={readiness.summary.label}
            icon={resolveStatusIcon(readiness.summary.state)}
          />
        </div>

        <div className="grid gap-3">
          {readiness.items.map((item) => (
            <div
              key={item.key}
              data-slot={`plugin-readiness-${item.key}`}
              className={cn(routeWorkbenchFieldClassName, 'rounded-lg p-3')}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className={routeWorkbenchSectionTitleClassName}>{item.title}</div>
                  <p className={cn('text-sm', routeWorkbenchMutedTextClassName)}>{item.detail}</p>
                </div>
                <StatusIndicator
                  state={item.state}
                  label={item.label}
                  icon={resolveStatusIcon(item.state)}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <PluginTaxonomy
            title={copy.capabilitiesTitle}
            emptyCopy={copy.noCapabilities}
            values={catalog.capabilities}
          />
          <PluginTaxonomy
            title={copy.nodeKindsTitle}
            emptyCopy={copy.noNodeKinds}
            valueClassName="font-mono text-[10px]"
            values={localContribution?.nodeKinds?.map((kind) => kind.kind)}
          />
        </div>
      </div>
    </Card>
  );
}

export function PluginCapabilityTable(props: PluginCapabilityTableProps) {
  const [searchText, setSearchText] = useState('');
  const [backendFilter, setBackendFilter] = useState<BackendFilter>('all');
  const [frontendFilter, setFrontendFilter] = useState<FrontendFilter>('all');
  const [selectedPluginId, setSelectedPluginId] = useState<string | null>(
    props.entries[0]?.catalog.id ?? null
  );

  const rows = useMemo(() => createCapabilityRows(props), [props]);
  const visibleRows = useMemo(
    () => filterCapabilityRows(rows, searchText, backendFilter, frontendFilter),
    [backendFilter, frontendFilter, rows, searchText]
  );
  const selectedRow =
    visibleRows.find((row) => row.entry.catalog.id === selectedPluginId) ?? visibleRows[0];

  return (
    <div
      data-slot="plugin-capability-table"
      className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]"
    >
      <Card className={cn(routeWorkbenchPanelClassName, 'p-4')}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label
            className={cn(
              'relative flex min-w-0 flex-1 items-center',
              routeWorkbenchMutedTextClassName
            )}
          >
            <Search className="pointer-events-none absolute left-3 size-4" />
            <Input
              data-slot="plugin-catalog-search"
              value={searchText}
              onChange={(event) => setSearchText(event.currentTarget.value)}
              placeholder={props.copy.searchPlaceholder}
              className={cn(routeWorkbenchFieldClassName, 'pl-9')}
            />
          </label>
          <select
            data-slot="plugin-frontend-state-filter"
            value={frontendFilter}
            onChange={(event) => setFrontendFilter(event.currentTarget.value as FrontendFilter)}
            className={cn(routeWorkbenchFieldClassName, 'h-9 rounded-md px-3 text-sm')}
          >
            <option value="all">{props.copy.frontendFilterAll}</option>
            <option value="registered">{props.copy.frontendFilterRegistered}</option>
            <option value="not-registered">{props.copy.frontendFilterNotRegistered}</option>
            <option value="unbound">{props.copy.frontendFilterUnbound}</option>
          </select>
          <select
            data-slot="plugin-backend-state-filter"
            value={backendFilter}
            onChange={(event) => setBackendFilter(event.currentTarget.value as BackendFilter)}
            className={cn(routeWorkbenchFieldClassName, 'h-9 rounded-md px-3 text-sm')}
          >
            <option value="all">{props.copy.backendFilterAll}</option>
            <option value="available">{props.copy.backendFilterAvailable}</option>
            <option value="blocked">{props.copy.backendFilterBlocked}</option>
            <option value="degraded">{props.copy.backendFilterDegraded}</option>
            <option value="pending">{props.copy.backendFilterPending}</option>
            <option value="not-required">{props.copy.backendFilterNotRequired}</option>
          </select>
        </div>

        <div className="mt-4 overflow-x-auto rounded-lg border border-(--border-default)">
          <div className="grid min-w-[45rem] grid-cols-[minmax(12rem,1.4fr)_7rem_7rem_7rem_5rem] gap-3 bg-(--surface-app) px-3 py-2 text-xs font-semibold uppercase text-(--text-muted)">
            <span>{props.copy.pluginColumn}</span>
            <span>{props.copy.frontendColumn}</span>
            <span>{props.copy.backendColumn}</span>
            <span>{props.copy.operationalColumn}</span>
            <span>{props.copy.routesColumn}</span>
          </div>
          {visibleRows.length > 0 ? (
            visibleRows.map((row) => (
              <button
                type="button"
                key={row.entry.catalog.id}
                data-slot="plugin-capability-row"
                data-plugin-id={row.entry.catalog.id}
                onClick={() => setSelectedPluginId(row.entry.catalog.id)}
                className={cn(
                  'grid min-w-[45rem] w-full grid-cols-[minmax(12rem,1.4fr)_7rem_7rem_7rem_5rem] gap-3 border-t border-(--border-default) px-3 py-3 text-left text-sm',
                  selectedRow?.entry.catalog.id === row.entry.catalog.id
                    ? 'bg-(--surface-elevated)'
                    : 'bg-(--surface-panel) hover:bg-(--surface-app)'
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium text-(--text-strong)">
                    {row.entry.catalog.name}
                  </span>
                  <span
                    className={cn(
                      'block truncate font-mono text-xs',
                      routeWorkbenchSubtleTextClassName
                    )}
                  >
                    {row.entry.catalog.id}
                  </span>
                </span>
                <span>{row.frontend.label}</span>
                <span>{row.backend.label}</span>
                <span>{row.operational.label}</span>
                <span>{row.entry.localContribution?.views?.length ?? 0}</span>
              </button>
            ))
          ) : (
            <div
              className={cn(
                'border-t border-(--border-default) px-3 py-6 text-sm',
                routeWorkbenchMutedTextClassName
              )}
            >
              {props.copy.noPluginMatches}
            </div>
          )}
        </div>
      </Card>

      <PluginCapabilityDetail copy={props.copy} row={selectedRow} />
    </div>
  );
}
