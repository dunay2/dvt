/** Owned concern: compose the Plugins route from reconciled catalog read models. */
import { AlertTriangle, Puzzle } from 'lucide-react';

import { StatusIndicator, ViewHeader, ViewStateOverlay } from '../../components/domain';
import { Alert } from '../../components/ui/alert';
import { cn } from '../../components/ui/utils';
import {
  routeWorkbenchHeaderBandClassName,
  routeWorkbenchMutedTextClassName,
} from '../../components/workbench/RouteWorkbenchFrame';

import { PluginCapabilityTable } from './PluginCapabilityTable';
import type { PluginCatalogReconciliationResult } from './pluginCatalogReconciliation';
import type { PluginsViewCopy } from './pluginsViewCopy';
import type { PluginCapabilitiesSnapshot, PluginProbeStatus } from './pluginsViewModel';

type PluginsViewHeaderProps = Readonly<{ copy: PluginsViewCopy; probeStatus: PluginProbeStatus }>;

export function PluginsViewHeader({ copy, probeStatus }: PluginsViewHeaderProps) {
  return (
    <div
      data-slot="plugins-view-header-band"
      className={cn(routeWorkbenchHeaderBandClassName, 'px-4 py-2')}
    >
      <ViewHeader
        className="border-0 bg-transparent p-0"
        title={copy.title}
        icon={<Puzzle className="size-5" aria-hidden="true" />}
        actions={
          <div data-slot="plugins-capability-probe" role="status" title={probeStatus.description}>
            <StatusIndicator
              state={probeStatus.state}
              label={`${copy.capabilityProbeLabel} · ${probeStatus.label}`}
            />
            {probeStatus.description ? (
              <span className="sr-only">{probeStatus.description}</span>
            ) : null}
          </div>
        }
      />
    </div>
  );
}

export function PluginsPrimarySurface({
  capabilities,
  capabilitiesError,
  capabilitiesLoading,
  copy,
  pluginCatalogError,
  pluginCatalogLoading,
  reconciliation,
}: Readonly<{
  capabilities: PluginCapabilitiesSnapshot | undefined;
  capabilitiesError: unknown;
  capabilitiesLoading: boolean;
  copy: PluginsViewCopy;
  pluginCatalogError: unknown;
  pluginCatalogLoading: boolean;
  reconciliation: PluginCatalogReconciliationResult | undefined;
}>) {
  if (pluginCatalogLoading) {
    return (
      <p role="status" className={routeWorkbenchMutedTextClassName}>
        {copy.pluginCatalogLoadingTitle}
      </p>
    );
  }
  if (pluginCatalogError || !reconciliation) {
    return (
      <ViewStateOverlay
        kind="error"
        title={copy.pluginCatalogErrorTitle}
        description={copy.pluginCatalogErrorDescription}
      />
    );
  }

  const { entries, localOnlyContributions } = reconciliation;
  return (
    <div className="space-y-3">
      {localOnlyContributions.length > 0 ? (
        <Alert
          data-slot="plugin-local-registry-diagnostic"
          className="border-[color:var(--status-warning)] bg-[var(--surface-panel)] px-3 py-2"
        >
          <AlertTriangle aria-hidden="true" />
          <div className="col-start-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <strong title={copy.localOnlyDiagnosticDescription}>
              {copy.localOnlyDiagnosticTitle}
            </strong>
            {localOnlyContributions.map(({ id }) => (
              <code key={id} className="font-mono text-xs text-[var(--text-muted)]">
                {id}
              </code>
            ))}
          </div>
        </Alert>
      ) : null}
      {entries.length > 0 ? (
        <PluginCapabilityTable
          capabilities={capabilities}
          capabilitiesError={capabilitiesError}
          capabilitiesLoading={capabilitiesLoading}
          copy={copy}
          entries={entries}
        />
      ) : (
        <p role="status" className={routeWorkbenchMutedTextClassName}>
          {copy.noPluginsTitle}
        </p>
      )}
    </div>
  );
}
