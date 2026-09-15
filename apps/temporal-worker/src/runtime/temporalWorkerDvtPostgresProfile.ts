/**
 * @ownedConcern Build the optional DVT PostgreSQL worker profile and activity registry.
 * @baseline ADR-0066: Stable PostgreSQL table publication
 */
import { join } from 'node:path';
import process from 'node:process';

import { PostgresCredentialBindingResolver } from '@dvt/adapter-postgres';
import type { TemporalStepPluginProfile } from '@dvt/adapter-temporal';
import type { ArtifactReadRuntimeOptions, IRunExecutionContextReader } from '@dvt/artifacts';
import {
  createDvtPostgresPluginProfile,
  DvtPostgresPluginRunner,
} from '@dvt/temporal-dvt-postgres-plugin';
import { Context } from '@temporalio/activity';

import type { Env } from '../plugins/env.js';

export interface TemporalWorkerDvtPostgresProfile {
  readonly pluginProfile?: TemporalStepPluginProfile;
}

export function createTemporalWorkerDvtPostgresProfile(
  env: Env,
  runExecutionContextReader: IRunExecutionContextReader
): TemporalWorkerDvtPostgresProfile {
  if (!env.DVT_TEMPORAL_DVT_POSTGRES_ENABLED) return {};

  const runner = new DvtPostgresPluginRunner({
    credentialResolver: new PostgresCredentialBindingResolver(env.DVT_POSTGRES_CREDENTIAL_BINDINGS),
    artifactReadOptions: resolveDvtPostgresArtifactReadOptions(env),
    getCancellationSignal: () => Context.current().cancellationSignal,
    onCleanupFailure: (error: unknown) =>
      process.emitWarning(String(error), 'DVT_POSTGRES_CLEANUP_FAILED'),
  });
  return {
    pluginProfile: createDvtPostgresPluginProfile({ runExecutionContextReader, runner }),
  };
}

export function resolveDvtPostgresArtifactReadOptions(
  env: Pick<Env, 'NODE_ENV' | 'DVT_CAS_FILE_ROOT' | 'DVT_WORKSPACE_FILES_ROOT'>
): ArtifactReadRuntimeOptions {
  const fileReadRoot =
    env.DVT_CAS_FILE_ROOT ??
    (env.DVT_WORKSPACE_FILES_ROOT === undefined
      ? undefined
      : join(env.DVT_WORKSPACE_FILES_ROOT, '.dvt', 'cas'));
  return {
    nodeEnv: env.NODE_ENV,
    ...(fileReadRoot === undefined ? {} : { fileReadRoot }),
  };
}
