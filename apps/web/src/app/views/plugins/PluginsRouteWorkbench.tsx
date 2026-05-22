/** Owned concern: compose Plugins route slot content from registry and readiness view models. */
import type { ReactNode } from 'react';

import { CheckCircle2, Info, Puzzle, Radio, XCircle } from 'lucide-react';

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
import { PLUGIN_REGISTRY } from '../../plugins/registry';

import { PluginCapabilityTable } from './PluginCapabilityTable';
import {
  type PluginCapabilitiesSnapshot,
  type PluginProbeStatus,
  type PluginSurfaceState,
  pluginsViewCopy,
} from './pluginsViewModel';

export function PluginsViewHeader({
  capabilities,
}: Readonly<{ capabilities: PluginCapabilitiesSnapshot | undefined }>) {
  return (
    <div data-slot="plugins-view-header-band" className={routeWorkbenchHeaderBandClassName}>
      <ViewHeader
        className="border-0 bg-transparent px-0 py-0"
        title={pluginsViewCopy.title}
        icon={<Puzzle className="size-6 text-(--text-muted)" />}
        subtitle={pluginsViewCopy.subtitle}
        actions={
          <>
            <Badge variant="outline" className={cn(routeWorkbenchFieldClassName, 'text-xs')}>
              {pluginsViewCopy.registeredCount}: {PLUGIN_REGISTRY.length}
            </Badge>
            {capabilities ? (
              <Badge variant="outline" className={cn(routeWorkbenchFieldClassName, 'text-xs')}>
                {pluginsViewCopy.apiVersion}: {capabilities.apiVersion}
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
  probeStatus,
}: Readonly<{
  capabilities: PluginCapabilitiesSnapshot | undefined;
  capabilitiesError: unknown;
  capabilitiesLoading: boolean;
  probeStatus: PluginProbeStatus;
}>) {
  return (
    <>
      <PluginCapabilityProbeCard capabilities={capabilities} probeStatus={probeStatus} />
      <PluginRegistryContent
        capabilities={capabilities}
        capabilitiesError={capabilitiesError}
        capabilitiesLoading={capabilitiesLoading}
      />
    </>
  );
}

function resolveStatusIcon(state: PluginSurfaceState): ReactNode {
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

function PluginCapabilityProbeCard({
  capabilities,
  probeStatus,
}: Readonly<{
  capabilities: PluginCapabilitiesSnapshot | undefined;
  probeStatus: PluginProbeStatus;
}>) {
  return (
    <Card data-slot="plugins-capability-probe" className={cn(routeWorkbenchPanelClassName, 'p-4')}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <h2 className="font-semibold text-(--text-strong)">
            {pluginsViewCopy.capabilityProbeTitle}
          </h2>
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
          {pluginsViewCopy.apiVersion}: {capabilities?.apiVersion ?? 'n/a'}
        </Badge>
        <Badge variant="outline" className={cn(routeWorkbenchFieldClassName, 'text-xs')}>
          {pluginsViewCopy.minFrontendVersion}: {capabilities?.minFrontendVersion ?? 'n/a'}
        </Badge>
      </div>
    </Card>
  );
}

function PluginRegistryContent({
  capabilities,
  capabilitiesError,
  capabilitiesLoading,
}: Readonly<{
  capabilities: PluginCapabilitiesSnapshot | undefined;
  capabilitiesError: unknown;
  capabilitiesLoading: boolean;
}>) {
  if (PLUGIN_REGISTRY.length === 0) {
    return (
      <ViewStateOverlay
        kind="empty"
        title={pluginsViewCopy.noPluginsTitle}
        description={pluginsViewCopy.noPluginsDescription}
      />
    );
  }

  return (
    <PluginCapabilityTable
      capabilities={capabilities}
      capabilitiesError={capabilitiesError}
      capabilitiesLoading={capabilitiesLoading}
      plugins={PLUGIN_REGISTRY}
    />
  );
}
