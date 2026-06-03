/**
 * @ownedConcern Build the optional DBT worker profile and step activity registry.
 */
import { type TemporalStepPluginProfile } from '@dvt/adapter-temporal';
import {
  ArtifactBackedDbtProjectBundleReader,
  ArtifactBackedRunExecutionContextReader,
  type DbtProjectBundleArtifactStore,
} from '@dvt/artifacts';
import {
  DbtCliPluginRunner,
  DBT_PLUGIN_ID,
  assertDbtCliAvailable,
  createDbtStepActivityRegistry,
} from '@dvt/temporal-dbt-plugin';

import type { Env } from '../plugins/env.js';

import type { CreateTemporalWorkerRuntimeOptions } from './runtimeTypes.js';

export interface TemporalWorkerDbtProfile {
  dbtAvailabilityProbe?: () => Promise<void>;
  pluginProfile?: TemporalStepPluginProfile;
}

export function createTemporalWorkerDbtProfile(
  env: Env,
  options: CreateTemporalWorkerRuntimeOptions
): TemporalWorkerDbtProfile {
  if (!env.DVT_TEMPORAL_DBT_ENABLED) {
    return {};
  }

  const runExecutionContextReader =
    options.runExecutionContextReaderFactory?.(env) ??
    new ArtifactBackedRunExecutionContextReader({
      nodeEnv: env.NODE_ENV,
    });
  const bundleReader =
    options.bundleReaderFactory?.(env) ??
    new ArtifactBackedDbtProjectBundleReader({
      nodeEnv: env.NODE_ENV,
      bundleStore: resolveDbtBundleArtifactStore(env),
    });
  const availabilityProbe =
    options.dbtAvailabilityProbe ?? ((dbtBin: string) => assertDbtCliAvailable(dbtBin));
  const dbtPluginRunner =
    options.dbtPluginRunnerFactory?.({
      env,
      bundleReader,
    }) ??
    new DbtCliPluginRunner({
      bundleReader,
      dbtBin: env.DVT_DBT_BIN,
      workdirRoot: env.DVT_DBT_WORKDIR_ROOT,
    });

  return {
    dbtAvailabilityProbe: () => availabilityProbe(env.DVT_DBT_BIN),
    pluginProfile: {
      pluginId: DBT_PLUGIN_ID,
      stepActivitiesByKind: createDbtStepActivityRegistry({
        runExecutionContextReader,
        dbtPluginRunner,
      }),
    },
  };
}

function resolveDbtBundleArtifactStore(env: Env): DbtProjectBundleArtifactStore {
  if (env.DVT_DBT_BUNDLE_STORE_BACKEND === 's3') {
    return {
      kind: 's3',
      bucket: resolveRequiredDbtStoreValue(
        env.DVT_DBT_BUNDLE_S3_BUCKET,
        'DVT_DBT_BUNDLE_S3_BUCKET',
        'DVT_DBT_BUNDLE_STORE_BACKEND=s3'
      ),
    };
  }

  return {
    kind: 'file',
    rootPath: resolveRequiredDbtStoreValue(
      env.DVT_DBT_BUNDLE_FILE_ROOT,
      'DVT_DBT_BUNDLE_FILE_ROOT',
      'DVT_DBT_BUNDLE_STORE_BACKEND=file'
    ),
  };
}

function resolveRequiredDbtStoreValue(
  value: string | undefined,
  variableName: string,
  condition: string
): string {
  if (value !== undefined && value.trim().length > 0) {
    return value;
  }

  throw new Error(`${variableName} is required when ${condition}`);
}
