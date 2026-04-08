import type { RuntimeCapabilitiesDto } from '../../capabilities/runtime-capabilities';

export interface CapabilitiesPort {
  loadCapabilities(): Promise<RuntimeCapabilitiesDto>;
}
