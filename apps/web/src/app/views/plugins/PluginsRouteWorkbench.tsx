/** Owned concern: compose the Plugins route from reconciled catalog read models. */
import type { ReactNode } from 'react';

import { AlertTriangle, CheckCircle2, Info, Puzzle, Radio, XCircle } from 'lucide-react';

import { StatusIndicator, ViewHeader, ViewStateOverlay } from '../../components/domain';
import { Badge } from '../../components/ui/badge';
import { Card } from '../../components/ui/card';
import { cn } from '../../components/ui/utils';
import {
  routeWorkbenchFieldClassName,
  routeWorkbenchHeaderBandClassName,
  routeWorkbenchMutedTextClassName,
  routeWorkbenchPanelClassName,
} from '../../components/workbench/RouteWorkbenchFrame';

import { PluginCapabilityTable } from './PluginCapabilityTable';
import type { PluginCatalogReconciliationResult } from './pluginCatalogReconciliation';
import type { PluginsViewCopy } from './pluginsViewCopy';
import type {
  PluginCapabilitiesSnapshot,
  PluginProbeStatus,
  PluginSurfaceState,
} from './pluginsViewModel';

type PluginsViewHeaderProps = Readonly<{
  capabilities: PluginCapabilitiesSnapshot | undefined;
  copy: PluginsViewCopy;
  reconciliation: PluginCatalogReconciliationResult | undefined;
}>;

