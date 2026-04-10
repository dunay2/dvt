import type { ReactNode } from 'react';

import { CheckCircle2, Info, Puzzle, Radio, XCircle } from 'lucide-react';

import { StatusIndicator, ViewHeader, ViewStateOverlay } from '../components/domain';
import {
  RouteWorkbenchFrame,
  routeWorkbenchFieldClassName,
  routeWorkbenchHeaderBandClassName,
  routeWorkbenchMutedTextClassName,
  routeWorkbenchPanelClassName,
  routeWorkbenchSectionTitleClassName,
  routeWorkbenchSubtleTextClassName,
} from '../components/workbench/RouteWorkbenchFrame';
import { Badge } from '../components/ui/badge';
import { Card } from '../components/ui/card';
import { cn } from '../components/ui/utils';
import { resolveString } from '../plugins/contracts/PluginManifest';
import { type PluginContributions, PLUGIN_REGISTRY } from '../plugins/registry';
import { useCapabilitiesQuery } from '../queries/useCapabilitiesQuery';

type PluginSurfaceState = 'ok' | 'degraded' | 'warning' | 'error';

type PluginReadinessItem = {
  readonly key: 'declared' | 'frontend' | 'backend' | 'executable';
  readonly title: string;
  readonly state: PluginSurfaceState;
  readonly label: string;
  readonly detail: string;
};

type PluginReadiness = {
  readonly summary: {
    readonly state: PluginSurfaceState;
    readonly label: string;
    readonly detail: string;
  };
  readonly items: readonly PluginReadinessItem[];
};

const pluginsViewCopy = {
  title: 'Plugins',
  subtitle: 'Inspect registered plugin surfaces, backend probe state, and execution readiness.',
  registeredCount: 'Registered',
  apiVersion: 'API',
  minFrontendVersion: 'Min frontend',
  capabilityProbeTitle: 'Backend capability probe',
  capabilityProbeReady:
    'Backend capabilities responded and the route can evaluate live availability.',
  capabilityProbeLoading: 'Checking backend capability availability.',
  capabilityProbeError:
    'Capability probe unavailable. Backend availability is being derived from frontend declarations only.',
  noPluginsTitle: 'No plugins declared',
  noPluginsDescription:
    'The current runtime does not expose any enabled plugin contributions to the workbench.',
  declaredTitle: 'Declared',
  frontendTitle: 'Frontend runtime',
  backendTitle: 'Backend',
  executableTitle: 'Executable',
  capabilitiesTitle: 'Capabilities',
  nodeKindsTitle: 'Node kinds',
  noCapabilities: 'No explicit capability declarations.',
  noNodeKinds: 'No node-kind registrations.',
} as const;

