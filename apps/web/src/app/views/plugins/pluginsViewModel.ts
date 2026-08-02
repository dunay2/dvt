/** Owned concern: project Plugins route capability state into truthful readiness semantics. */
import type {
  PluginCatalogReconciliation,
  PluginFrontendPresence,
  PluginRuntimeShape,
} from './pluginCatalogReconciliation';
import { resolvePluginsViewCopy, type PluginsViewCopy } from './pluginsViewCopy';

export type PluginSurfaceState = 'ok' | 'degraded' | 'warning' | 'error';

export type PluginBackendState =
  | 'available'
  | 'unavailable'
  | 'unknown'
  | 'pending'
  | 'probe-unavailable'
  | 'not-required'
  | 'not-bound';

export type PluginOperationalState = 'ready' | 'blocked' | 'degraded' | 'pending' | 'unbound';

export type PluginReadinessItem = {
  readonly key: 'declared' | 'frontend' | 'backend' | 'executable';
  readonly title: string;
  readonly state: PluginSurfaceState;
  readonly label: string;
  readonly detail: string;
};

export type PluginReadiness = {
  readonly frontendPresence: PluginFrontendPresence;
  readonly backendState: PluginBackendState;
  readonly runtimeShape: PluginRuntimeShape;
  readonly operationalState: PluginOperationalState;
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

function formatEnvFlagValue(value: string | boolean | undefined): string {
  return value == null ? 'unset' : String(value);
}

export function resolveProbeStatus(
  capabilitiesLoading: boolean,
  capabilitiesError: unknown,
  capabilitiesAvailable: boolean,
  copy: PluginsViewCopy = resolvePluginsViewCopy()
): PluginProbeStatus {
  if (capabilitiesLoading) {
    return {
      state: 'warning',
      label: copy.checkingLabel,
      description: copy.capabilityProbeLoading,
    };
  }

  if (capabilitiesError) {
    return {
      state: 'degraded',
      label: copy.probeUnavailableLabel,
      description: copy.capabilityProbeError,
    };
  }

  if (capabilitiesAvailable) {
    return {
      state: 'ok',
      label: copy.availableLabel,
      description: copy.capabilityProbeReady,
    };
  }

  return {
    state: 'degraded',
    label: copy.unavailableLabel,
    description: copy.capabilityProbeError,
  };
}

function resolveFrontendItem(
  entry: PluginCatalogReconciliation,
  copy: PluginsViewCopy
): PluginReadinessItem {
  const contribution = entry.localContribution;
  if (!contribution) {
    return {
      key: 'frontend',
      title: copy.frontendTitle,
      state: entry.runtimeShape === 'unbound' ? 'error' : 'warning',
      label: copy.notRegisteredLabel,
      detail: copy.frontendNotRegisteredDetail,
    };
  }

  const envFlagValue = contribution.envFlag
    ? (import.meta.env as Record<string, string | boolean | undefined>)[contribution.envFlag]
    : undefined;

  return {
    key: 'frontend',
    title: copy.frontendTitle,
    state: 'ok',
    label: copy.loadedLabel,
    detail: copy.frontendLoadedDetail(
      contribution.envFlag,
      contribution.envFlag ? formatEnvFlagValue(envFlagValue) : undefined
    ),
  };
}

function readinessResult(
  entry: PluginCatalogReconciliation,
  backendState: PluginBackendState,
  operationalState: PluginOperationalState,
  catalog: PluginReadinessItem,
  frontend: PluginReadinessItem,
  backend: PluginReadinessItem,
  operational: PluginReadinessItem
): PluginReadiness {
  return {
    frontendPresence: entry.frontendPresence,
    backendState,
    runtimeShape: entry.runtimeShape,
    operationalState,
    summary: {
      state: operational.state,
      label: operational.label,
      detail: operational.detail,
    },
    items: [catalog, frontend, backend, operational],
  };
}

export function resolvePluginReadiness(
  entry: PluginCatalogReconciliation,
  capabilities: Pick<PluginCapabilitiesSnapshot, 'plugins'> | undefined,
  capabilitiesLoading: boolean,
  capabilitiesError: unknown,
  copy: PluginsViewCopy = resolvePluginsViewCopy()
): PluginReadiness {
  const catalog: PluginReadinessItem = {
    key: 'declared',
    title: copy.catalogTitle,
    state: 'ok',
    label: copy.cataloguedLabel,
    detail: copy.catalogEntryDetail(entry.catalog.id),
  };
  const frontend = resolveFrontendItem(entry, copy);

  if (entry.runtimeShape === 'unbound') {
    const backend: PluginReadinessItem = {
      key: 'backend',
      title: copy.backendTitle,
      state: 'error',
      label: copy.notBoundLabel,
      detail: copy.unboundBackendDetail,
    };
    const operational: PluginReadinessItem = {
      key: 'executable',
      title: copy.operationalTitle,
      state: 'error',
      label: copy.unboundLabel,
      detail: copy.unboundOperationalDetail,
    };

    return readinessResult(entry, 'not-bound', 'unbound', catalog, frontend, backend, operational);
  }

  if (entry.runtimeShape === 'frontend-only') {
    const backend: PluginReadinessItem = {
      key: 'backend',
      title: copy.backendTitle,
      state: 'ok',
      label: copy.notRequiredLabel,
      detail: copy.backendNotRequiredDetail,
    };
    const operational: PluginReadinessItem = {
      key: 'executable',
      title: copy.operationalTitle,
      state: 'ok',
      label: copy.readyLabel,
      detail: copy.frontendOnlyReadyDetail,
    };

    return readinessResult(entry, 'not-required', 'ready', catalog, frontend, backend, operational);
  }

  const backendPluginId = entry.backendPluginId;
  const backendInfo = capabilities?.plugins?.[backendPluginId];

  if (capabilitiesLoading) {
    const backend: PluginReadinessItem = {
      key: 'backend',
      title: copy.backendTitle,
      state: 'warning',
      label: copy.checkingLabel,
      detail: copy.backendCheckingDetail,
    };
    const operational: PluginReadinessItem = {
      key: 'executable',
      title: copy.operationalTitle,
      state: 'warning',
      label: copy.pendingLabel,
      detail: copy.backendPendingDetail,
    };
    return readinessResult(entry, 'pending', 'pending', catalog, frontend, backend, operational);
  }

  if (capabilitiesError) {
    const backend: PluginReadinessItem = {
      key: 'backend',
      title: copy.backendTitle,
      state: 'degraded',
      label: copy.probeUnavailableLabel,
      detail: copy.backendProbeUnavailableDetail,
    };
    const operational: PluginReadinessItem = {
      key: 'executable',
      title: copy.operationalTitle,
      state: 'degraded',
      label: copy.degradedLabel,
      detail: copy.operationalProbeUnavailableDetail,
    };
    return readinessResult(
      entry,
      'probe-unavailable',
      'degraded',
      catalog,
      frontend,
      backend,
      operational
    );
  }

  if (!backendInfo) {
    const backend: PluginReadinessItem = {
      key: 'backend',
      title: copy.backendTitle,
      state: 'degraded',
      label: copy.unknownLabel,
      detail: copy.backendUnknownDetail(backendPluginId),
    };
    const operational: PluginReadinessItem = {
      key: 'executable',
      title: copy.operationalTitle,
      state: 'degraded',
      label: copy.degradedLabel,
      detail: copy.operationalUnknownDetail,
    };
    return readinessResult(entry, 'unknown', 'degraded', catalog, frontend, backend, operational);
  }

  if (backendInfo.available) {
    const backend: PluginReadinessItem = {
      key: 'backend',
      title: copy.backendTitle,
      state: 'ok',
      label: copy.availableLabel,
      detail: backendInfo.reason ?? copy.backendAvailableDetail(backendPluginId),
    };
    const operational: PluginReadinessItem = {
      key: 'executable',
      title: copy.operationalTitle,
      state: 'ok',
      label: copy.readyLabel,
      detail:
        entry.runtimeShape === 'backend-only'
          ? copy.backendOnlyReadyDetail
          : copy.operationalReadyDetail,
    };
    return readinessResult(entry, 'available', 'ready', catalog, frontend, backend, operational);
  }

  const backend: PluginReadinessItem = {
    key: 'backend',
    title: copy.backendTitle,
    state: 'error',
    label: copy.blockedLabel,
    detail: backendInfo.reason ?? copy.backendUnavailableDetail(backendPluginId),
  };
  const operational: PluginReadinessItem = {
    key: 'executable',
    title: copy.operationalTitle,
    state: 'error',
    label: copy.blockedLabel,
    detail: copy.operationalBlockedDetail,
  };
  return readinessResult(entry, 'unavailable', 'blocked', catalog, frontend, backend, operational);
}
