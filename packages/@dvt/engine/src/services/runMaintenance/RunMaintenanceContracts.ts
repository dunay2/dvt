import { RUN_MAINTENANCE_CONTEXT } from './RunMaintenanceDomainConstants.js';

export interface RunMaintenanceServiceDeps {
  stateStoreRead: import('../../ports/IRunStateStore.js').IRunStateStoreRead;
  stateStoreWrite: import('../../ports/IRunStateStore.js').IRunStateStoreWrite;
  intentStore: import('../../ports/IStartRunIntentStore.js').IStartRunIntentStore;
  adapters: Map<
    import('@dvt/contracts').EngineRunRef['provider'],
    import('../../adapters/IProviderAdapter.js').IProviderAdapter
  >;
  authorizer: import('../../security/authorizer.js').IAuthorizer;
  clock: import('../../utils/clock.js').IClock;
  idempotency: import('../../core/idempotency.js').IdempotencyKeyBuilder;
  observability: import('@dvt/observability').IObservability;
}

export type OrphanedIntent = {
  readonly intentId: string;
  readonly tenantId: string;
  readonly runId: string;
  readonly provider: import('@dvt/contracts').EngineRunRef['provider'];
  readonly status: string;
  readonly engineRunRef?: import('@dvt/contracts').EngineRunRef;
};

export type ReconcileOrphanedIntentOutcome = {
  readonly expired?: string;
  readonly cancelled?: string;
  readonly cancelFailed?: string;
};

export function buildMaintenanceContext(tenantId: string): {
  tenantId: string;
  projectId: string;
  environmentId: string;
  runId: string;
} {
  return {
    tenantId,
    projectId: RUN_MAINTENANCE_CONTEXT.projectId,
    environmentId: RUN_MAINTENANCE_CONTEXT.environmentId,
    runId: RUN_MAINTENANCE_CONTEXT.runId,
  };
}

export type RunMaintenanceListRunsQuery = {
  tenantId: import('@dvt/contracts').TenantId;
  status: import('./RunMaintenanceDomainConstants.js').RunMaintenanceRunStatus;
  limit: number;
};
