/** Owned concern: render the Plugins route capability catalog table and selected detail. */
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
import { resolveString } from '../../plugins/contracts/PluginManifest';
import { type PluginContributions } from '../../plugins/registry';

import {
  type PluginCapabilitiesSnapshot,
  type PluginReadiness,
  type PluginReadinessItem,
  type PluginSurfaceState,
  pluginsViewCopy,
  resolvePluginReadiness,
} from './pluginsViewModel';

type BackendFilter = 'all' | 'available' | 'blocked' | 'degraded' | 'pending' | 'not-required';

type PluginCapabilityTableProps = Readonly<{
  capabilities: PluginCapabilitiesSnapshot | undefined;
  capabilitiesError: unknown;
  capabilitiesLoading: boolean;
  plugins: readonly PluginContributions[];
}>;

type PluginCapabilityRow = Readonly<{
  plugin: PluginContributions;
  readiness: PluginReadiness;
  backend: PluginReadinessItem;
  executable: PluginReadinessItem;
}>;

function resolveStatusIcon(state: PluginSurfaceState) {
  if (state === 'ok') {
    return <CheckCircle2 className="size-3" />;
  }
  if (state === 'warning') {
    return <Radio className="size-3" />;
  }
  if (state === 'error') {
    return <XCircle className="size-3" />;
  }
  return <Info className="size-3" />;
}

function resolveBackendFilter(row: PluginCapabilityRow): BackendFilter {
  if (row.backend.label === 'Not required') {
    return 'not-required';
  }
  if (row.backend.state === 'ok') {
    return 'available';
  }
  if (row.backend.state === 'error') {
    return 'blocked';
  }
  if (row.backend.state === 'warning') {
    return 'pending';
  }
  return 'degraded';
}

function createCapabilityRows({
  capabilities,
  capabilitiesError,
  capabilitiesLoading,
  plugins,
}: PluginCapabilityTableProps): PluginCapabilityRow[] {
  return plugins.map((plugin) => {
    const readiness = resolvePluginReadiness(
      plugin,
      capabilities,
      capabilitiesLoading,
      capabilitiesError
    );
    const backend = readiness.items.find((item) => item.key === 'backend');
    const executable = readiness.items.find((item) => item.key === 'executable');

    if (!backend || !executable) {
      throw new Error(`Plugin readiness projection is missing backend or executable state.`);
    }

    return {
      plugin,
      readiness,
      backend,
      executable,
    };
  });
}

