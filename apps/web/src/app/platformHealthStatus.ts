import type {
  PlatformConnectionState,
  PlatformHealthSnapshot,
} from '../capabilities/platform-health';

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

export function getDegradedReason(snapshot: PlatformHealthSnapshot | undefined): string {
  if (!snapshot) {
    return 'Platform probes are unavailable.';
  }

  if (snapshot.healthz.data.status === 'degraded') {
    const reconciler = snapshot.healthz.data.components.intentReconciler;
    if (reconciler.status === 'degraded') {
      return `Intent reconciler degraded (${reconciler.reasonCode}).`;
    }
    return 'Health endpoint reports degraded state.';
  }

  if (snapshot.readyz.availability === 'available' && snapshot.readyz.data?.ok === false) {
    return `Readiness is not ready (${snapshot.readyz.data.reasonCode}).`;
  }

  if (snapshot.dbReady.availability === 'available' && snapshot.dbReady.data?.ok === false) {
    return snapshot.dbReady.data.reason
      ? `Database readiness failed (${snapshot.dbReady.data.reason}).`
      : 'Database readiness failed.';
  }

  const optionalProbeError = snapshot.readyz.error ?? snapshot.version.error ?? snapshot.dbReady.error;
  if (optionalProbeError) {
    return optionalProbeError.message;
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

