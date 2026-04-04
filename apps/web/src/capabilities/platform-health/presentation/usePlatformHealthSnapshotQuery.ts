import { useQuery } from '@tanstack/react-query';

import {
  createPlatformHealthCapability,
  type PlatformHealthCapabilityApi,
} from '../application/platformHealthCapability';
import type { PlatformHealthSnapshot } from '../domain/platformHealthTypes';
import {
  getShellHealthPollingIntervalMs,
  PLATFORM_HEALTH_BASE_POLL_INTERVAL_MS,
} from './platformHealthStatus';

const platformHealthCapability = createPlatformHealthCapability();

export const platformHealthQueryKey = ['platform-health', 'snapshot'] as const;
export const PLATFORM_HEALTH_REFETCH_INTERVAL_MS = PLATFORM_HEALTH_BASE_POLL_INTERVAL_MS;

export function createPlatformHealthSnapshotQueryOptions(
  capability: PlatformHealthCapabilityApi = platformHealthCapability
) {
  return {
    queryKey: platformHealthQueryKey,
    queryFn: () => capability.loadSnapshot(),
    refetchInterval: (query: {
      state: { data: unknown; status: 'pending' | 'error' | 'success'; fetchFailureCount: number };
    }) =>
      getShellHealthPollingIntervalMs(
        query.state.data as PlatformHealthSnapshot | undefined,
        query.state.status === 'error',
        query.state.fetchFailureCount
      ),
    staleTime: 5_000,
    retry: 1,
  };
}

export function usePlatformHealthSnapshotQuery(
  capability: PlatformHealthCapabilityApi = platformHealthCapability
) {
  return useQuery(createPlatformHealthSnapshotQueryOptions(capability));
}
