import type { PlatformConnectionState, PlatformHealthSnapshot } from './platformHealthTypes';

export function selectPlatformConnectionState(
  snapshot: PlatformHealthSnapshot | undefined,
  hasQueryError: boolean
): PlatformConnectionState {
  if (hasQueryError || !snapshot) {
    return { rest: 'offline', liveEvents: 'disconnected' };
  }

  const isHealthDegraded = snapshot.healthz.data.status === 'degraded';
  const isReadyDegraded = snapshot.readyz.availability === 'available' && snapshot.readyz.data?.ok === false;
  const isDbDegraded = snapshot.dbReady.availability === 'available' && snapshot.dbReady.data?.ok === false;
  const hasProbeFailure = snapshot.readyz.error !== null || snapshot.version.error !== null || snapshot.dbReady.error !== null;

  const shouldDegrade = isHealthDegraded || isReadyDegraded || isDbDegraded || hasProbeFailure;

  if (shouldDegrade) {
    return { rest: 'degraded', liveEvents: 'polling' };
  }

  return { rest: 'ok', liveEvents: 'polling' };
}

export function isPlatformReady(snapshot: PlatformHealthSnapshot | undefined): boolean {
  if (!snapshot) {
    return false;
  }

  const isHealthHealthy = snapshot.healthz.data.status === 'healthy';
  const isReadyOk = snapshot.readyz.availability !== 'available' || snapshot.readyz.data?.ok === true;
  const isDbOk = snapshot.dbReady.availability !== 'available' || snapshot.dbReady.data?.ok !== false;

  return isHealthHealthy && isReadyOk && isDbOk;
}
