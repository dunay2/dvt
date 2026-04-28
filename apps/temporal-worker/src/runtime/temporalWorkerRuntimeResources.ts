/**
 * @ownedConcern Compose validated worker runtime resources from environment and options.
 */
import { loadTemporalAdapterConfig } from '@dvt/adapter-temporal';

import type { Env } from '../plugins/env.js';

import type {
  CreateTemporalWorkerRuntimeOptions,
  TemporalWorkerRuntimeResources,
} from './runtimeTypes.js';
import { createTemporalWorkerDbtProfile } from './temporalWorkerDbtProfile.js';
import {
  createTemporalWorkerActivityDeps,
  createTemporalWorkerStores,
} from './temporalWorkerStores.js';

export function createTemporalWorkerRuntimeResources(
  env: Env,
  options: CreateTemporalWorkerRuntimeOptions
): TemporalWorkerRuntimeResources {
  const runMigrations = env.DVT_TEMPORAL_WORKER_RUN_MIGRATIONS;
  const temporalConfig = loadTemporalAdapterConfig({
    TEMPORAL_ADDRESS: env.TEMPORAL_ADDRESS,
    TEMPORAL_NAMESPACE: env.TEMPORAL_NAMESPACE,
    TEMPORAL_TASK_QUEUE: env.TEMPORAL_TASK_QUEUE,
    TEMPORAL_IDENTITY: env.TEMPORAL_IDENTITY,
    TEMPORAL_CONNECT_TIMEOUT_MS: env.TEMPORAL_CONNECT_TIMEOUT_MS,
    TEMPORAL_REQUEST_TIMEOUT_MS: env.TEMPORAL_REQUEST_TIMEOUT_MS,
    TEMPORAL_MAX_START_PAYLOAD_BYTES: env.TEMPORAL_MAX_START_PAYLOAD_BYTES,
    TEMPORAL_MAX_CONTINUE_AS_NEW_PAYLOAD_BYTES: env.TEMPORAL_MAX_CONTINUE_AS_NEW_PAYLOAD_BYTES,
    TEMPORAL_CONTINUE_AS_NEW_AFTER_LAYERS: env.TEMPORAL_CONTINUE_AS_NEW_AFTER_LAYERS,
  });
  const { stateStore, planStore } = createTemporalWorkerStores(env, options, runMigrations);
  const { activityDeps, runStateCircuit } = createTemporalWorkerActivityDeps(
    env,
    stateStore,
    planStore
  );
  const dbtProfile = createTemporalWorkerDbtProfile(env, options);

  return {
    runMigrations,
    temporalConfig,
    stateStore,
    planStore,
    activityDeps,
    runStateCircuit,
    ...(dbtProfile.dbtAvailabilityProbe === undefined
      ? {}
      : { dbtAvailabilityProbe: dbtProfile.dbtAvailabilityProbe }),
    ...(dbtProfile.stepActivitiesByKind === undefined
      ? {}
      : { stepActivitiesByKind: dbtProfile.stepActivitiesByKind }),
  };
}
