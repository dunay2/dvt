import { useQuery } from '@tanstack/react-query';

import {
  createPlatformHealthCapability,
  type PlatformHealthCapabilityApi,
} from '../application/platformHealthCapability';

const platformHealthCapability = createPlatformHealthCapability();

export const platformHealthQueryKey = ['platform-health', 'snapshot'] as const;

export function createPlatformHealthSnapshotQueryOptions(
  capability: PlatformHealthCapabilityApi = platformHealthCapability
) {
  return {
    queryKey: platformHealthQueryKey,
    queryFn: () => capability.loadSnapshot(),
    refetchInterval: 15_000,
    staleTime: 5_000,
    retry: 1,
  };
}

export function usePlatformHealthSnapshotQuery(
  capability: PlatformHealthCapabilityApi = platformHealthCapability
) {
  return useQuery(createPlatformHealthSnapshotQueryOptions(capability));
}
