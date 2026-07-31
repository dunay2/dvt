/**
 * Owned concern: assemble the protected runtime component for `apps/api`.
 * This module is the only composition root that binds planner, validator,
 * adapters, stores, auth, and runtime services into one `ProtectedRuntimeModule`.
 */
import { randomUUID } from 'node:crypto';

import type { IObservability } from '@dvt/observability';
import type { FastifyInstance } from 'fastify';
import type { Logger } from 'pino';

import { getPgPool } from '../db/pool.js';
import { ConfiguredDbtExecutionTargetResolver } from '../infrastructure/dbt/ConfiguredDbtExecutionTargetResolver.js';
import { DbtCliProjectAnalyzer } from '../infrastructure/dbt/DbtCliProjectAnalyzer.js';
import { LocalDbtProjectImportInspector } from '../infrastructure/dbt/LocalDbtProjectImportInspector.js';
import { PostgresDbtProjectImportProcessStore } from '../infrastructure/dbt/PostgresDbtProjectImportProcessStore.js';
import type { Env } from '../plugins/env.js';

import { buildCanvasAuthoringAuthorityRuntime } from './canvasAuthoringAuthority/buildCanvasAuthoringAuthorityRuntime.js';
import { buildDbtProjectImportRuntime } from './dbtProjectImport/buildDbtProjectImportRuntime.js';
import { buildProtectedAdmissionRuntime } from './protectedRuntime/buildProtectedAdmissionRuntime.js';
import { buildProtectedExecutionCapacityPort } from './protectedRuntime/buildProtectedExecutionCapacityPort.js';
import { buildProtectedExecutionRuntime } from './protectedRuntime/buildProtectedExecutionRuntime.js';
import { buildProtectedRuntimeStorage } from './protectedRuntime/buildProtectedRuntimeStorage.js';
import { buildProtectedSecurityRuntime } from './protectedRuntime/buildProtectedSecurityRuntime.js';
import { buildProtectedStartRunRuntime } from './startRun/buildProtectedStartRunRuntime.js';
import type { ProtectedRuntimeModule } from './types.js';
import { buildWorkspaceGraphDraftRuntime } from './workspaceGraphDraft/buildWorkspaceGraphDraftRuntime.js';

const MINIMUM_DBT_PROJECT_IMPORT_OPERATION_LEASE_MS = 300_000;

async function closeAllClosers(closers: Array<() => Promise<void>>): Promise<void> {
  const results = await Promise.allSettled(closers.map((closer) => closer()));
  const errors = results.flatMap((result) => (result.status === 'rejected' ? [result.reason] : []));
  if (errors.length > 0) {
    throw new AggregateError(errors, 'Failed to close protected runtime cleanly');
  }
}

function requireDatabaseUrl(env: Env): string {
  if (!env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required when OIDC-protected runtime routes are enabled');
  }
  return env.DATABASE_URL;
}

