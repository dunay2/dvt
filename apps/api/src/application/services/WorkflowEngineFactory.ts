/**
 * @file apps/api/src/application/services/WorkflowEngineFactory.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @decision Provide two construction paths:
 *   - buildWorkflowEngine: production path - accepts subsystem-grouped config,
 *     validates adapters.size > 0 at construction time, hides internal dep wiring.
 *   - createWorkflowEngine: test-seam path - accepts a flat WorkflowEngineDeps
 *     and an optional builder override, allowing unit tests to inject fakes.
 */
import {
  buildRunControlService,
  buildRunHealthService,
  buildRunRecoveryService,
  buildRunStatusQueryService,
  buildWorkflowEngineFacade,
  IdempotencyKeyBuilder,
  PlanRefPolicy,
  RunAccessPolicy,
  RunEnrichmentService,
  SnapshotProjector,
  StartRunAdmissionGuard,
  StartRunApplicationService,
  type EngineRunRef,
  type IAuthorizer,
  type IClock,
  type IOutboxRateLimiter,
  type IPlanFetcher,
  type IProviderAdapter,
  type IRunAccessPolicy,
  type IRunEnrichmentService,
  type IRunExecutionContextBindingPolicy,
  type IRunExecutionContextResolver,
  type IRunHealthService,
  type IRunStateStoreRead,
  type IRunStateStoreWrite,
  type IStartRunIntentStore,
  type IWorkflowEngine,
  type WorkflowEngineBuilder,
  type WorkflowEngineDeps,
} from '@dvt/engine';
import type { IObservability } from '@dvt/observability';

// Subsystem config types ------------------------------------------------------

export interface EngineSecurityConfig {
  /** Authorizer that enforces tenant-level access control. */
  authorizer: IAuthorizer;
  /** URI schemes that are permitted in PlanRef (e.g. ['https', 's3']). */
  planRefAllowedSchemes: string[];
  /** Optional host allowlist for http/https PlanRef URIs. */
  planRefAllowedHosts?: string[];
  /** Optional per-tenant rate limiter for the outbox. */
  outboxRateLimiter?: IOutboxRateLimiter;
}

export interface EnginePersistenceConfig {
  stateStoreRead: IRunStateStoreRead;
  stateStoreWrite: IRunStateStoreWrite;
  intentStore: IStartRunIntentStore;
  planFetcher: IPlanFetcher;
  runExecutionContextResolver?: IRunExecutionContextResolver;
  runExecutionContextBindingPolicy?: IRunExecutionContextBindingPolicy;
}

export interface EngineRuntimeConfig {
  adapters: Map<EngineRunRef['provider'], IProviderAdapter>;
  /** Providers that MUST be registered at boot time. Engine throws at construction if missing. */
  requiredProviders?: EngineRunRef['provider'][];
  timeouts?: { adapterCallMs?: number; outboxEnqueueMs?: number };
}

export interface EngineInfrastructureConfig {
  clock: IClock;
  observability: IObservability;
}

export interface EngineConfig {
  security: EngineSecurityConfig;
  persistence: EnginePersistenceConfig;
  runtime: EngineRuntimeConfig;
  infrastructure: EngineInfrastructureConfig;
}

export interface BuiltWorkflowEngineRuntime {
  engine: IWorkflowEngine;
  runEnrichmentService: IRunEnrichmentService;
  runHealthService: IRunHealthService;
}

// Production factory ----------------------------------------------------------

/**
 * Builds the runtime read/write engine facade plus the dedicated enrichment service
 * from a structured subsystem config.
 * Validates that at least one adapter is registered before construction.
 * Constructs SnapshotProjector, IdempotencyKeyBuilder, PlanRefPolicy, and
 * RunAccessPolicy internally - callers only provide infrastructure inputs.
 */
