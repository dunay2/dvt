/**
 * Owned concern: assemble the protected runtime component for `apps/api`.
 * This module is the only composition root that binds planner, validator,
 * adapters, stores, auth, and runtime services into one `ProtectedRuntimeModule`.
 */
import type { IObservability } from '@dvt/observability';
import type { FastifyInstance } from 'fastify';
import type { Logger } from 'pino';

import { getPgPool } from '../db/pool.js';
import type { Env } from '../plugins/env.js';

import { buildProtectedAdmissionRuntime } from './protectedRuntime/buildProtectedAdmissionRuntime.js';
import { buildProtectedExecutionCapacityPort } from './protectedRuntime/buildProtectedExecutionCapacityPort.js';
import { buildProtectedExecutionRuntime } from './protectedRuntime/buildProtectedExecutionRuntime.js';
import { buildProtectedRuntimeStorage } from './protectedRuntime/buildProtectedRuntimeStorage.js';
import { buildProtectedSecurityRuntime } from './protectedRuntime/buildProtectedSecurityRuntime.js';
import { buildProtectedStartRunRuntime } from './startRun/buildProtectedStartRunRuntime.js';
import type { ProtectedRuntimeModule } from './types.js';
import { buildWorkspaceGraphDraftRuntime } from './workspaceGraphDraft/buildWorkspaceGraphDraftRuntime.js';

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
  const { SnapshotProjector } = await import('@dvt/engine');
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
  });

  return {
    facade: startRunRuntime.facade,
    authenticator: securityRuntime.authenticator,
    authorizer: securityRuntime.commandAuthorizer,
    workspaceContextQuery: securityRuntime.workspaceContextQuery,
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
    workspaceGraphDraftCapabilityService:
      workspaceGraphDraftRuntime.workspaceGraphDraftCapabilityService,
    getWorkspaceGraphDraftUseCase: workspaceGraphDraftRuntime.getWorkspaceGraphDraftUseCase,
    saveWorkspaceGraphDraftUseCase: workspaceGraphDraftRuntime.saveWorkspaceGraphDraftUseCase,
    migrate: async () => {
      await securityRuntime.migrateAccessDecisionService();
      await migratePostgresRuntimeStores({
        stateStore: storageRuntime.stateStore,
        startRunIntentStore: storageRuntime.intentStore,
      });
      await storageRuntime.planStore.migrate();
      await workspaceGraphDraftRuntime.workspaceGraphDraftStore.migrate();
    },
    close: async () => {
      await closeAllClosers([
        () => executionRuntime.closeAdapters(),
        () => storageRuntime.planStore.close(),
        () => workspaceGraphDraftRuntime.workspaceGraphDraftStore.close(),
        () => storageRuntime.stateStore.close(),
        () => storageRuntime.intentStore.close(),
        () => pool.end(),
      ]);
    },
  };
}