export async function buildProtectedRuntimeModule(
  app: FastifyInstance,
  env: Env,
  observability: IObservability
): Promise<ProtectedRuntimeModule> {
  const databaseUrl = requireDatabaseUrl(env);
  const pool = getPgPool(databaseUrl);
  const appLogger = app.log as unknown as Logger;

  const adapterMod = await import('@dvt/adapter-postgres');
  const {
    migratePostgresRuntimeStores,
    PostgresBackpressureSnapshotReader,
    PostgresPlanStore,
    PostgresStateStoreAdapter,
    PostgresStartRunIntentStore,
  } = adapterMod;
  const { SnapshotProjector } = await import('@dvt/engine/runtime');
  const storageRuntime = buildProtectedRuntimeStorage({
    PostgresPlanStore,
    PostgresStateStoreAdapter,
    PostgresStartRunIntentStore,
    SnapshotProjector,
    databaseUrl,
    env,
    pool,
  });
  const admissionRuntime = buildProtectedAdmissionRuntime({
    PostgresBackpressureSnapshotReader,
    env,
    observability,
    pool,
  });
  const executionRuntime = await buildProtectedExecutionRuntime({
    appLogger,
    env,
    observability,
    storageRuntime,
  });
  const securityRuntime = buildProtectedSecurityRuntime({
    appLogger,
    env,
    pool,
  });
  const workspaceGraphDraftRuntime = buildWorkspaceGraphDraftRuntime({
    appLogger,
    authenticator: securityRuntime.authenticator,
    commandAuthorizer: securityRuntime.commandAuthorizer,
    env,
    pool,
    buildCanvasAuthoringAuthorityRuntime: ({ workspaceGraphDraftStore }) =>
      buildCanvasAuthoringAuthorityRuntime({
        pool,
        schema: env.DVT_PG_SCHEMA,
        workspaceGraphDraftStore,
        queryTimeoutMs: env.DVT_PG_QUERY_TIMEOUT_MS,
      }),
  });
  const canvasAuthoringAuthorityRuntime =
    workspaceGraphDraftRuntime.canvasAuthoringAuthorityRuntime;
  const dbtProjectAnalyzer = new DbtCliProjectAnalyzer({
    workspaceFilesRoot: storageRuntime.workspaceFilesRoot,
    ...(env.DVT_DBT_ANALYZER_PROFILES_DIR === undefined
      ? {}
      : { profilesDirectory: env.DVT_DBT_ANALYZER_PROFILES_DIR }),
    dbtExecutable: env.DVT_DBT_ANALYZER_BIN,
    timeoutMs: env.DVT_DBT_ANALYZER_TIMEOUT_MS,
    maxOutputBytes: env.DVT_DBT_ANALYZER_MAX_OUTPUT_BYTES,
  });
  const dbtProjectImportProcessStore = new PostgresDbtProjectImportProcessStore({
    pool,
    schema: env.DVT_PG_SCHEMA,
    queryTimeoutMs: env.DVT_PG_QUERY_TIMEOUT_MS,
  });
  const dbtExecutionTargetResolver = new ConfiguredDbtExecutionTargetResolver({
    enabled: env.DVT_TEMPORAL_DBT_ENABLED,
    provider: 'temporal',
    ...(env.DVT_DBT_EXECUTION_ADAPTER === undefined
      ? {}
      : { adapter: env.DVT_DBT_EXECUTION_ADAPTER }),
    ...(env.DVT_DBT_EXECUTION_TARGET_NAME === undefined
      ? {}
      : { targetName: env.DVT_DBT_EXECUTION_TARGET_NAME }),
    ...(env.DVT_DBT_EXECUTION_CREDENTIAL_REF === undefined
      ? {}
      : { credentialRef: env.DVT_DBT_EXECUTION_CREDENTIAL_REF }),
  });
  const dbtProjectImport = buildDbtProjectImportRuntime({
    analyzer: dbtProjectAnalyzer,
    executionTargetResolver: dbtExecutionTargetResolver,
    inspector: new LocalDbtProjectImportInspector({
      workspaceFilesRoot: storageRuntime.workspaceFilesRoot,
    }),
    processStore: dbtProjectImportProcessStore,
    authorityPolicy: canvasAuthoringAuthorityRuntime.canvasAuthoringAuthorityPolicy,
    now: () => new Date(),
    createLeaseToken: randomUUID,
    operationLeaseMs: Math.max(
      MINIMUM_DBT_PROJECT_IMPORT_OPERATION_LEASE_MS,
      env.DVT_DBT_ANALYZER_TIMEOUT_MS + 60_000
    ),
  });
  const executionCapacity = buildProtectedExecutionCapacityPort(env);
  const startRunRuntime = buildProtectedStartRunRuntime({
    authenticator: securityRuntime.authenticator,
    commandAuthorizer: securityRuntime.commandAuthorizer,
    duplicateProbe: admissionRuntime.duplicateProbe,
    admissionGuard: admissionRuntime.admissionGuard,
    executionCapacity,
    observability,
    backpressureMode: env.DVT_START_RUN_BACKPRESSURE_MODE,
    retryAfterSeconds: env.DVT_START_RUN_RETRY_AFTER_SECONDS,
    engine: executionRuntime.engine,
    adapters: executionRuntime.adapters,
    planStore: storageRuntime.planStore,
    stepTypeRegistry: storageRuntime.stepTypeRegistry,
    workspaceGraphDraftStore: workspaceGraphDraftRuntime.workspaceGraphDraftStore,
    workspaceRoot: storageRuntime.workspaceFilesRoot,
    dbtBundleStore: storageRuntime.dbtBundleStore,
    dbtExecutionTargetResolver,
  });

  return {
    facade: startRunRuntime.facade,
    authenticator: securityRuntime.authenticator,
    authorizer: securityRuntime.commandAuthorizer,
    workspaceContextQuery: securityRuntime.workspaceContextQuery,
    listProjectsUseCase: securityRuntime.listProjectsUseCase,
    createProjectUseCase: securityRuntime.createProjectUseCase,
    listWorkspacePluginsUseCase: securityRuntime.listWorkspacePluginsUseCase,
    engine: executionRuntime.engine,
    runEnrichmentService: executionRuntime.runEnrichmentService,
    runHealthService: executionRuntime.runHealthService,
    adapters: executionRuntime.adapters,
    startRunTargetAdapterRegistry: executionRuntime.startRunTargetAdapterRegistry,
    stateStore: storageRuntime.stateStoreRoles,
    planner: startRunRuntime.planner,
    planCompilePlanner: startRunRuntime.planCompilePlanner,
    planStore: storageRuntime.planStore,
    planValidator: startRunRuntime.planValidator,
    executablePlanResolver: storageRuntime.executablePlanResolver,
    workspaceGraphDraftStore: workspaceGraphDraftRuntime.workspaceGraphDraftStore,
    canvasAuthoringAuthorityStore: canvasAuthoringAuthorityRuntime.canvasAuthoringAuthorityStore,
    canvasAuthoringAuthorityPolicy: canvasAuthoringAuthorityRuntime.canvasAuthoringAuthorityPolicy,
    dbtProjectImport,
    workspaceFilesRoot: storageRuntime.workspaceFilesRoot,
    workspaceGraphDraftCapabilityService:
      workspaceGraphDraftRuntime.workspaceGraphDraftCapabilityService,
    getWorkspaceGraphDraftUseCase: workspaceGraphDraftRuntime.getWorkspaceGraphDraftUseCase,
    saveWorkspaceGraphDraftUseCase: workspaceGraphDraftRuntime.saveWorkspaceGraphDraftUseCase,
    migrate: async () => {
      await securityRuntime.migrateAccessDecisionService();
      await securityRuntime.migrateProjectOnboardingRepository();
      await securityRuntime.migrateWorkspacePluginCatalogRepository();
      await migratePostgresRuntimeStores({
        stateStore: storageRuntime.stateStore,
        startRunIntentStore: storageRuntime.intentStore,
      });
      await storageRuntime.planStore.migrate();
      await workspaceGraphDraftRuntime.workspaceGraphDraftStore.migrate();
      await canvasAuthoringAuthorityRuntime.canvasAuthoringAuthorityStore.migrate();
      await dbtProjectImportProcessStore.migrate();
    },
    close: async () => {
      await closeAllClosers([
        () => executionRuntime.closeAdapters(),
        () => storageRuntime.planStore.close(),
        () => workspaceGraphDraftRuntime.workspaceGraphDraftStore.close(),
        () => canvasAuthoringAuthorityRuntime.canvasAuthoringAuthorityStore.close(),
        () => dbtProjectImportProcessStore.close(),
        () => storageRuntime.stateStore.close(),
        () => storageRuntime.intentStore.close(),
        () => pool.end(),
      ]);
    },
  };
}
