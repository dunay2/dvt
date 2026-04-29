/**
 * @file packages/@dvt/engine/src/index.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @decision Decision â€” Expose a stable public surface of the engine for orchestration decoupled from the runtime
 * @consequence Consumers integrate engine contracts/ports without depending on internal implementations
 * @version 1.0.0
 * @date 2026-02-21
 */
export * from './contracts/types.js';
export * from './contracts/runEvents.js';
export * from './contracts/executionPlan.js';
export * from './contracts/errors.js';
export * from './contracts/engine/index.js';
export * from './contracts/PlanAdmissionPolicy.js';
export * from './ports/IWorkflowEngine.js';

export * from './core/SnapshotProjector.js';
export * from './core/idempotency.js';
export { buildWorkflowEngineFacade } from './core/buildWorkflowEngineFacade.js';
export type { WorkflowEngineBuilder } from './core/buildWorkflowEngineFacade.js';
export type { WorkflowEngineDeps } from './core/WorkflowEngine.js';

export type {
  EventInput,
  IClock,
  IIdempotencyKeyBuilder,
  IRunStateStore,
  IRunStateStoreMaintenance,
  IRunStateStoreRead,
  IRunStateStoreWrite,
  ListEventsOptions,
  ListRunsOptions,
  ProviderRefUpdate,
  RetryAttemptReservation,
  RunBootstrapInput,
  RunStateCommandPort,
  StepEventInput,
} from './ports/IRunStateStore.js';
export { CURRENT_WORKFLOW_SNAPSHOT_SCHEMA_VERSION } from './ports/IRunStateStore.js';
export type {
  IPlanFetcher,
  IPlanIntegrityValidator,
  StoredPlanArtifact,
} from './ports/IPlanArtifactReader.js';
export * from './ports/IRunSnapshotStalenessQuery.js';
export * from './ports/IRunMaintenanceService.js';
export * from './ports/IStartRunIntentStore.js';
export * from './ports/IProjector.js';
export * from './ports/IRunExecutionContextResolver.js';
export * from './ports/IRunExecutionContextBindingPolicy.js';
export * from './adapters/IProviderAdapter.js';
export * from './domain/IRunRecoveryService.js';
export * from './domain/IRunHealthService.js';

export * from './services/RunMaintenanceService.js';
export * from './services/RunEnrichmentService.js';
export { buildRunHealthService } from './services/RunHealthService.js';
export { buildRunStatusQueryService } from './services/RunStatusQueryService.js';
export { buildRunRecoveryService } from './application/RecoverRunApplicationService.js';
export { buildRunControlService } from './core/WorkflowEngineCoreService.js';
export * from './workers/IntentReconcilerWorker.js';
export * from './domain/startRunIntentPolicy.js';

export * from './outbox/IOutboxRateLimiter.js';
export * from './outbox/TokenBucketRateLimiter.js';

export { SequenceClock, epochMsToIsoUtc, parseIsoUtcToEpochMs } from './utils/clock.js';

export * from './security/authorizer.js';
export * from './security/AuthorizationError.js';
export * from './security/planRefPolicy.js';
export * from './security/planIntegrity.js';
export * from './security/RunAccessPolicy.js';

export * from './application/providerSelection.js';
export * from './application/IStartRunApplicationService.js';
export * from './application/StartRunAdmissionGuard.js';
export * from './application/StartRunApplicationService.js';