export function buildWorkflowEngine(config: EngineConfig): BuiltWorkflowEngineRuntime {
  if (config.runtime.adapters.size === 0) {
    throw new Error(
      'ENGINE_NO_ADAPTERS: at least one adapter must be registered before building the engine'
    );
  }

  const policy: IRunAccessPolicy = new RunAccessPolicy({
    authorizer: config.security.authorizer,
    planRefPolicy: new PlanRefPolicy({
      allowedSchemes: config.security.planRefAllowedSchemes,
      ...(config.security.planRefAllowedHosts !== undefined
        ? { allowedHosts: config.security.planRefAllowedHosts }
        : {}),
    }),
    ...(config.security.outboxRateLimiter !== undefined
      ? { outboxRateLimiter: config.security.outboxRateLimiter }
      : {}),
  });
  const projector = new SnapshotProjector();
  const idempotency = new IdempotencyKeyBuilder();
  const startRunApplicationService = new StartRunApplicationService({
    policy,
    guard: new StartRunAdmissionGuard({
      policy,
      stateStoreRead: config.persistence.stateStoreRead,
      adapters: config.runtime.adapters,
      ...(config.persistence.runExecutionContextResolver === undefined
        ? {}
        : { runExecutionContextResolver: config.persistence.runExecutionContextResolver }),
      ...(config.persistence.runExecutionContextBindingPolicy === undefined
        ? {}
        : {
            runExecutionContextBindingPolicy: config.persistence.runExecutionContextBindingPolicy,
          }),
    }),
    stateStoreRead: config.persistence.stateStoreRead,
    stateStoreWrite: config.persistence.stateStoreWrite,
    idempotency,
    clock: config.infrastructure.clock,
    intentStore: config.persistence.intentStore,
    planFetcher: config.persistence.planFetcher,
    observability: config.infrastructure.observability,
    ...(config.runtime.timeouts === undefined ? {} : { timeouts: config.runtime.timeouts }),
  });
  const runControlService = buildRunControlService({
    stateStoreRead: config.persistence.stateStoreRead,
    stateStoreWrite: config.persistence.stateStoreWrite,
    idempotency,
    policy,
    adapters: config.runtime.adapters,
    observability: config.infrastructure.observability,
    ...(config.runtime.timeouts === undefined ? {} : { timeouts: config.runtime.timeouts }),
    clock: config.infrastructure.clock,
  });
  const runStatusQueryService = buildRunStatusQueryService({
    stateStoreRead: config.persistence.stateStoreRead,
    projector,
    policy,
    observability: config.infrastructure.observability,
    clock: config.infrastructure.clock,
  });
  const runRecoveryService = buildRunRecoveryService({
    stateStoreRead: config.persistence.stateStoreRead,
    stateStoreWrite: config.persistence.stateStoreWrite,
    projector,
    policy,
    planFetcher: config.persistence.planFetcher,
    adapters: config.runtime.adapters,
    observability: config.infrastructure.observability,
    clock: config.infrastructure.clock,
    startRunApplicationService,
    ...(config.persistence.runExecutionContextResolver === undefined
      ? {}
      : { runExecutionContextResolver: config.persistence.runExecutionContextResolver }),
    ...(config.persistence.runExecutionContextBindingPolicy === undefined
      ? {}
      : {
          runExecutionContextBindingPolicy: config.persistence.runExecutionContextBindingPolicy,
        }),
  });
  const runHealthService = buildRunHealthService({
    stateStoreRead: config.persistence.stateStoreRead,
    adapters: config.runtime.adapters,
  });
  return {
    engine: buildWorkflowEngineFacade({
      startRunApplicationService,
      runRecoveryService,
      runControlService,
      runStatusQueryService,
      adapters: config.runtime.adapters,
      observability: config.infrastructure.observability,
      ...(config.runtime.requiredProviders !== undefined
        ? { requiredProviders: config.runtime.requiredProviders }
        : {}),
      ...(config.runtime.timeouts !== undefined ? { timeouts: config.runtime.timeouts } : {}),
    }),
    runHealthService,
    runEnrichmentService: new RunEnrichmentService({
      stateStoreRead: config.persistence.stateStoreRead,
      projector,
      policy,
      adapters: config.runtime.adapters,
      observability: config.infrastructure.observability,
      ...(config.runtime.timeouts === undefined ? {} : { timeouts: config.runtime.timeouts }),
    }),
  };
}

// Test seam -----------------------------------------------------------------

export type WorkflowEngineConstructor = WorkflowEngineBuilder;

/**
 * Test seam: allows unit tests to inject a fake engine builder while keeping
 * the same dep shape. Do not use in production code - use buildWorkflowEngine.
 */
export function createWorkflowEngine(
  deps: WorkflowEngineDeps,
  buildEngine: WorkflowEngineConstructor = buildWorkflowEngineFacade
): IWorkflowEngine {
  return buildEngine(deps);
}
