import { createApiClient, type ApiClient } from '../../../app/services/api/createApiClient';
import type { RuntimeCapabilitiesDto } from '../contracts/runtimeCapabilitiesDtos';

export interface RuntimeCapabilitiesHttpClient {
  loadCapabilities(): Promise<RuntimeCapabilitiesDto>;
}

export function createHttpRuntimeCapabilitiesClient(
  apiClient: ApiClient = createApiClient()
): RuntimeCapabilitiesHttpClient {
  return {
    loadCapabilities: () =>
      apiClient.getJson<RuntimeCapabilitiesDto>('/capabilities', {
        includeSessionHeaders: false,
      }),
  };
}
