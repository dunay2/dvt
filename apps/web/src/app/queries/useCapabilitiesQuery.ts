import { useQuery } from '@tanstack/react-query';

import {
  createRuntimeCapabilitiesQueryOptions,
  isPluginAvailableFromCapabilities,
  type RuntimeCapabilitiesDto,
} from '../../capabilities/runtime-capabilities';
import { useCapabilitiesPort } from '../services/AppServicesContext';

export { isPluginAvailableFromCapabilities };
export type CapabilitiesResponse = RuntimeCapabilitiesDto;

export function useCapabilitiesQuery() {
  const capabilitiesPort = useCapabilitiesPort();
  return useQuery(createRuntimeCapabilitiesQueryOptions(capabilitiesPort));
}
