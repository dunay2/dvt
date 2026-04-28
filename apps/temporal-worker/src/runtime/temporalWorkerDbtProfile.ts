/**
 * @ownedConcern Build the optional DBT worker profile and step activity registry.
 */
import {
  DbtCliPluginRunner,
  assertDbtCliAvailable,
  createDbtStepActivityRegistry,
  type TemporalWorkerHostConfig,
} from '@dvt/adapter-temporal';
import {
  ArtifactBackedDbtProjectBundleReader,
  ArtifactBackedRunExecutionContextReader,
  type DbtProjectBundleArtifactStore,
} from '@dvt/artifacts';

import type { Env } from '../plugins/env.js';

import type { CreateTemporalWorkerRuntimeOptions } from './runtimeTypes.js';

export interface TemporalWorkerDbtProfile {
  dbtAvailabilityProbe?: () => Promise<void>;
  stepActivitiesByKind?: TemporalWorkerHostConfig['stepActivitiesByKind'];
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
    stepActivitiesByKind: createDbtStepActivityRegistry({
      runExecutionContextReader,
      dbtPluginRunner,
    }),
  };
}

function resolveDbtBundleArtifactStore(env: Env): DbtProjectBundleArtifactStore {
  if (env.DVT_DBT_BUNDLE_STORE_BACKEND === 's3') {
    return {
      kind: 's3',
      bucket: env.DVT_DBT_BUNDLE_S3_BUCKET as string,
    };
  }

  return {
    kind: 'file',
    rootPath: env.DVT_DBT_BUNDLE_FILE_ROOT as string,
  };
}
