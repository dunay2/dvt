/**
 * Owned concern: assemble the protected-runtime storage and stored-plan
 * dependencies for `apps/api`.
 */
import { asIsoUtcString, createDefaultStepTypeRegistry } from '@dvt/contracts';
import type { ExecutionPlan } from '@dvt/engine';

import { StoredExecutablePlanResolver } from '../../application/services/StoredExecutablePlanResolver.js';
import { ArtifactBackedRunExecutionContextResolver } from '../../infrastructure/startRun/ArtifactBackedRunExecutionContextResolver.js';
import { ArtifactStoreDbtProjectBundleBindingPolicy } from '../../infrastructure/startRun/ArtifactStoreDbtProjectBundleBindingPolicy.js';
import type { Env } from '../../plugins/env.js';
import { bindStateStoreRoles } from '../stateStoreRoles.js';

import type { RuntimePool } from './shared.js';

export type BuildProtectedRuntimeStorageDeps = {
  readonly PostgresPlanStore: typeof import('@dvt/adapter-postgres').PostgresPlanStore;
  readonly PostgresStateStoreAdapter: typeof import('@dvt/adapter-postgres').PostgresStateStoreAdapter;
  readonly PostgresStartRunIntentStore: typeof import('@dvt/adapter-postgres').PostgresStartRunIntentStore;
  readonly SnapshotProjector: typeof import('@dvt/engine').SnapshotProjector;
  readonly databaseUrl: string;
  readonly env: Env;
  readonly pool: RuntimePool;
};

export function buildProtectedRuntimeStorage(deps: BuildProtectedRuntimeStorageDeps) {
  const stateStore = new deps.PostgresStateStoreAdapter({
    connectionString: deps.databaseUrl,
    schema: deps.env.DVT_PG_SCHEMA,
    statementTimeoutMs: deps.env.DVT_PG_STATEMENT_TIMEOUT_MS,
    queryTimeoutMs: deps.env.DVT_PG_QUERY_TIMEOUT_MS,
  });
  const stateStoreRoles = bindStateStoreRoles(stateStore);
  const intentStore = new deps.PostgresStartRunIntentStore({
    connectionString: deps.databaseUrl,
    schema: deps.env.DVT_PG_SCHEMA,
    statementTimeoutMs: deps.env.DVT_PG_STATEMENT_TIMEOUT_MS,
    queryTimeoutMs: deps.env.DVT_PG_QUERY_TIMEOUT_MS,
  });
  const planStore = new deps.PostgresPlanStore({
    pool: deps.pool,
    schema: deps.env.DVT_PG_SCHEMA,
    statementTimeoutMs: deps.env.DVT_PG_STATEMENT_TIMEOUT_MS,
    queryTimeoutMs: deps.env.DVT_PG_QUERY_TIMEOUT_MS,
    toExecutablePlan: (buildResult) => {
      const plan: ExecutionPlan = buildResult.plan;
      return {
        schemaVersion: plan.metadata.schemaVersion,
        text: JSON.stringify(plan),
      };
    },
  });
  const projector = new deps.SnapshotProjector();
  const stepTypeRegistry = createDefaultStepTypeRegistry();
  const executablePlanResolver = new StoredExecutablePlanResolver({
    fetcher: planStore,
    stepTypeRegistry,
  });
  const systemClock = { nowIsoUtc: () => asIsoUtcString(new Date().toISOString()) };
  const runExecutionContextResolver = new ArtifactBackedRunExecutionContextResolver({
    nodeEnv: deps.env.NODE_ENV,
  });
  const runExecutionContextBindingPolicy = new ArtifactStoreDbtProjectBundleBindingPolicy({
    bundleStore: resolveDbtBundleArtifactStore(deps.env),
  });

  return {
    stateStore,
    stateStoreRoles,
    intentStore,
    planStore,
    projector,
    stepTypeRegistry,
    executablePlanResolver,
    systemClock,
    runExecutionContextResolver,
    runExecutionContextBindingPolicy,
  };
}

export type ProtectedRuntimeStorage = ReturnType<typeof buildProtectedRuntimeStorage>;

function resolveDbtBundleArtifactStore(env: Env) {
  if (env.DVT_DBT_BUNDLE_STORE_BACKEND === 's3') {
    return {
      kind: 's3' as const,
      bucket: env.DVT_DBT_BUNDLE_S3_BUCKET as string,
    };
  }

  if (env.DVT_DBT_BUNDLE_STORE_BACKEND === 'file') {
    return {
      kind: 'file' as const,
      rootPath: env.DVT_DBT_BUNDLE_FILE_ROOT as string,
    };
  }

  return undefined;
}
