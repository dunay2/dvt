/** Owned concern: project observed Admin read models without inventing operational facts. */
import {
  buildShellHealthPresentationModel,
  type OptionalEndpointProbe,
  type PlatformDatabaseReadiness,
  type PlatformReadinessInfo,
  type PlatformVersionInfo,
  type PlatformConnectionState,
  type PlatformHealthSnapshot,
} from '../../../capabilities/platform-health';
import type { AuditLogEntry, Role } from '../../types/dbt';

export type AdminStatusTone = 'neutral' | 'success' | 'warning' | 'danger';
export type AdminHealthQueryState = Parameters<typeof buildShellHealthPresentationModel>[0];
export type AdminProbePresentation = Readonly<{
  endpoint: string;
  status: string;
  tone: AdminStatusTone;
  detail: string;
  statusCode: number | null;
  latencyMs: number | null;
}>;
export type AdminPlatformHealthPresentation = Readonly<{
  backend: Readonly<{ status: string; tone: AdminStatusTone; detail: string }>;
  probes: Readonly<Record<'healthz' | 'readyz' | 'version' | 'dbReady', AdminProbePresentation>>;
  apiBaseUrl: string | null;
  fetchedAt: string | null;
  refreshing: boolean;
  stale: boolean;
}>;

type OptionalProbe = OptionalEndpointProbe<
  PlatformReadinessInfo | PlatformVersionInfo | PlatformDatabaseReadiness
>;

function projectOptionalProbe(
  probe: OptionalProbe | undefined,
  endpoint: string,
  pending: boolean
): AdminProbePresentation {
  const facts = {
    endpoint,
    statusCode: probe?.statusCode ?? null,
    latencyMs: probe?.latencyMs ?? null,
  };
  if (probe == null)
    return {
      ...facts,
      status: pending ? 'Checking' : 'No observation',
      tone: 'neutral',
      detail: pending
        ? 'Waiting for the platform snapshot.'
        : 'No endpoint observation is available.',
    };
  if (probe.availability === 'not_enabled')
    return {
      ...facts,
      status: probe.statusCode == null ? 'Not requested' : 'Not exposed',
      tone: 'neutral',
      detail:
        probe.statusCode == null
          ? 'Excluded by client probe configuration.'
          : `Optional endpoint returned HTTP ${probe.statusCode}.`,
    };
  const data = probe.data;
  if (probe.error != null) {
    if (probe.statusCode === 503 && data != null && 'ok' in data && data.ok === false) {
      const reason = 'reasonCode' in data ? data.reasonCode : 'reason' in data ? data.reason : null;
      return {
        ...facts,
        status: 'Not ready',
        tone: 'warning',
        detail: reason ?? probe.error.message,
      };
    }
    return {
      ...facts,
      status:
        probe.statusCode === 401 || probe.statusCode === 403 ? 'Access denied' : 'Probe failed',
      tone: 'danger',
      detail: probe.error.message,
    };
  }
  if (data == null)
    return {
      ...facts,
      status: 'No observation',
      tone: 'neutral',
      detail: 'The endpoint returned no diagnostic data.',
    };
  if ('version' in data && typeof data.version === 'string' && data.version.trim() !== '')
    return { ...facts, status: data.version, tone: 'success', detail: `API service: ${data.name}` };
  if ('ok' in data && data.ok === true)
    return {
      ...facts,
      status: 'Ready',
      tone: 'success',
      detail: 'The endpoint reports readiness.',
    };
  if ('ok' in data && data.ok === false) {
    const reason = 'reasonCode' in data ? data.reasonCode : 'reason' in data ? data.reason : null;
    return {
      ...facts,
      status: 'Not ready',
      tone: 'warning',
      detail: reason ?? 'The endpoint reports that readiness is not satisfied.',
    };
  }
  return {
    ...facts,
    status: 'No observation',
    tone: 'neutral',
    detail: 'The endpoint returned incomplete diagnostic data.',
  };
}

