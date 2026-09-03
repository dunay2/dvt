/**
 * @ownedConcern Compose validated worker runtime resources from environment and options.
 */
import {
  composeTemporalStepPluginRegistries,
  loadTemporalAdapterConfig,
} from '@dvt/adapter-temporal';
import {
  ArtifactBackedRunExecutionContextReader,
  resolveRunExecutionContextArtifactStore,
  type ArtifactBackedRunExecutionContextReaderOptions,
} from '@dvt/artifacts';

import type { Env } from '../plugins/env.js';

import type {
  CreateTemporalWorkerRuntimeOptions,
  TemporalWorkerRuntimeResources,
} from './runtimeTypes.js';
import { createTemporalWorkerDbtProfile } from './temporalWorkerDbtProfile.js';
import { createTemporalWorkerHttpJsonProfile } from './temporalWorkerHttpJsonProfile.js';
import { createTemporalWorkerObjectFilePostgresProfile } from './temporalWorkerObjectFilePostgresProfile.js';
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
    new ArtifactBackedRunExecutionContextReader(
      resolveTemporalWorkerRunExecutionContextReaderOptions(env)
    );
  const dbtProfile = createTemporalWorkerDbtProfile(env, options, runExecutionContextReader);
  const objectFilePostgresProfile = createTemporalWorkerObjectFilePostgresProfile(env, options);
  const httpJsonProfile = createTemporalWorkerHttpJsonProfile(env, options);
  const pluginProfiles = [
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
    ...(objectFilePostgresProfile.close === undefined
      ? {}
      : { closeStepActivityResources: objectFilePostgresProfile.close }),
  };
}

export function resolveTemporalWorkerRunExecutionContextReaderOptions(
  env: Env
): ArtifactBackedRunExecutionContextReaderOptions {
  assertRunExecutionContextStoreConfig(env);
  const store = resolveRunExecutionContextArtifactStore({
    dbtBundleStoreBackend: env.DVT_DBT_BUNDLE_STORE_BACKEND,
    dbtBundleS3Bucket: env.DVT_DBT_BUNDLE_S3_BUCKET,
    dbtBundleFileRoot: env.DVT_DBT_BUNDLE_FILE_ROOT,
    workspaceFilesRoot: env.DVT_WORKSPACE_FILES_ROOT,
    workingDirectory: process.cwd(),
  });
  return {
    nodeEnv: env.NODE_ENV,
    ...(store.kind === 'file' ? { fileReadRoot: store.rootPath } : {}),
  };
}

function assertRunExecutionContextStoreConfig(env: Env): void {
  if (
    env.DVT_DBT_BUNDLE_STORE_BACKEND === 's3' &&
    (env.DVT_DBT_BUNDLE_S3_BUCKET === undefined || env.DVT_DBT_BUNDLE_S3_BUCKET.trim().length === 0)
  ) {
    throw new Error('DVT_DBT_BUNDLE_S3_BUCKET is required when DVT_DBT_BUNDLE_STORE_BACKEND=s3');
  }
  if (
    env.DVT_DBT_BUNDLE_STORE_BACKEND === 'file' &&
    (env.DVT_DBT_BUNDLE_FILE_ROOT === undefined || env.DVT_DBT_BUNDLE_FILE_ROOT.trim().length === 0)
  ) {
    throw new Error('DVT_DBT_BUNDLE_FILE_ROOT is required when DVT_DBT_BUNDLE_STORE_BACKEND=file');
  }
}