function formatEnvFlagValue(value: string | boolean | undefined): string {
  if (value == null) {
    return 'unset';
  }

  return String(value);
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

function resolveProbeStatus(
  capabilitiesLoading: boolean,
  capabilitiesError: unknown,
  capabilitiesAvailable: boolean
) {
  if (capabilitiesLoading) {
    return {
      state: 'warning' as const,
      label: 'Checking',
      description: pluginsViewCopy.capabilityProbeLoading,
    };
  }

  if (capabilitiesError) {
    return {
      state: 'degraded' as const,
      label: 'Probe unavailable',
      description: pluginsViewCopy.capabilityProbeError,
    };
  }

  if (capabilitiesAvailable) {
    return {
      state: 'ok' as const,
      label: 'Available',
      description: pluginsViewCopy.capabilityProbeReady,
    };
  }

  return {
    state: 'degraded' as const,
    label: 'Unavailable',
    description: pluginsViewCopy.capabilityProbeError,
  };
}

function resolvePluginReadiness(
  plugin: PluginContributions,
  capabilities:
    | {
        readonly plugins: Record<string, { readonly available: boolean; readonly reason?: string }>;
      }
    | undefined,
  capabilitiesLoading: boolean,
  capabilitiesError: unknown
): PluginReadiness {
  const envFlagValue = plugin.envFlag
    ? (import.meta.env as Record<string, string | boolean | undefined>)[plugin.envFlag]
    : undefined;

  const declared: PluginReadinessItem = {
    key: 'declared',
    title: pluginsViewCopy.declaredTitle,
    state: 'ok',
    label: 'Registered',
    detail: `Static plugin contribution "${plugin.id}" is present in the runtime registry.`,
  };

  const frontend: PluginReadinessItem = {
    key: 'frontend',
    title: pluginsViewCopy.frontendTitle,
    state: 'ok',
    label: 'Loaded',
    detail: plugin.envFlag
      ? `This view only lists plugins loaded into the current frontend runtime. Runtime gate ${plugin.envFlag} = ${formatEnvFlagValue(envFlagValue)}.`
      : 'This view only lists plugins loaded into the current frontend runtime.',
  };

  if (!plugin.backendPluginId) {
    const backend: PluginReadinessItem = {
      key: 'backend',
      title: pluginsViewCopy.backendTitle,
      state: 'ok',
      label: 'Not required',
      detail: 'This plugin does not declare a backend capability handshake.',
    };
    const executable: PluginReadinessItem = {
      key: 'executable',
      title: pluginsViewCopy.executableTitle,
      state: 'ok',
      label: 'Ready',
      detail: 'Frontend registration is sufficient for this plugin surface to execute.',
    };

    return {
      summary: {
        state: executable.state,
        label: executable.label,
        detail: executable.detail,
      },
      items: [declared, frontend, backend, executable],
    };
  }

  const backendInfo = capabilities?.plugins?.[plugin.backendPluginId];

  let backend: PluginReadinessItem;
  let executable: PluginReadinessItem;

  if (capabilitiesLoading) {
    backend = {
      key: 'backend',
      title: pluginsViewCopy.backendTitle,
      state: 'warning',
      label: 'Checking',
      detail: 'Waiting on /api/capabilities before backend availability can be confirmed.',
    };
    executable = {
      key: 'executable',
      title: pluginsViewCopy.executableTitle,
      state: 'warning',
      label: 'Pending',
      detail: 'Execution readiness depends on the backend capability probe.',
    };
  } else if (capabilitiesError) {
    backend = {
      key: 'backend',
      title: pluginsViewCopy.backendTitle,
      state: 'degraded',
      label: 'Probe unavailable',
      detail: 'Capability probe did not respond, so backend availability is currently unknown.',
    };
    executable = {
      key: 'executable',
      title: pluginsViewCopy.executableTitle,
      state: 'degraded',
      label: 'Degraded',
      detail: 'The plugin is declared, but backend execution readiness is not confirmed.',
    };
  } else if (!backendInfo) {
    backend = {
      key: 'backend',
      title: pluginsViewCopy.backendTitle,
      state: 'degraded',
      label: 'Unknown',
      detail: `No capability entry was reported for backend plugin "${plugin.backendPluginId}".`,
    };
    executable = {
      key: 'executable',
      title: pluginsViewCopy.executableTitle,
      state: 'degraded',
      label: 'Degraded',
      detail:
        'The plugin is declared, but the backend did not publish a matching readiness signal.',
    };
  } else if (backendInfo.available) {
    backend = {
      key: 'backend',
      title: pluginsViewCopy.backendTitle,
      state: 'ok',
      label: 'Available',
      detail:
        backendInfo.reason ??
        `Backend plugin "${plugin.backendPluginId}" reported that it is available.`,
    };
    executable = {
      key: 'executable',
      title: pluginsViewCopy.executableTitle,
      state: 'ok',
      label: 'Ready',
      detail: 'Frontend and backend signals both permit this plugin surface to execute.',
    };
  } else {
    backend = {
      key: 'backend',
      title: pluginsViewCopy.backendTitle,
      state: 'error',
      label: 'Blocked',
      detail:
        backendInfo.reason ??
        `Backend plugin "${plugin.backendPluginId}" reported that it is unavailable.`,
    };
    executable = {
      key: 'executable',
      title: pluginsViewCopy.executableTitle,
      state: 'error',
      label: 'Blocked',
      detail: 'Backend availability currently blocks execution for this plugin surface.',
    };
  }

  return {
    summary: {
      state: executable.state,
      label: executable.label,
      detail: executable.detail,
    },
    items: [declared, frontend, backend, executable],
  };
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

export default function PluginsView() {
  const {
    data: capabilities,
    error: capabilitiesError,
    isLoading: capabilitiesLoading,
  } = useCapabilitiesQuery();
  const probeStatus = resolveProbeStatus(
    capabilitiesLoading,
    capabilitiesError,
    capabilities != null
  );

  return (
    <RouteWorkbenchFrame
      header={
        <div data-slot="plugins-view-header-band" className={routeWorkbenchHeaderBandClassName}>
          <ViewHeader
            className="border-0 bg-transparent px-0 py-0"
            title={pluginsViewCopy.title}
            icon={<Puzzle className="size-6 text-[var(--text-muted)]" />}
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
      }
      bodyContainerClassName="space-y-6"
    >
      <Card
        data-slot="plugins-capability-probe"
        className={cn(routeWorkbenchPanelClassName, 'p-4')}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <h2 className="font-semibold text-[var(--text-strong)]">
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

      {PLUGIN_REGISTRY.length === 0 ? (
        <ViewStateOverlay
          kind="empty"
          title={pluginsViewCopy.noPluginsTitle}
          description={pluginsViewCopy.noPluginsDescription}
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {PLUGIN_REGISTRY.map((plugin) => {
            const readiness = resolvePluginReadiness(
              plugin,
              capabilities,
              capabilitiesLoading,
              capabilitiesError
            );

            return (
              <Card
                key={plugin.id}
                data-slot="plugin-card"
                data-plugin-id={plugin.id}
                className={cn(routeWorkbenchPanelClassName, 'p-5')}
              >
                <div className="flex flex-col gap-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-4">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-[color:var(--border-default)] bg-[var(--surface-app)] text-[var(--text-muted)]">
                        <Puzzle className="size-5" />
                      </div>
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="font-semibold text-[var(--text-strong)]">
                            {resolveString(plugin.displayName)}
                          </h2>
                          <Badge
                            variant="outline"
                            className={cn(routeWorkbenchFieldClassName, 'text-xs')}
                          >
                            v{plugin.version}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={cn(
                              routeWorkbenchFieldClassName,
                              'text-xs uppercase tracking-wide'
                            )}
                          >
                            {plugin.kind ?? 'core'}
                          </Badge>
                          {plugin.backendPluginId ? (
                            <Badge
                              variant="outline"
                              className={cn(routeWorkbenchFieldClassName, 'text-xs')}
                            >
                              backend: {plugin.backendPluginId}
                            </Badge>
                          ) : null}
                        </div>
                        <p className={cn('font-mono text-xs', routeWorkbenchSubtleTextClassName)}>
                          {plugin.id}
                        </p>
                      </div>
                    </div>
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
                    <div className="space-y-2">
                      <div className={routeWorkbenchSectionTitleClassName}>
                        {pluginsViewCopy.capabilitiesTitle}
                      </div>
                      {(plugin.capabilities?.length ?? 0) > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {plugin.capabilities?.map((capability) => (
                            <Badge
                              key={capability}
                              variant="outline"
                              className={cn(routeWorkbenchFieldClassName, 'text-xs')}
                            >
                              {capability}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className={cn('text-sm', routeWorkbenchMutedTextClassName)}>
                          {pluginsViewCopy.noCapabilities}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className={routeWorkbenchSectionTitleClassName}>
                        {pluginsViewCopy.nodeKindsTitle}
                      </div>
                      {(plugin.nodeKinds?.length ?? 0) > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {plugin.nodeKinds?.map((kind) => (
                            <Badge
                              key={kind.kind}
                              variant="outline"
                              className={cn(routeWorkbenchFieldClassName, 'font-mono text-[10px]')}
                            >
                              {kind.kind}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className={cn('text-sm', routeWorkbenchMutedTextClassName)}>
                          {pluginsViewCopy.noNodeKinds}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </RouteWorkbenchFrame>
  );
}