function filterCapabilityRows(
  rows: readonly PluginCapabilityRow[],
  searchText: string,
  backendFilter: BackendFilter
): PluginCapabilityRow[] {
  const normalizedSearch = searchText.trim().toLowerCase();

  return rows.filter((row) => {
    const searchable = [
      row.plugin.id,
      resolveString(row.plugin.displayName),
      row.plugin.backendPluginId,
      ...(row.plugin.capabilities ?? []),
      ...(row.plugin.nodeKinds?.map((kind) => kind.kind) ?? []),
    ]
      .filter((value): value is string => value != null)
      .join(' ')
      .toLowerCase();

    const matchesSearch = normalizedSearch.length === 0 || searchable.includes(normalizedSearch);
    const matchesBackend = backendFilter === 'all' || resolveBackendFilter(row) === backendFilter;

    return matchesSearch && matchesBackend;
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

function PluginCapabilityDetail({ row }: Readonly<{ row: PluginCapabilityRow | undefined }>) {
  if (!row) {
    return (
      <Card
        data-slot="plugin-capability-detail"
        className={cn(routeWorkbenchPanelClassName, 'p-5')}
      >
        <p className={cn('text-sm', routeWorkbenchMutedTextClassName)}>
          {pluginsViewCopy.noPluginMatches}
        </p>
      </Card>
    );
  }

  const { plugin, readiness } = row;

  return (
    <Card data-slot="plugin-capability-detail" className={cn(routeWorkbenchPanelClassName, 'p-5')}>
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="font-semibold text-(--text-strong)">
              {resolveString(plugin.displayName)}
            </h2>
            <p className={cn('font-mono text-xs', routeWorkbenchSubtleTextClassName)}>
              {plugin.id}
            </p>
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
            title={pluginsViewCopy.capabilitiesTitle}
            emptyCopy={pluginsViewCopy.noCapabilities}
            values={plugin.capabilities}
          />
          <PluginTaxonomy
            title={pluginsViewCopy.nodeKindsTitle}
            emptyCopy={pluginsViewCopy.noNodeKinds}
            valueClassName="font-mono text-[10px]"
            values={plugin.nodeKinds?.map((kind) => kind.kind)}
          />
        </div>
      </div>
    </Card>
  );
}

export function PluginCapabilityTable(props: PluginCapabilityTableProps) {
  const [searchText, setSearchText] = useState('');
  const [backendFilter, setBackendFilter] = useState<BackendFilter>('all');
  const [selectedPluginId, setSelectedPluginId] = useState<string | null>(
    props.plugins[0]?.id ?? null
  );

  const rows = useMemo(() => createCapabilityRows(props), [props]);
  const visibleRows = useMemo(
    () => filterCapabilityRows(rows, searchText, backendFilter),
    [backendFilter, rows, searchText]
  );
  const selectedRow =
    visibleRows.find((row) => row.plugin.id === selectedPluginId) ?? visibleRows[0];

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
              onChange={(event) => {
                setSearchText(event.currentTarget.value);
              }}
              placeholder={pluginsViewCopy.searchPlaceholder}
              className={cn(routeWorkbenchFieldClassName, 'pl-9')}
            />
          </label>
          <select
            data-slot="plugin-backend-state-filter"
            value={backendFilter}
            onChange={(event) => {
              setBackendFilter(event.currentTarget.value as BackendFilter);
            }}
            className={cn(routeWorkbenchFieldClassName, 'h-9 rounded-md px-3 text-sm')}
          >
            <option value="all">{pluginsViewCopy.backendFilterAll}</option>
            <option value="available">{pluginsViewCopy.backendFilterAvailable}</option>
            <option value="blocked">{pluginsViewCopy.backendFilterBlocked}</option>
            <option value="degraded">{pluginsViewCopy.backendFilterDegraded}</option>
            <option value="pending">{pluginsViewCopy.backendFilterPending}</option>
            <option value="not-required">{pluginsViewCopy.backendFilterNotRequired}</option>
          </select>
        </div>

        <div className="mt-4 overflow-hidden rounded-lg border border-(--border-default)">
          <div className="grid grid-cols-[minmax(12rem,1.4fr)_7rem_7rem_7rem] gap-3 bg-(--surface-app) px-3 py-2 text-xs font-semibold uppercase tracking-wide text-(--text-muted)">
            <span>{pluginsViewCopy.pluginColumn}</span>
            <span>{pluginsViewCopy.backendColumn}</span>
            <span>{pluginsViewCopy.executableColumn}</span>
            <span>{pluginsViewCopy.routesColumn}</span>
          </div>
          {visibleRows.length > 0 ? (
            visibleRows.map((row) => (
              <button
                type="button"
                key={row.plugin.id}
                data-slot="plugin-capability-row"
                data-plugin-id={row.plugin.id}
                onClick={() => {
                  setSelectedPluginId(row.plugin.id);
                }}
                className={cn(
                  'grid w-full grid-cols-[minmax(12rem,1.4fr)_7rem_7rem_7rem] gap-3 border-t border-(--border-default) px-3 py-3 text-left text-sm',
                  selectedRow?.plugin.id === row.plugin.id
                    ? 'bg-(--surface-elevated)'
                    : 'bg-(--surface-panel) hover:bg-(--surface-app)'
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium text-(--text-strong)">
                    {resolveString(row.plugin.displayName)}
                  </span>
                  <span
                    className={cn(
                      'block truncate font-mono text-xs',
                      routeWorkbenchSubtleTextClassName
                    )}
                  >
                    {row.plugin.id}
                  </span>
                </span>
                <span>{row.backend.label}</span>
                <span>{row.executable.label}</span>
                <span>{row.plugin.views?.length ?? 0}</span>
              </button>
            ))
          ) : (
            <div
              className={cn(
                'border-t border-(--border-default) px-3 py-6 text-sm',
                routeWorkbenchMutedTextClassName
              )}
            >
              {pluginsViewCopy.noPluginMatches}
            </div>
          )}
        </div>
      </Card>

      <PluginCapabilityDetail row={selectedRow} />
    </div>
  );
}
