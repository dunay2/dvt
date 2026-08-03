import type { RuntimeCapabilitiesDto } from '../contracts/runtimeCapabilitiesDtos';

export interface RuntimeCapabilitiesReader {
  loadCapabilities(): Promise<RuntimeCapabilitiesDto>;
}

export interface RuntimeCapabilitiesCapabilityApi {
  loadCapabilities(): Promise<RuntimeCapabilitiesDto>;
}

export function createRuntimeCapabilitiesCapability(
  reader: RuntimeCapabilitiesReader
): RuntimeCapabilitiesCapabilityApi {
  return {
    loadCapabilities: () => reader.loadCapabilities(),
  };
}
