/**
 * @file packages/@dvt/engine/src/index.ts
 * @ownedConcern Runtime engine stable public API for contracts, errors, ports, and role interfaces.
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
export * from './contracts/PlanSchemaVersionPolicy.js';
export * from './ports/IWorkflowEngine.js';

export type {
  IWorkflowCancelRunUseCase,
  IWorkflowRecoverRunUseCase,
  IWorkflowRunStatusUseCase,
  IWorkflowSignalRunUseCase,
  IWorkflowStartRunUseCase,
  WorkflowEngineUseCaseDeps,
  WorkflowEngineUseCases,
} from './application/workflow-engine-use-cases/index.js';

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
export type { IPlanIntegrityValidator } from './ports/IPlanIntegrityValidator.js';
export * from './ports/IRunSnapshotStalenessQuery.js';
export * from './ports/IRunMaintenanceService.js';
export * from './ports/IStartRunIntentStore.js';
export * from './ports/IProjector.js';
export * from './ports/IRunExecutionContextResolver.js';
export * from './ports/IRunExecutionContextBindingPolicy.js';
export type { IAuthorizer } from './ports/IAuthorizer.js';
export type { IRunAccessPolicy } from './ports/IRunAccessPolicy.js';
export * from './adapters/IProviderAdapter.js';
export * from './domain/IRunCommandService.js';
export * from './domain/IRunSignalService.js';
export * from './domain/IRunRecoveryService.js';
export * from './domain/IRunHealthService.js';
export * from './domain/IRunStatusQueryService.js';
export type { IRunEnrichmentService } from './contracts/IRunEnrichmentService.v1.js';

export * from './outbox/IOutboxRateLimiter.js';

export * from './security/AuthorizationError.js';
