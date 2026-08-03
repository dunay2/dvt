import { useQuery } from '@tanstack/react-query';

import type { RuntimeCapabilitiesDto } from '../../capabilities/runtime-capabilities';
import type { CapabilitiesPort } from '../ports/capabilities';
import { useCapabilitiesPort } from '../services/AppServicesContext';
import { queryKeys } from './queryKeys';

export type CapabilitiesResponse = RuntimeCapabilitiesDto;

export function createCapabilitiesQueryOptions(capabilitiesPort: CapabilitiesPort) {
  return {
    queryKey: queryKeys.shell.capabilities(),
    queryFn: () => capabilitiesPort.loadCapabilities(),
    retry: false,
    staleTime: 60_000,
  };
}

export function useCapabilitiesQuery() {
  const capabilitiesPort = useCapabilitiesPort();
  return useQuery(createCapabilitiesQueryOptions(capabilitiesPort));
}
