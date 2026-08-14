/**
 * @ownedConcern Compose validated worker runtime resources from environment and options.
 */
import {
  composeTemporalStepPluginRegistries,
  loadTemporalAdapterConfig,
} from '@dvt/adapter-temporal';
import { ArtifactBackedRunExecutionContextReader } from '@dvt/artifacts';

import type { Env } from '../plugins/env.js';

import type {
  CreateTemporalWorkerRuntimeOptions,
  TemporalWorkerRuntimeResources,
} from './runtimeTypes.js';
import { createTemporalWorkerDbtProfile } from './temporalWorkerDbtProfile.js';
import { createTemporalWorkerHttpJsonProfile } from './temporalWorkerHttpJsonProfile.js';
import { createTemporalWorkerObjectFilePostgresProfile } from './temporalWorkerObjectFilePostgresProfile.js';
import { createTemporalWorkerPostgresProfile } from './temporalWorkerPostgresProfile.js';
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
    TEMPORAL_STEP_ACTIVITY_ROUTES: env.TEMPORAL_STEP_ACTIVITY_ROUTES,
  });
  const { stateStore, planArtifactReader } = createTemporalWorkerStores(
    env,
    options,
    runMigrations
  );
  const { activityDeps, runStateCircuit } = createTemporalWorkerActivityDeps(
    env,
    stateStore,
    planArtifactReader
  );
  const runExecutionContextReader =
    options.runExecutionContextReaderFactory?.(env) ??
    new ArtifactBackedRunExecutionContextReader({ nodeEnv: env.NODE_ENV });
  const postgresProfile = createTemporalWorkerPostgresProfile(
    env,
    options,
    runExecutionContextReader
  );
  const dbtProfile = createTemporalWorkerDbtProfile(env, options, runExecutionContextReader);
  const objectFilePostgresProfile = createTemporalWorkerObjectFilePostgresProfile(
    env,
    options,
    postgresProfile.relationalLoader
  );
  const httpJsonProfile = createTemporalWorkerHttpJsonProfile(env, options);
  const pluginProfiles = [
    postgresProfile.pluginProfile,
    ...(dbtProfile.pluginProfile === undefined ? [] : [dbtProfile.pluginProfile]),
    ...(objectFilePostgresProfile.pluginProfile === undefined
      ? []
      : [objectFilePostgresProfile.pluginProfile]),
    ...(httpJsonProfile.pluginProfile === undefined ? [] : [httpJsonProfile.pluginProfile]),
  ];
  const stepActivitiesByKind =
    pluginProfiles.length === 0 ? undefined : composeTemporalStepPluginRegistries(pluginProfiles);

  return {
    runMigrations,
    temporalConfig,
    stateStore,
    planArtifactReader,
    activityDeps,
    runStateCircuit,
    ...(dbtProfile.dbtAvailabilityProbe === undefined
      ? {}
      : { dbtAvailabilityProbe: dbtProfile.dbtAvailabilityProbe }),
    ...(stepActivitiesByKind === undefined ? {} : { stepActivitiesByKind }),
    closeStepActivityResources: postgresProfile.close,
  };
}
