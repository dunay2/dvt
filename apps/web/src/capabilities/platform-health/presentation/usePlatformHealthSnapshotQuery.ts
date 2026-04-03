import { useQuery } from '@tanstack/react-query';

import {
  createPlatformHealthCapability,
  type PlatformHealthCapabilityApi,
} from '../application/platformHealthCapability';

const platformHealthCapability = createPlatformHealthCapability();

export const platformHealthQueryKey = ['platform-health', 'snapshot'] as const;
export const PLATFORM_HEALTH_REFETCH_INTERVAL_MS = 15_000;

export function createPlatformHealthSnapshotQueryOptions(
  capability: PlatformHealthCapabilityApi = platformHealthCapability
) {
  return {
    queryKey: platformHealthQueryKey,
    queryFn: () => capability.loadSnapshot(),
    refetchInterval: PLATFORM_HEALTH_REFETCH_INTERVAL_MS,
    staleTime: 5_000,
    retry: 1,
  };
}

export function usePlatformHealthSnapshotQuery(
  capability: PlatformHealthCapabilityApi = platformHealthCapability
) {
  return useQuery(createPlatformHealthSnapshotQueryOptions(capability));
}