export function PluginsViewHeader({ capabilities, copy, reconciliation }: PluginsViewHeaderProps) {
  const authorityState = reconciliation ? 'known' : 'unknown';
  const registeredCount = reconciliation?.entries.filter(
    (entry) => entry.frontendPresence === 'registered'
  ).length;
  const resolveCount = (count: number | undefined): string =>
    count === undefined ? copy.unknownLabel : String(count);
  return (
    <div data-slot="plugins-view-header-band" className={routeWorkbenchHeaderBandClassName}>
      <ViewHeader
        className="border-0 bg-transparent px-0 py-0"
        title={copy.title}
        icon={<Puzzle className="size-6 text-(--text-muted)" />}
        subtitle={copy.subtitle}
        actions={
          <>
            <Badge
              data-slot="plugin-catalog-count"
              data-authority-state={authorityState}
              variant="outline"
              className={cn(routeWorkbenchFieldClassName, 'text-xs')}
            >
              {copy.catalogCount}: {resolveCount(reconciliation?.entries.length)}
            </Badge>
            <Badge
              data-slot="plugin-registered-count"
              data-authority-state={authorityState}
              variant="outline"
              className={cn(routeWorkbenchFieldClassName, 'text-xs')}
            >
              {copy.registeredCount}: {resolveCount(registeredCount)}
            </Badge>
            <Badge
              data-slot="plugin-local-only-count"
              data-authority-state={authorityState}
              variant="outline"
              className={cn(routeWorkbenchFieldClassName, 'text-xs')}
            >
              {copy.localOnlyCount}: {resolveCount(reconciliation?.localOnlyContributions.length)}
            </Badge>
            {capabilities ? (
              <Badge variant="outline" className={cn(routeWorkbenchFieldClassName, 'text-xs')}>
                {copy.apiVersion}: {capabilities.apiVersion}
              </Badge>
            ) : null}
          </>
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
  probeStatus,
  reconciliation,
}: Readonly<{
  capabilities: PluginCapabilitiesSnapshot | undefined;
  capabilitiesError: unknown;
  capabilitiesLoading: boolean;
  copy: PluginsViewCopy;
  pluginCatalogError: unknown;
  pluginCatalogLoading: boolean;
  probeStatus: PluginProbeStatus;
  reconciliation: PluginCatalogReconciliationResult | undefined;
}>) {
  return (
    <>
      <PluginCapabilityProbeCard
        capabilities={capabilities}
        copy={copy}
        probeStatus={probeStatus}
      />
      <PluginRegistryContent
        capabilities={capabilities}
        capabilitiesError={capabilitiesError}
        capabilitiesLoading={capabilitiesLoading}
        copy={copy}
        pluginCatalogError={pluginCatalogError}
        pluginCatalogLoading={pluginCatalogLoading}
        reconciliation={reconciliation}
      />
    </>
  );
}

function resolveStatusIcon(state: PluginSurfaceState): ReactNode {
  if (state === 'ok') return <CheckCircle2 className="size-3" />;
  if (state === 'warning') return <Radio className="size-3" />;
  if (state === 'error') return <XCircle className="size-3" />;
  return <Info className="size-3" />;
}

function PluginCapabilityProbeCard({
  capabilities,
  copy,
  probeStatus,
}: Readonly<{
  capabilities: PluginCapabilitiesSnapshot | undefined;
  copy: PluginsViewCopy;
  probeStatus: PluginProbeStatus;
}>) {
  return (
    <Card data-slot="plugins-capability-probe" className={cn(routeWorkbenchPanelClassName, 'p-4')}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <h2 className="font-semibold text-(--text-strong)">{copy.capabilityProbeTitle}</h2>
          <p className={cn('text-sm', routeWorkbenchMutedTextClassName)}>
            {probeStatus.description}
          </p>
        </div>
        <StatusIndicator
          state={probeStatus.state}
          label={probeStatus.label}
          icon={resolveStatusIcon(probeStatus.state)}
        />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Badge variant="outline" className={cn(routeWorkbenchFieldClassName, 'text-xs')}>
          {copy.apiVersion}: {capabilities?.apiVersion ?? 'n/a'}
        </Badge>
        <Badge variant="outline" className={cn(routeWorkbenchFieldClassName, 'text-xs')}>
          {copy.minFrontendVersion}: {capabilities?.minFrontendVersion ?? 'n/a'}
        </Badge>
      </div>
    </Card>
  );
}

function LocalRegistryDiagnostic({
  copy,
  reconciliation,
}: Readonly<{
  copy: PluginsViewCopy;
  reconciliation: PluginCatalogReconciliationResult;
}>) {
  if (reconciliation.localOnlyContributions.length === 0) return null;

  return (
    <Card
      data-slot="plugin-local-registry-diagnostic"
      className={cn(routeWorkbenchPanelClassName, 'border-(--status-warning-border) p-4')}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-(--status-warning-text)" />
        <div className="space-y-2">
          <h2 className="font-semibold text-(--text-strong)">{copy.localOnlyDiagnosticTitle}</h2>
          <p className={cn('text-sm', routeWorkbenchMutedTextClassName)}>
            {copy.localOnlyDiagnosticDescription(reconciliation.localOnlyContributions.length)}
          </p>
          <div className="flex flex-wrap gap-2">
            {reconciliation.localOnlyContributions.map((contribution) => (
              <Badge key={contribution.id} variant="outline" className="font-mono text-xs">
                {contribution.id}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

function PluginRegistryContent({
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
      <ViewStateOverlay
        kind="loading"
        title={copy.pluginCatalogLoadingTitle}
        description={copy.pluginCatalogLoadingDescription}
      />
    );
  }
  if (pluginCatalogError) {
    return (
      <ViewStateOverlay
        kind="error"
        title={copy.pluginCatalogErrorTitle}
        description={copy.pluginCatalogErrorDescription}
      />
    );
  }
  if (!reconciliation) {
    return (
      <ViewStateOverlay
        kind="error"
        title={copy.pluginCatalogErrorTitle}
        description={copy.pluginCatalogErrorDescription}
      />
    );
  }

  return (
    <>
      <LocalRegistryDiagnostic copy={copy} reconciliation={reconciliation} />
      {reconciliation.entries.length === 0 ? (
        <ViewStateOverlay
          kind="empty"
          title={copy.noPluginsTitle}
          description={copy.noPluginsDescription}
        />
      ) : (
        <PluginCapabilityTable
          capabilities={capabilities}
          capabilitiesError={capabilitiesError}
          capabilitiesLoading={capabilitiesLoading}
          copy={copy}
          entries={reconciliation.entries}
        />
      )}
    </>
  );
}
