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
  routeWorkbenchSectionTitleClassName,
  routeWorkbenchSubtleTextClassName,
} from '../../components/workbench/RouteWorkbenchFrame';
import { resolveString } from '../../plugins/contracts/PluginManifest';
import { type PluginContributions, PLUGIN_REGISTRY } from '../../plugins/registry';

import {
  type PluginCapabilitiesSnapshot,
  type PluginProbeStatus,
  type PluginReadiness,
  type PluginReadinessItem,
  type PluginSurfaceState,
  pluginsViewCopy,
  resolvePluginReadiness,
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
    <div className="grid gap-4 xl:grid-cols-2">
      {PLUGIN_REGISTRY.map((plugin) => (
        <PluginCard
          key={plugin.id}
          plugin={plugin}
          readiness={resolvePluginReadiness(
            plugin,
            capabilities,
            capabilitiesLoading,
            capabilitiesError
          )}
        />
      ))}
    </div>
  );
}

function PluginCard({
  plugin,
  readiness,
}: Readonly<{ plugin: PluginContributions; readiness: PluginReadiness }>) {
  return (
    <Card
      data-slot="plugin-card"
      data-plugin-id={plugin.id}
      className={cn(routeWorkbenchPanelClassName, 'p-5')}
    >
      <div className="flex flex-col gap-5">
        <div className="flex items-start justify-between gap-4">
          <PluginIdentity plugin={plugin} />
          <StatusIndicator
            state={readiness.summary.state}
            label={readiness.summary.label}
            icon={resolveStatusIcon(readiness.summary.state)}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {readiness.items.map((item) => (
            <PluginReadinessCard key={item.key} item={item} />
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <PluginTaxonomySection
            title={pluginsViewCopy.capabilitiesTitle}
            emptyCopy={pluginsViewCopy.noCapabilities}
            values={plugin.capabilities}
          />
          <PluginTaxonomySection
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

function PluginIdentity({ plugin }: Readonly<{ plugin: PluginContributions }>) {
  return (
    <div className="flex min-w-0 items-start gap-4">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-(--border-default) bg-(--surface-app) text-(--text-muted)">
        <Puzzle className="size-5" />
      </div>
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-semibold text-(--text-strong)">
            {resolveString(plugin.displayName)}
          </h2>
          <PluginMetadataBadges plugin={plugin} />
        </div>
        <p className={cn('font-mono text-xs', routeWorkbenchSubtleTextClassName)}>{plugin.id}</p>
      </div>
    </div>
  );
}

function PluginMetadataBadges({ plugin }: Readonly<{ plugin: PluginContributions }>) {
  return (
    <>
      <Badge variant="outline" className={cn(routeWorkbenchFieldClassName, 'text-xs')}>
        v{plugin.version}
      </Badge>
      <Badge
        variant="outline"
        className={cn(routeWorkbenchFieldClassName, 'text-xs uppercase tracking-wide')}
      >
        {plugin.kind ?? 'core'}
      </Badge>
      {plugin.backendPluginId ? (
        <Badge variant="outline" className={cn(routeWorkbenchFieldClassName, 'text-xs')}>
          backend: {plugin.backendPluginId}
        </Badge>
      ) : null}
    </>
  );
}

function PluginReadinessCard({ item }: Readonly<{ item: PluginReadinessItem }>) {
  return (
    <div
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
  );
}

function PluginTaxonomySection({
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
