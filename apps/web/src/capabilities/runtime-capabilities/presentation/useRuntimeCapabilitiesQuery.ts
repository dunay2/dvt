import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '../../../app/queries/queryKeys';
import {
  createRuntimeCapabilitiesCapability,
  type RuntimeCapabilitiesCapabilityApi,
} from '../application/runtimeCapabilitiesCapability';
import type { RuntimeCapabilitiesDto } from '../contracts/runtimeCapabilitiesDtos';

const runtimeCapabilitiesCapability = createRuntimeCapabilitiesCapability();

export function createRuntimeCapabilitiesQueryOptions(
  capability: RuntimeCapabilitiesCapabilityApi = runtimeCapabilitiesCapability
) {
  return {
    queryKey: queryKeys.shell.capabilities(),
    queryFn: () => capability.loadCapabilities(),
    retry: false,
    staleTime: 60_000,
  };
}

export function useRuntimeCapabilitiesQuery(
  capability: RuntimeCapabilitiesCapabilityApi = runtimeCapabilitiesCapability
) {
  return useQuery(createRuntimeCapabilitiesQueryOptions(capability));
}

export function isPluginAvailableFromCapabilities(
  capabilities: RuntimeCapabilitiesDto | undefined,
  pluginId: string
): boolean {
  if (!capabilities) return true;
  const info = capabilities.plugins[pluginId];
  if (!info) return true;
  return info.available;
}
