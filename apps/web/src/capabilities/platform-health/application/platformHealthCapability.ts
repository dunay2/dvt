import { createHttpPlatformHealthClient } from '../infrastructure/httpPlatformHealthClient';
import type { PlatformHealthSnapshot } from '../domain/platformHealthTypes';

export interface PlatformHealthSnapshotReader {
  loadSnapshot(): Promise<PlatformHealthSnapshot>;
}

export interface PlatformHealthCapabilityApi {
  loadSnapshot(): Promise<PlatformHealthSnapshot>;
}

export function createPlatformHealthCapability(
  platformHealthClient: PlatformHealthSnapshotReader = createHttpPlatformHealthClient()
): PlatformHealthCapabilityApi {
  return {
    loadSnapshot: () => platformHealthClient.loadSnapshot(),
  };
}
