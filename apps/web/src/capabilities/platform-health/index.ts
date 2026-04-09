export {
  createPlatformHealthCapability,
  type PlatformHealthCapabilityApi,
} from './application/platformHealthCapability';
export { isPlatformReady, selectPlatformConnectionState } from './domain/platformHealthSelectors';
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
  PLATFORM_HEALTH_REFETCH_INTERVAL_MS,
  platformHealthQueryKey,
  usePlatformHealthSnapshotQuery,
} from './presentation/usePlatformHealthSnapshotQuery';
export {
  buildShellHealthPresentationModel,
  getNextRetryDelayMs,
  getShellHealthPollingIntervalMs,
  getPlatformConnectionDetail,
  getPlatformHealthErrorMessageFromQuery,
} from './presentation/platformHealthStatus';
