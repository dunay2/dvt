export { createPlatformHealthCapability } from './application/platformHealthCapability';
export {
  isPlatformReady,
  selectPlatformConnectionState,
} from './domain/platformHealthSelectors';
export type {
  OptionalEndpointProbe,
  PlatformConnectionState,
  PlatformDatabaseReadiness,
  PlatformHealthInfo,
  PlatformHealthSnapshot,
  PlatformReadinessInfo,
  PlatformVersionInfo,
  RequiredEndpointProbe,
} from './domain/platformHealthTypes';
export {
  platformHealthQueryKey,
  usePlatformHealthSnapshotQuery,
} from './presentation/usePlatformHealthSnapshotQuery';
