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
import type { PluginCapabilityId } from '../../plugins/contracts/PluginManifest';
import { PLUGIN_REGISTRY, type PluginContributions } from '../../plugins/registry';
import type { Plugin } from '../../types/dbt';

import { PluginCapabilityTable } from './PluginCapabilityTable';
import {
  type PluginCapabilitiesSnapshot,
  type PluginProbeStatus,
  type PluginSurfaceState,
  pluginsViewCopy,
} from './pluginsViewModel';

type PluginsViewHeaderProps = Readonly<{
  capabilities: PluginCapabilitiesSnapshot | undefined;
  pluginCatalog: readonly Plugin[] | undefined;
}>;

export function PluginsViewHeader({ capabilities, pluginCatalog }: PluginsViewHeaderProps) {
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
              {pluginsViewCopy.catalogCount}: {pluginCatalog?.length ?? 'n/a'}
            </Badge>
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
  pluginCatalog,
  pluginCatalogError,
  pluginCatalogLoading,
  probeStatus,
}: Readonly<{
  capabilities: PluginCapabilitiesSnapshot | undefined;
  capabilitiesError: unknown;
  capabilitiesLoading: boolean;
  pluginCatalog: readonly Plugin[] | undefined;
  pluginCatalogError: unknown;
  pluginCatalogLoading: boolean;
  probeStatus: PluginProbeStatus;
}>) {
  return (
    <>
      <PluginCapabilityProbeCard capabilities={capabilities} probeStatus={probeStatus} />
      <PluginRegistryContent
        capabilities={capabilities}
        capabilitiesError={capabilitiesError}
        capabilitiesLoading={capabilitiesLoading}
        pluginCatalog={pluginCatalog}
        pluginCatalogError={pluginCatalogError}
        pluginCatalogLoading={pluginCatalogLoading}
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

function pluginCapabilities(plugin: Plugin): PluginCapabilityId[] {
  return plugin.capabilities as PluginCapabilityId[];
}

function applyCatalogOverlay(
  base: PluginContributions,
  plugin: Plugin,
  backendPluginId: string | undefined
): PluginContributions {
  const next: PluginContributions = {
    ...base,
    id: plugin.id,
    displayName: plugin.name,
    version: plugin.version,
    capabilities: pluginCapabilities(plugin),
  };

  if (backendPluginId) {
    return {
      ...next,
      backendPluginId,
    };
  }

  return next;
}

function toCatalogContribution(plugin: Plugin): PluginContributions {
  return applyCatalogOverlay(
    {
      id: plugin.id,
      displayName: plugin.name,
      version: plugin.version,
      capabilities: pluginCapabilities(plugin),
    },
    plugin,
    plugin.backendPluginId
  );
}

function mergePluginCatalogWithLocalContributions(
  pluginCatalog: readonly Plugin[]
): PluginContributions[] {
  const localById = new Map(PLUGIN_REGISTRY.map((plugin) => [plugin.id, plugin]));

  return pluginCatalog.map((catalogPlugin) => {
    const local = localById.get(catalogPlugin.id);
    return applyCatalogOverlay(
      local ?? toCatalogContribution(catalogPlugin),
      catalogPlugin,
      catalogPlugin.backendPluginId ?? local?.backendPluginId
    );
  });
}

function PluginRegistryContent({
  capabilities,
  capabilitiesError,
  capabilitiesLoading,
  pluginCatalog,
  pluginCatalogError,
  pluginCatalogLoading,
}: Readonly<{
  capabilities: PluginCapabilitiesSnapshot | undefined;
  capabilitiesError: unknown;
  capabilitiesLoading: boolean;
  pluginCatalog: readonly Plugin[] | undefined;
  pluginCatalogError: unknown;
  pluginCatalogLoading: boolean;
}>) {
  if (pluginCatalogLoading) {
    return (
      <ViewStateOverlay
        kind="loading"
        title={pluginsViewCopy.pluginCatalogLoadingTitle}
        description={pluginsViewCopy.pluginCatalogLoadingDescription}
      />
    );
  }

  if (pluginCatalogError) {
    return (
      <ViewStateOverlay
        kind="error"
        title={pluginsViewCopy.pluginCatalogErrorTitle}
        description={pluginsViewCopy.pluginCatalogErrorDescription}
      />
    );
  }

  const plugins = mergePluginCatalogWithLocalContributions(pluginCatalog ?? []);

  if (plugins.length === 0) {
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
      plugins={plugins}
    />
  );
}
