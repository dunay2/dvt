/** Owned concern: compose runtime-capabilities loading behind the app capability port. */
import { createRuntimeCapabilitiesCapability } from '../../../capabilities/runtime-capabilities/application/runtimeCapabilitiesCapability';
import { createHttpRuntimeCapabilitiesClient } from '../../../capabilities/runtime-capabilities/infrastructure/httpRuntimeCapabilitiesClient';
import type { RuntimeCapabilitiesDto } from '../../../capabilities/runtime-capabilities';
import type { CapabilitiesPort } from '../../ports/capabilities';
import { ApiError, type ApiClient } from '../api/createApiClient';

const LOCAL_SHELL_CAPABILITIES: RuntimeCapabilitiesDto = {
  apiVersion: 'frontend-local',
  minFrontendVersion: '0.0.0',
  plugins: {},
};

export function createCapabilitiesPort(apiClient: ApiClient): CapabilitiesPort {
  const httpCapabilities = createRuntimeCapabilitiesCapability(
    createHttpRuntimeCapabilitiesClient(apiClient)
  );

  return {
    async loadCapabilities() {
      try {
        return await httpCapabilities.loadCapabilities();
      } catch (error) {
        if (error instanceof ApiError && error.category === 'network') {
          return LOCAL_SHELL_CAPABILITIES;
        }

        throw error;
      }
    },
  };
}
