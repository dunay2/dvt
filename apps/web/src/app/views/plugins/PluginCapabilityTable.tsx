/** Owned concern: render reconciled plugin catalog rows and selected detail. */
import { CheckCircle2, CircleAlert, Clock, Info } from 'lucide-react';
import { useId, useState } from 'react';

import { StatusIndicator } from '../../components/domain';
import { Button } from '../../components/ui/button';
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
import { routeWorkbenchPanelClassName } from '../../components/workbench/RouteWorkbenchFrame';
import { routeWorkbenchDenseTableClasses as dense } from '../../components/workbench/routeWorkbenchTableTokens';

import type { PluginCatalogReconciliation } from './pluginCatalogReconciliation';
import type { PluginsViewCopy } from './pluginsViewCopy';
import {
  type PluginBackendState,
  type PluginCapabilitiesSnapshot,
  resolvePluginReadiness,
} from './pluginsViewModel';

type PluginCapabilityTableProps = Readonly<{
  capabilities: PluginCapabilitiesSnapshot | undefined;
  capabilitiesError: unknown;
  capabilitiesLoading: boolean;
  copy: PluginsViewCopy;
  entries: readonly PluginCatalogReconciliation[];
}>;

type PluginCapabilityRow = ReturnType<typeof resolvePluginReadiness> & {
  entry: PluginCatalogReconciliation;
};
type BackendFilter = 'all' | 'available' | 'blocked' | 'degraded' | 'pending' | 'not-required';

const backendFilterByState = {
  available: 'available',
  unavailable: 'blocked',
  unknown: 'degraded',
  pending: 'pending',
  'probe-unavailable': 'degraded',
  'not-required': 'not-required',
  'not-bound': 'blocked',
} as const satisfies Record<PluginBackendState, BackendFilter>;

function resolveBackendFilter(state: PluginBackendState): BackendFilter {
  return backendFilterByState[state];
}

const statusIcons = { ok: CheckCircle2, error: CircleAlert, warning: Clock, degraded: Info };

function resolveStatusIcon(state: keyof typeof statusIcons) {
  const Icon = statusIcons[state];
  return <Icon aria-hidden="true" className="size-3" />;
}

function createCapabilityRows({
  capabilities,
  capabilitiesError,
  capabilitiesLoading,
  copy,
  entries,
}: PluginCapabilityTableProps): PluginCapabilityRow[] {
  return entries.map((entry) => ({
    entry,
    ...resolvePluginReadiness(
      entry,
      { capabilities: capabilities, loading: capabilitiesLoading, error: capabilitiesError },
      copy
    ),
  }));
}

function filterCapabilityRows(
  rows: readonly PluginCapabilityRow[],
  search: string,
  frontend: string,
  backend: BackendFilter
) {
  return rows.filter((row) => {
    const { catalog, backendPluginId, localContribution } = row.entry;
    if (!matchesCapabilityFrontend(row, frontend)) return false;
    if (backend !== 'all' && resolveBackendFilter(row.backendState) !== backend) return false;
    const searchValues = [
      catalog.id,
      catalog.name,
      backendPluginId,
      ...(catalog.capabilities ?? []),
      ...(localContribution?.nodeKinds?.map(({ kind }) => kind) ?? []),
    ];
    return !search || searchValues.some((value) => value?.toLowerCase().includes(search));
  });
}

function PluginTaxonomy({ label, values }: { label: string; values?: readonly string[] }) {
  if (!values?.length) return null;
  return (
    <dl>
      <dt className={cn(dense.mutedText, 'font-medium')}>{label}</dt>
      <dd className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
        {values.map((value) => (
          <code key={value} className="min-w-0 break-all text-xs">
            {value}
          </code>
        ))}
      </dd>
    </dl>
  );
}

function PluginCapabilityDetail({
  copy,
  row,
  id,
}: Readonly<{
  copy: PluginsViewCopy;
  row: PluginCapabilityRow;
  id: string;
}>) {
  const { catalog, localContribution } = row.entry;
  return (
    <aside
      id={id}
      aria-labelledby={`${id}-title`}
      data-slot="plugin-capability-detail"
      className={cn(
        routeWorkbenchPanelClassName,
        'min-w-0 space-y-3 rounded-md border p-3 text-sm'
      )}
    >
      <div>
        <h2 id={`${id}-title`} className="font-semibold">
          {catalog.name}
        </h2>
        <p className={dense.mutedText}>
          {copy.versionLabel} {catalog.version}
        </p>
      </div>
      {row.diagnostic ? <p className="break-words">{row.diagnostic}</p> : null}
      <PluginTaxonomy label={copy.capabilitiesTitle} values={catalog.capabilities} />
      <PluginTaxonomy
        label={copy.nodeKindsTitle}
        values={localContribution?.nodeKinds?.map(({ kind }) => kind)}
      />
    </aside>
  );
}

