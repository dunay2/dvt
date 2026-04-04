import type {
  PlatformConnectionState,
  PlatformHealthSnapshot,
} from '../domain/platformHealthTypes';

const MAX_RETRY_BACKOFF_MS = 60_000;

export function getPlatformHealthErrorMessageFromQuery(
  isError: boolean,
  error: unknown
): string | null {
  if (!isError) {
    return null;
  }

  return error instanceof Error ? error.message : 'Unknown platform health query error';
}

function getDegradedReason(snapshot: PlatformHealthSnapshot | undefined): string {
  if (!snapshot) {
    return 'Platform probes are unavailable.';
  }

  if (snapshot.healthz.data.status === 'degraded') {
    const intentReconciler = snapshot.healthz.data.components.intentReconciler;
    return intentReconciler.status === 'degraded'
      ? `Intent reconciler degraded: ${intentReconciler.reasonCode}.`
      : 'The /healthz endpoint reports degraded platform status.';
  }

  if (snapshot.readyz.availability === 'available' && snapshot.readyz.data?.ok === false) {
    return `Readiness not satisfied: ${snapshot.readyz.data.reasonCode}.`;
  }

  if (snapshot.dbReady.availability === 'available' && snapshot.dbReady.data?.ok === false) {
    return `Database readiness failed: ${snapshot.dbReady.data.reason ?? 'unknown reason'}.`;
  }

  const failedOptionalProbe = [snapshot.readyz, snapshot.version, snapshot.dbReady].find(
    (probe) => probe.error !== null
  );

  if (failedOptionalProbe?.error) {
    return `${failedOptionalProbe.endpoint} probe failed: ${failedOptionalProbe.error.message}`;
  }

  return 'Platform is degraded.';
}

export function getPlatformConnectionDetail(
  restStatus: PlatformConnectionState['rest'],
  snapshot: PlatformHealthSnapshot | undefined,
  errorMessage: string | null
): string | null {
  if (restStatus === 'offline') {
    return errorMessage ?? 'Unable to reach /healthz.';
  }

  if (restStatus === 'degraded') {
    return getDegradedReason(snapshot);
  }

  return null;
}

export function getNextRetryDelayMs(currentDelayMs: number): number {
  return Math.min(currentDelayMs * 2, MAX_RETRY_BACKOFF_MS);
}
