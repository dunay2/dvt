/**
 * @ownedConcern Build Temporal worker host configuration and host instance.
 */
import { TemporalWorkerHost, type TemporalWorkerHostConfig } from '@dvt/adapter-temporal';

import type {
  CreateTemporalWorkerRuntimeOptions,
  TemporalWorkerHostLike,
  TemporalWorkerRuntimeResources,
} from './runtimeTypes.js';

export function createTemporalWorkerHost(
  resources: TemporalWorkerRuntimeResources,
  options: CreateTemporalWorkerRuntimeOptions
): TemporalWorkerHostLike {
  const hostConfig = createTemporalWorkerHostConfig(resources);
  return options.hostFactory?.(hostConfig) ?? new TemporalWorkerHost(hostConfig);
}

export function createTemporalWorkerHostConfig(
  resources: TemporalWorkerRuntimeResources
): TemporalWorkerHostConfig {
  return {
    temporalConfig: resources.temporalConfig,
    activityDeps: resources.activityDeps,
    ...(resources.stepActivitiesByKind === undefined
      ? {}
      : { stepActivitiesByKind: resources.stepActivitiesByKind }),
  };
}
