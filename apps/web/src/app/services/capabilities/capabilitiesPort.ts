/** Owned concern: compose runtime-capabilities loading behind the app capability port.
 * @file apps/web/src/app/services/capabilities/capabilitiesPort.ts
 * @baseline ADR-0056: Web UI authority is server-projected
 * @decision Section 2 - Runtime capabilities are loaded from the server without browser-local fallback
 * @consequence Browser capability state cannot silently invent backend plugin availability
 * @version 1.0.0
 * @date 2026-05-10
 */
import { createRuntimeCapabilitiesCapability } from '../../../capabilities/runtime-capabilities/application/runtimeCapabilitiesCapability';
import { createHttpRuntimeCapabilitiesClient } from '../../../capabilities/runtime-capabilities/infrastructure/httpRuntimeCapabilitiesClient';
import type { CapabilitiesPort } from '../../ports/capabilities';
import type { ApiClient } from '../api/createApiClient';

export function createCapabilitiesPort(apiClient: ApiClient): CapabilitiesPort {
  const httpCapabilities = createRuntimeCapabilitiesCapability(
    createHttpRuntimeCapabilitiesClient(apiClient)
  );

  return {
    async loadCapabilities() {
      return httpCapabilities.loadCapabilities();
    },
  };
}
