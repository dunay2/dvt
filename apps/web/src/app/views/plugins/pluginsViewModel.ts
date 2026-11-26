/** Owned concern: project Plugins capability data into structured readiness states. */
import type { RuntimeCapabilitiesDto } from '../../../capabilities/runtime-capabilities/contracts/runtimeCapabilitiesDtos';
import type { PluginCatalogReconciliation } from './pluginCatalogReconciliation';
import type { PluginsViewCopy } from './pluginsViewCopy';

export type PluginCapabilitiesSnapshot = RuntimeCapabilitiesDto;

export type PluginBackendState =
  | 'available'
  | 'unavailable'
  | 'unknown'
  | 'pending'
  | 'probe-unavailable'
  | 'not-required'
  | 'not-bound';

export type PluginOperationalState = 'ready' | 'blocked' | 'degraded' | 'pending' | 'unbound';

type Status = Readonly<{
  state: 'ok' | 'degraded' | 'warning' | 'error';
  label: string;
}>;

export type PluginProbeStatus = Status & Readonly<{ description?: string }>;

type BackendSnapshot = Pick<PluginCapabilitiesSnapshot, 'plugins'> | undefined;

const outcomes = {
  available: { label: 'availableLabel', operational: 'ready' },
  unavailable: { label: 'blockedLabel', operational: 'blocked' },
  unknown: { label: 'unknownLabel', operational: 'degraded' },
  pending: { label: 'checkingLabel', operational: 'pending' },
  'probe-unavailable': { label: 'probeUnavailableLabel', operational: 'degraded' },
  'not-required': { label: 'notRequiredLabel', operational: 'ready' },
  'not-bound': { label: 'notBoundLabel', operational: 'unbound' },
} as const satisfies Record<
  PluginBackendState,
  { label: keyof PluginsViewCopy; operational: PluginOperationalState }
>;

const operationalStatus = {
  ready: { state: 'ok', label: 'readyLabel' },
  blocked: { state: 'error', label: 'blockedLabel' },
  degraded: { state: 'degraded', label: 'degradedLabel' },
  pending: { state: 'warning', label: 'pendingLabel' },
  unbound: { state: 'error', label: 'unboundLabel' },
} as const satisfies Record<
  PluginOperationalState,
  { state: Status['state']; label: keyof PluginsViewCopy }
>;

export function resolveProbeStatus(
  loading: boolean,
  error: unknown,
  available: boolean,
  copy: PluginsViewCopy
): PluginProbeStatus {
  if (loading) {
    return {
      state: 'warning',
      label: copy.checkingLabel,
      description: copy.capabilityProbeLoading,
    };
  }
  if (error || !available) {
    return {
      state: 'degraded',
      label: copy.probeUnavailableLabel,
      description: copy.capabilityProbeError,
    };
  }
  return { state: 'ok', label: copy.availableLabel };
}

function resolveBackendState(
  entry: PluginCatalogReconciliation,
  capabilities: BackendSnapshot,
  loading: boolean,
  error: unknown
): PluginBackendState {
  if (entry.runtimeShape === 'unbound') return 'not-bound';
  if (entry.runtimeShape === 'frontend-only') return 'not-required';
  if (loading) return 'pending';
  if (error) return 'probe-unavailable';
  const capability = capabilities?.plugins[entry.backendPluginId];
  if (!capability) return 'unknown';
  return capability.available ? 'available' : 'unavailable';
}

function backendDiagnostic(
  backendState: PluginBackendState,
  backendId: string | undefined,
  capabilities: BackendSnapshot,
  copy: PluginsViewCopy
): string | undefined {
  if (backendState === 'not-bound') return copy.unboundDetail;
  if (backendId == null) return undefined;
  if (backendState === 'unknown') return copy.backendUnknownDetail(backendId);
  const reason = capabilities?.plugins[backendId]?.reason;
  if (backendState === 'unavailable') {
    return reason ?? copy.backendUnavailableDetail(backendId);
  }
  if (backendState === 'available') return reason;
  return undefined;
}

export function resolvePluginReadiness(
  entry: PluginCatalogReconciliation,
  {
    capabilities,
    loading,
    error,
  }: Readonly<{
    capabilities: BackendSnapshot;
    loading: boolean;
    error: unknown;
  }>,
  copy: PluginsViewCopy
) {
  const backendState = resolveBackendState(entry, capabilities, loading, error);
  const outcome = outcomes[backendState];
  const summary = operationalStatus[outcome.operational];
  return {
    frontendPresence: entry.frontendPresence,
    runtimeShape: entry.runtimeShape,
    frontendLabel:
      entry.frontendPresence === 'registered' ? copy.loadedLabel : copy.notRegisteredLabel,
    backendState,
    backendLabel: copy[outcome.label],
    operationalState: outcome.operational,
    summary: { state: summary.state, label: copy[summary.label] },
    diagnostic: backendDiagnostic(backendState, entry.backendPluginId, capabilities, copy),
  };
}
