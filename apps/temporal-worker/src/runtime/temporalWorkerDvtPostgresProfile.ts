/**
 * @ownedConcern Build the optional DVT PostgreSQL worker profile and activity registry.
 * @baseline ADR-0066: Stable PostgreSQL table publication
 */
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
  runExecutionContextReader: IRunExecutionContextReader,
  artifactReadOptions: ArtifactReadRuntimeOptions
): TemporalWorkerDvtPostgresProfile {
  if (!env.DVT_TEMPORAL_DVT_POSTGRES_ENABLED) return {};

  const runner = new DvtPostgresPluginRunner({
    credentialResolver: new PostgresCredentialBindingResolver(env.DVT_POSTGRES_CREDENTIAL_BINDINGS),
    artifactReadOptions,
    getCancellationSignal: () => Context.current().cancellationSignal,
    onCleanupFailure: (error: unknown) =>
      process.emitWarning(String(error), 'DVT_POSTGRES_CLEANUP_FAILED'),
  });
  return {
    pluginProfile: createDvtPostgresPluginProfile({ runExecutionContextReader, runner }),
  };
}