function projectHealthz(
  snapshot: PlatformHealthSnapshot | undefined,
  pending: boolean
): AdminProbePresentation {
  const probe = snapshot?.healthz;
  if (probe == null)
    return {
      endpoint: '/healthz',
      status: pending ? 'Checking' : 'No observation',
      tone: 'neutral',
      detail: pending
        ? 'Waiting for the platform snapshot.'
        : 'No endpoint observation is available.',
      statusCode: null,
      latencyMs: null,
    };
  const reconciler = probe.data.components.intentReconciler;
  return {
    endpoint: probe.endpoint,
    status: probe.data.status === 'healthy' ? 'Healthy' : 'Degraded',
    tone: probe.data.status === 'healthy' ? 'success' : 'warning',
    detail: `Intent reconciler: ${reconciler.status}${'reasonCode' in reconciler ? ` (${reconciler.reasonCode})` : ''}`,
    statusCode: probe.statusCode,
    latencyMs: probe.latencyMs,
  };
}

/** Summary and details consume this same observation; a failed refresh is explicitly historical. */
export function buildAdminPlatformHealthPresentation(
  input: AdminHealthQueryState
): AdminPlatformHealthPresentation {
  const shell = buildShellHealthPresentationModel(input);
  const pending = shell.isInitialHealthCheckPending;
  const stale = input.data !== undefined && input.isError;
  const error =
    input.error instanceof Error ? input.error.message : 'Platform snapshot query failed.';
  const currentProbes = {
    healthz: projectHealthz(input.data, pending),
    readyz: projectOptionalProbe(input.data?.readyz, '/readyz', pending),
    version: projectOptionalProbe(input.data?.version, '/version', pending),
    dbReady: projectOptionalProbe(input.data?.dbReady, '/db/ready', pending),
  };
  const historical = (probe: AdminProbePresentation): AdminProbePresentation =>
    stale
      ? {
          ...probe,
          status: `Last observed: ${probe.status}`,
          tone: 'neutral',
          detail: `${probe.detail} Refresh failed; observation from ${input.data!.fetchedAt}.`,
        }
      : probe;
  const connection = shell.connectionState;
  const backend: AdminPlatformHealthPresentation['backend'] = pending
    ? { status: 'Checking', tone: 'neutral', detail: 'Waiting for the platform snapshot.' }
    : stale
      ? { status: 'Refresh failed', tone: 'danger', detail: error }
      : input.data == null && !input.isError
        ? {
            status: 'Not checked',
            tone: 'neutral',
            detail: 'No platform observation is available.',
          }
        : {
            status: getBackendStatusLabel(connection?.rest ?? 'offline'),
            tone:
              connection?.rest === 'ok'
                ? 'success'
                : connection?.rest === 'degraded'
                  ? 'warning'
                  : 'danger',
            detail:
              shell.connectionDetail ??
              (connection == null
                ? error
                : `REST: ${connection.rest} · events: ${connection.liveEvents}`),
          };
  return {
    backend,
    probes: {
      healthz: historical(currentProbes.healthz),
      readyz: historical(currentProbes.readyz),
      version: historical(currentProbes.version),
      dbReady: historical(currentProbes.dbReady),
    },
    apiBaseUrl: input.data?.apiBaseUrl ?? null,
    fetchedAt: input.data?.fetchedAt ?? null,
    refreshing: input.isFetching && !pending,
    stale,
  };
}

export function getBackendStatusLabel(restStatus: PlatformConnectionState['rest']): string {
  switch (restStatus) {
    case 'ok':
      return 'Online';
    case 'degraded':
      return 'Degraded';
    default:
      return 'Offline';
  }
}

export function getCapabilitiesEmptyState(isLoading: boolean, hasError: boolean): string {
  if (isLoading) {
    return 'Loading capabilities...';
  }
  if (hasError) {
    return 'Capabilities endpoint unavailable.';
  }
  return 'No capability data.';
}

export function filterAuditEntries(
  auditLog: readonly AuditLogEntry[],
  searchQuery: string
): AuditLogEntry[] {
  const normalizedQuery = searchQuery.trim().toLowerCase();
  if (!normalizedQuery) {
    return [...auditLog];
  }
  return auditLog.filter(
    (entry) =>
      entry.user.toLowerCase().includes(normalizedQuery) ||
      entry.action.toLowerCase().includes(normalizedQuery) ||
      entry.resource.toLowerCase().includes(normalizedQuery)
  );
}

export function getRolePermissionLabel(permissionKey: keyof Role['permissions']): string {
  return permissionKey
    .replace('can', '')
    .replaceAll(/([A-Z])/g, ' $1')
    .trim();
}
