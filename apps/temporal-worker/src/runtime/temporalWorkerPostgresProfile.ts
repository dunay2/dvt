/**
 * @ownedConcern Build the SQL-first Postgres worker profile and runtime cleanup hook.
 */
import {
  PostgresCredentialBindingResolver,
  PostgresRelationalExecutionCapability,
} from '@dvt/adapter-postgres';
import type { TemporalStepPluginProfile } from '@dvt/adapter-temporal';
import type { IRunExecutionContextReader } from '@dvt/artifacts';

import type { Env } from '../plugins/env.js';

import type {
  CreateTemporalWorkerRuntimeOptions,
  TemporalWorkerPostgresCapability,
} from './runtimeTypes.js';
import { TemporalWorkerPostgresPlanConnectionResolver } from './TemporalWorkerPostgresPlanConnectionResolver.js';

const POSTGRES_RELATIONAL_PLUGIN_ID = 'postgres-relational';

export interface TemporalWorkerPostgresProfile {
  pluginProfile: TemporalStepPluginProfile;
  relationalLoader: TemporalWorkerPostgresCapability;
  close: () => Promise<void>;
}

export function createTemporalWorkerPostgresProfile(
  env: Env,
  options: CreateTemporalWorkerRuntimeOptions,
  runExecutionContextReader: IRunExecutionContextReader
): TemporalWorkerPostgresProfile {
  const capability =
    options.postgresRelationalCapabilityFactory?.(env) ??
    createDefaultPostgresRelationalCapability(env, runExecutionContextReader);

  return {
    pluginProfile: {
      pluginId: POSTGRES_RELATIONAL_PLUGIN_ID,
      stepActivitiesByKind: capability.stepActivitiesByKind,
    },
    relationalLoader: capability,
    close: () => capability.close(),
  };
}

function createDefaultPostgresRelationalCapability(
  env: Env,
  runExecutionContextReader: IRunExecutionContextReader
): TemporalWorkerPostgresCapability {
  const credentialResolver = new PostgresCredentialBindingResolver(
    env.DVT_POSTGRES_CREDENTIAL_BINDINGS
  );
  return new PostgresRelationalExecutionCapability({
    connectionString: env.DATABASE_URL,
    statementTimeoutMs: env.DVT_PG_STATEMENT_TIMEOUT_MS,
    queryTimeoutMs: env.DVT_PG_QUERY_TIMEOUT_MS,
    planConnectionResolver: new TemporalWorkerPostgresPlanConnectionResolver(
      runExecutionContextReader,
      credentialResolver
    ),
  });
}
