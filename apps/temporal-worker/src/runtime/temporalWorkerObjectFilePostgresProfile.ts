/**
 * @ownedConcern Compose the bounded object-file to PostgreSQL Temporal plugin profile.
 */
import { PostgresObjectFileLoadingCapability } from '@dvt/adapter-postgres';
import type { TemporalStepPluginProfile } from '@dvt/adapter-temporal';
import {
  createObjectFilePostgresPluginProfile,
  ObjectFilePostgresPluginRunner,
} from '@dvt/temporal-object-file-postgres-plugin';
import type { ObjectFilePostgresRelationalLoader } from '@dvt/temporal-object-file-postgres-plugin';
import { Context } from '@temporalio/activity';

import type { Env } from '../plugins/env.js';

import type { CreateTemporalWorkerRuntimeOptions } from './runtimeTypes.js';
import { createTemporalWorkerObjectFileReader } from './temporalWorkerObjectFileReader.js';

export interface TemporalWorkerObjectFilePostgresProfile {
  readonly pluginProfile?: TemporalStepPluginProfile;
  readonly close?: () => Promise<void>;
}

export function createTemporalWorkerObjectFilePostgresProfile(
  env: Env,
  options: CreateTemporalWorkerRuntimeOptions
): TemporalWorkerObjectFilePostgresProfile {
  if (!env.DVT_TEMPORAL_OBJECT_FILE_POSTGRES_ENABLED) {
    return {};
  }

  const objectReader =
    options.objectFileReaderFactory?.(env) ?? createTemporalWorkerObjectFileReader(env);
  const relationalLoader: ObjectFilePostgresRelationalLoader & { close(): Promise<void> } =
    options.postgresObjectFileLoadingCapabilityFactory?.(env) ??
    new PostgresObjectFileLoadingCapability({
      connectionString: env.DATABASE_URL,
      statementTimeoutMs: env.DVT_PG_STATEMENT_TIMEOUT_MS,
      queryTimeoutMs: env.DVT_PG_QUERY_TIMEOUT_MS,
    });
  const runner = new ObjectFilePostgresPluginRunner({
    objectReader,
    relationalLoader,
    expectedSourceCredentialRef: requireBinding(
      env.DVT_OBJECT_FILE_SOURCE_CREDENTIAL_REF,
      'DVT_OBJECT_FILE_SOURCE_CREDENTIAL_REF'
    ),
    expectedTargetCredentialRef: requireBinding(
      env.DVT_OBJECT_FILE_POSTGRES_TARGET_CREDENTIAL_REF,
      'DVT_OBJECT_FILE_POSTGRES_TARGET_CREDENTIAL_REF'
    ),
    getCancellationSignal: () => Context.current().cancellationSignal,
  });

  return {
    pluginProfile: createObjectFilePostgresPluginProfile(runner),
    close: () => relationalLoader.close(),
  };
}

function requireBinding(value: string | undefined, field: string): string {
  if (value === undefined || value.trim().length === 0) {
    throw new Error(`${field} is required for the object-file PostgreSQL worker profile.`);
  }
  return value;
}