export function PluginCapabilityTable(props: PluginCapabilityTableProps) {
  const { copy } = props;
  const [search, setSearch] = useState('');
  const [frontend, setFrontend] = useState('all');
  const [backend, setBackend] = useState<BackendFilter>('all');
  const [selectedId, setSelectedId] = useState<string>();
  const detailId = useId();
  const rows = filterCapabilityRows(
    createCapabilityRows(props),
    search.trim().toLowerCase(),
    frontend,
    backend
  );
  const selectedRow = rows.find(({ entry }) => entry.catalog.id === selectedId) ?? rows[0];

  return (
    <div
      data-slot="plugin-capability-table"
      className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_20rem]"
    >
      <div className="min-w-0 space-y-3">
        <CapabilityFilterControls
          copy={copy}
          search={search}
          onSearch={setSearch}
          frontend={frontend}
          onFrontend={setFrontend}
          backend={backend}
          onBackend={setBackend}
        />
        <div className={cn(routeWorkbenchPanelClassName, 'rounded-md border')}>
          <Table aria-label={copy.title}>
            <TableHeader className="bg-[var(--surface-elevated)]">
              <TableRow>
                <TableHead scope="col" className="h-8 w-full px-3">
                  {copy.pluginColumn}
                </TableHead>
                <TableHead scope="col" className="h-8">
                  {copy.frontendTitle}
                </TableHead>
                <TableHead scope="col" className="h-8">
                  {copy.backendTitle}
                </TableHead>
                <TableHead scope="col" className="h-8">
                  {copy.operationalTitle}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const { id, name } = row.entry.catalog;
                const selected = selectedRow?.entry.catalog.id === id;
                return (
                  <TableRow
                    key={id}
                    data-slot="plugin-capability-row"
                    data-plugin-id={id}
                    data-state={selected ? 'selected' : undefined}
                    data-runtime-shape={row.runtimeShape}
                    data-frontend-presence={row.frontendPresence}
                    data-backend-state={row.backendState}
                    data-operational-state={row.operationalState}
                  >
                    <TableCell className="p-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-pressed={selected}
                        aria-controls={detailId}
                        onClick={() => setSelectedId(id)}
                        className="h-auto w-full justify-start px-2 py-1 text-left whitespace-normal"
                      >
                        <span className="min-w-0 break-words">
                          <span className="block font-medium">{name}</span>
                          {id !== name ? (
                            <code className={cn(dense.subtleText, 'block break-all text-xs')}>
                              {id}
                            </code>
                          ) : null}
                        </span>
                      </Button>
                    </TableCell>
                    <TableCell className="py-1">{row.frontendLabel}</TableCell>
                    <TableCell className="py-1">{row.backendLabel}</TableCell>
                    <TableCell className="py-1">
                      <StatusIndicator
                        state={row.summary.state}
                        label={row.summary.label}
                        icon={resolveStatusIcon(row.summary.state)}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className={dense.emptyCell}>
                    {copy.noPluginMatches}
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </div>
      {selectedRow ? <PluginCapabilityDetail copy={copy} row={selectedRow} id={detailId} /> : null}
    </div>
  );
}

/** Unbound rows retain the broader not-registered filter membership. */
function matchesCapabilityFrontend(row: PluginCapabilityRow, frontend: string): boolean {
  if (frontend === 'all') return true;
  const state = row.runtimeShape === 'unbound' ? 'unbound' : row.frontendPresence;
  return frontend === state || frontend === row.frontendPresence;
}

function CapabilityFilterControls({
  copy,
  search,
  onSearch,
  frontend,
  onFrontend,
  backend,
  onBackend,
}: Readonly<{
  copy: PluginsViewCopy;
  search: string;
  onSearch: (value: string) => void;
  frontend: string;
  onFrontend: (value: string) => void;
  backend: BackendFilter;
  onBackend: (value: BackendFilter) => void;
}>) {
  return (
    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
      <Input
        data-slot="plugin-catalog-search"
        type="search"
        aria-label={copy.searchPlaceholder}
        placeholder={copy.searchPlaceholder}
        value={search}
        onChange={(event) => onSearch(event.currentTarget.value)}
        className={dense.field}
      />
      <select
        data-slot="plugin-frontend-state-filter"
        aria-label={copy.frontendFilterLabel}
        value={frontend}
        onChange={(event) => onFrontend(event.currentTarget.value)}
        className={dense.field}
      >
        <option value="all">{copy.frontendFilterAll}</option>
        <option value="registered">{copy.frontendFilterRegistered}</option>
        <option value="not-registered">{copy.frontendFilterNotRegistered}</option>
        <option value="unbound">{copy.frontendFilterUnbound}</option>
      </select>
      <select
        data-slot="plugin-backend-state-filter"
        aria-label={copy.backendFilterLabel}
        value={backend}
        onChange={(event) => onBackend(event.currentTarget.value as BackendFilter)}
        className={dense.field}
      >
        <option value="all">{copy.backendFilterAll}</option>
        <option value="available">{copy.backendFilterAvailable}</option>
        <option value="blocked">{copy.backendFilterBlocked}</option>
        <option value="degraded">{copy.backendFilterDegraded}</option>
        <option value="pending">{copy.backendFilterPending}</option>
        <option value="not-required">{copy.backendFilterNotRequired}</option>
      </select>
    </div>
  );
}
