import type { RuntimeCapabilitiesDto } from '../contracts/runtimeCapabilitiesDtos';
import { createHttpRuntimeCapabilitiesClient } from '../infrastructure/httpRuntimeCapabilitiesClient';

export interface RuntimeCapabilitiesReader {
  loadCapabilities(): Promise<RuntimeCapabilitiesDto>;
}

export interface RuntimeCapabilitiesCapabilityApi {
  loadCapabilities(): Promise<RuntimeCapabilitiesDto>;
}

export function createRuntimeCapabilitiesCapability(
  reader: RuntimeCapabilitiesReader = createHttpRuntimeCapabilitiesClient()
): RuntimeCapabilitiesCapabilityApi {
  return {
    loadCapabilities: () => reader.loadCapabilities(),
  };
}
