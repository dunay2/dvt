/**
 * @file packages/@dvt/engine/src/runtime.ts
 * @ownedConcern Runtime engine composition API for builders, policies, services, and workers.
 * @baseline ADR-0003: Execution Model Sovereignty
 * @decision Keep implementation composition behind a governed entrypoint instead of the root barrel.
 * @consequence Composition roots can assemble runtime behavior without widening the stable public API.
 * @version 1.0.0
 * @date 2026-05-14
 */
export * from './core/SnapshotProjector.js';
export * from './core/idempotency.js';
export { buildWorkflowEngineFacade } from './core/buildWorkflowEngineFacade.js';
export type { WorkflowEngineBuilder } from './core/buildWorkflowEngineFacade.js';
export type { WorkflowEngineDeps } from './core/WorkflowEngine.js';
export {
  buildWorkflowEngineUseCases,
  WorkflowCancelRunUseCase,
  WorkflowRecoverRunUseCase,
  WorkflowRunStatusUseCase,
  WorkflowSignalRunUseCase,
  WorkflowStartRunUseCase,
} from './application/workflow-engine-use-cases/index.js';
export type {
  IWorkflowCancelRunUseCase,
  IWorkflowRecoverRunUseCase,
  IWorkflowRunStatusUseCase,
  IWorkflowSignalRunUseCase,
  IWorkflowStartRunUseCase,
  WorkflowEngineUseCaseDeps,
  WorkflowEngineUseCases,
} from './application/workflow-engine-use-cases/index.js';

export * from './adapters/CircuitBreakingProviderAdapter.js';
export * from './services/RunMaintenanceService.js';
export * from './services/RunEnrichmentService.js';
export { buildRunCommandService } from './services/runControl/RunCommandService.js';
export { buildRunSignalService } from './services/runControl/RunSignalService.js';
export * from './services/startRun/StartRunTelemetryPolicy.js';
export { buildRunHealthService } from './services/RunHealthService.js';
export { buildRunStatusQueryService } from './services/RunStatusQueryService.js';
export { buildRunRecoveryService } from './application/RecoverRunApplicationService.js';
export { buildRunControlService } from './core/WorkflowEngineCoreService.js';
export * from './workers/IntentReconcilerWorker.js';
export * from './domain/startRunIntentPolicy.js';

export * from './outbox/TokenBucketRateLimiter.js';

export { SequenceClock, epochMsToIsoUtc, parseIsoUtcToEpochMs } from './utils/clock.js';

export * from './security/authorizer.js';
export * from './security/planRefPolicy.js';
export * from './security/planIntegrity.js';
export * from './security/RunAccessPolicy.js';

export * from './application/providerSelection.js';
export * from './application/IStartRunApplicationService.js';
export * from './application/StartRunAdmissionGuard.js';
export * from './application/StartRunApplicationService.js';
