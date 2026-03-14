/**
 * @file packages/@dvt/engine/src/index.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @decision Decision — Expose a stable public surface of the engine for orchestration decoupled from the runtime
 * @consequence Consumers integrate engine contracts/ports without depending on internal implementations
 * @version 1.0.0
 * @date 2026-02-21
 */
export * from './contracts/IWorkflowEngine.v1_1_1.js';
export * from './contracts/types.js';
export * from './contracts/runEvents.js';
export * from './contracts/executionPlan.js';
export * from './contracts/errors.js';
export * from './contracts/engine/index.js';

export * from './core/WorkflowEngine.js';
export * from './core/SnapshotProjector.js';
export * from './core/idempotency.js';

export * from './ports/IRunStateStore.js';
export * from './ports/IRunMaintenanceService.js';
export * from './ports/IStartRunIntentStore.js';
export * from './adapters/IProviderAdapter.js';

export * from './services/RunMaintenanceService.js';
export * from './workers/IntentReconcilerWorker.js';
export * from './domain/startRunIntentPolicy.js';

export * from './outbox/IOutboxRateLimiter.js';
export * from './outbox/TokenBucketRateLimiter.js';

export * from './utils/clock.js';

export * from './security/authorizer.js';
export * from './security/AuthorizationError.js';
export * from './security/planRefPolicy.js';
export * from './security/planIntegrity.js';

export * from './application/providerSelection.js';
