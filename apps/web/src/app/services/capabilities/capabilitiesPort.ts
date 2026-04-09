import { createRuntimeCapabilitiesCapability } from '../../../capabilities/runtime-capabilities/application/runtimeCapabilitiesCapability';
import { createHttpRuntimeCapabilitiesClient } from '../../../capabilities/runtime-capabilities/infrastructure/httpRuntimeCapabilitiesClient';
import type { CapabilitiesPort } from '../../ports/capabilities';
import type { ApiClient } from '../api/createApiClient';

export function createCapabilitiesPort(apiClient: ApiClient): CapabilitiesPort {
  return createRuntimeCapabilitiesCapability(createHttpRuntimeCapabilitiesClient(apiClient));
}
