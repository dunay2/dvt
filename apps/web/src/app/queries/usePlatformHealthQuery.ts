import { useQuery } from '@tanstack/react-query';

import { createPlatformClient } from '../services/platform/platformClient';
import type { PlatformHealthSnapshot } from '../services/platform/types';

const platformClient = createPlatformClient();

export const platformHealthQueryKey = ['platform', 'health'] as const;

export type ConnectionStatus = {
  rest: 'ok' | 'degraded' | 'offline';
  liveEvents: 'connected' | 'polling' | 'disconnected';
};

export function deriveConnectionStatus(
  snapshot: PlatformHealthSnapshot | undefined,
  queryHasError: boolean
): ConnectionStatus {
  if (queryHasError || !snapshot) {
    return { rest: 'offline', liveEvents: 'disconnected' };
  }

  const isReadyDegraded = snapshot.readyz.available && snapshot.readyz.data?.ok === false;
  const isDbDegraded = snapshot.dbReady.available && snapshot.dbReady.data?.ok === false;
  const hasOptionalEndpointError =
    snapshot.readyz.error !== null ||
    snapshot.version.error !== null ||
    snapshot.dbReady.error !== null;

  if (
    snapshot.healthz.data.status === 'degraded' ||
    isReadyDegraded ||
    isDbDegraded ||
    hasOptionalEndpointError
  ) {
    return { rest: 'degraded', liveEvents: 'polling' };
  }

  return { rest: 'ok', liveEvents: 'polling' };
}

export function usePlatformHealthQuery() {
  return useQuery({
    queryKey: platformHealthQueryKey,
    queryFn: () => platformClient.getPlatformHealthSnapshot(),
    refetchInterval: 15_000,
    staleTime: 5_000,
    retry: 1,
  });
}
