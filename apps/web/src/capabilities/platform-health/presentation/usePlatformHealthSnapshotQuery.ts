import { useQuery } from '@tanstack/react-query';

import { createPlatformHealthCapability } from '../application/platformHealthCapability';

const platformHealthCapability = createPlatformHealthCapability();

export const platformHealthQueryKey = ['platform-health', 'snapshot'] as const;

export function usePlatformHealthSnapshotQuery() {
  return useQuery({
    queryKey: platformHealthQueryKey,
    queryFn: () => platformHealthCapability.loadSnapshot(),
    refetchInterval: 15_000,
    staleTime: 5_000,
    retry: 1,
  });
}
