/**
 * @ownedConcern Build the SQL-first Postgres worker profile and runtime cleanup hook.
 */
import { PostgresRelationalExecutionCapability } from '@dvt/adapter-postgres';
import type { TemporalStepPluginProfile } from '@dvt/adapter-temporal';

import type { Env } from '../plugins/env.js';

import type {
  CreateTemporalWorkerRuntimeOptions,
  TemporalWorkerStepCapability,
} from './runtimeTypes.js';

const POSTGRES_RELATIONAL_PLUGIN_ID = 'postgres-relational';

export interface TemporalWorkerPostgresProfile {
  pluginProfile: TemporalStepPluginProfile;
  close: () => Promise<void>;
}

export function createTemporalWorkerPostgresProfile(
  env: Env,
  options: CreateTemporalWorkerRuntimeOptions
): TemporalWorkerPostgresProfile {
  const capability =
    options.postgresRelationalCapabilityFactory?.(env) ??
    createDefaultPostgresRelationalCapability(env);

  return {
    pluginProfile: {
      pluginId: POSTGRES_RELATIONAL_PLUGIN_ID,
      stepActivitiesByKind: capability.stepActivitiesByKind,
    },
    close: () => capability.close(),
  };
}

function createDefaultPostgresRelationalCapability(env: Env): TemporalWorkerStepCapability {
  return new PostgresRelationalExecutionCapability({
    connectionString: env.DATABASE_URL,
    statementTimeoutMs: env.DVT_PG_STATEMENT_TIMEOUT_MS,
    queryTimeoutMs: env.DVT_PG_QUERY_TIMEOUT_MS,
  });
}
