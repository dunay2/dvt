import { createHttpPlatformHealthClient } from '../infrastructure/httpPlatformHealthClient';
import type { PlatformHealthSnapshot } from '../domain/platformHealthTypes';

export interface PlatformHealthCapabilityApi {
  loadSnapshot(): Promise<PlatformHealthSnapshot>;
}

export function createPlatformHealthCapability(): PlatformHealthCapabilityApi {
  const platformHealthClient = createHttpPlatformHealthClient();

  return {
    loadSnapshot: () => platformHealthClient.loadSnapshot(),
  };
}
