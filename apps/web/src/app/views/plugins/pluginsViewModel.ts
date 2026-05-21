/** Owned concern: model Plugins route readiness copy and capability-derived state. */
import { type PluginContributions } from '../../plugins/registry';

export type PluginSurfaceState = 'ok' | 'degraded' | 'warning' | 'error';

export type PluginReadinessItem = {
  readonly key: 'declared' | 'frontend' | 'backend' | 'executable';
  readonly title: string;
  readonly state: PluginSurfaceState;
  readonly label: string;
  readonly detail: string;
};

export type PluginReadiness = {
  readonly summary: {
    readonly state: PluginSurfaceState;
    readonly label: string;
    readonly detail: string;
  };
  readonly items: readonly PluginReadinessItem[];
};

export type PluginCapabilitiesSnapshot = {
  readonly apiVersion: string;
  readonly minFrontendVersion: string;
  readonly plugins: Record<string, { readonly available: boolean; readonly reason?: string }>;
};

export type PluginProbeStatus = {
  readonly state: PluginSurfaceState;
  readonly label: string;
  readonly description: string;
};

export const pluginsViewCopy = {
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

export function resolveProbeStatus(
  capabilitiesLoading: boolean,
  capabilitiesError: unknown,
  capabilitiesAvailable: boolean
): PluginProbeStatus {
  if (capabilitiesLoading) {
    return {
      state: 'warning',
      label: 'Checking',
      description: pluginsViewCopy.capabilityProbeLoading,
    };
  }

  if (capabilitiesError) {
    return {
      state: 'degraded',
      label: 'Probe unavailable',
      description: pluginsViewCopy.capabilityProbeError,
    };
  }

  if (capabilitiesAvailable) {
    return {
      state: 'ok',
      label: 'Available',
      description: pluginsViewCopy.capabilityProbeReady,
    };
  }

  return {
    state: 'degraded',
    label: 'Unavailable',
    description: pluginsViewCopy.capabilityProbeError,
  };
}

export function resolvePluginReadiness(
  plugin: PluginContributions,
  capabilities: Pick<PluginCapabilitiesSnapshot, 'plugins'> | undefined,
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
