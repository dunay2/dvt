/**
 * @file apps/api/src/application/services/WorkflowEngineFactory.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @decision Provide two construction paths:
 *   - buildWorkflowEngine: production path with subsystem-grouped config
 *   - createWorkflowEngine: test seam that accepts flat deps and an override ctor
 */
import {
  IdempotencyKeyBuilder,
  PlanRefPolicy,
  RunAccessPolicy,
  SnapshotProjector,
  WorkflowEngine,
  type EngineRunRef,
  type IAuthorizer,
  type IClock,
  type IOutboxRateLimiter,
  type IProviderAdapter,
  type IRunStateStore,
  type IStartRunIntentStore,
  type WorkflowEngineDeps,
} from '@dvt/engine';
import type { IObservability } from '@dvt/observability';

export interface EngineSecurityConfig {
  authorizer: IAuthorizer;
  planRefAllowedSchemes: string[];
  planRefAllowedHosts?: string[];
  outboxRateLimiter?: IOutboxRateLimiter;
}

export interface EnginePersistenceConfig {
  stateStore: IRunStateStore;
  intentStore: IStartRunIntentStore;
}

export interface EngineRuntimeConfig {
  adapters: Map<EngineRunRef['provider'], IProviderAdapter>;
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

export function buildWorkflowEngine(config: EngineConfig): WorkflowEngine {
  if (config.runtime.adapters.size === 0) {
    throw new Error(
      'ENGINE_NO_ADAPTERS: at least one adapter must be registered before building the engine'
    );
  }

  const policy = new RunAccessPolicy({
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

  return new WorkflowEngine({
    stateStore: config.persistence.stateStore,
    projector: new SnapshotProjector(),
    idempotency: new IdempotencyKeyBuilder(),
    clock: config.infrastructure.clock,
    policy,
    intentStore: config.persistence.intentStore,
    adapters: config.runtime.adapters,
    observability: config.infrastructure.observability,
    ...(config.runtime.requiredProviders !== undefined
      ? { requiredProviders: config.runtime.requiredProviders }
      : {}),
    ...(config.runtime.timeouts !== undefined ? { timeouts: config.runtime.timeouts } : {}),
  });
}

export type WorkflowEngineConstructor = new (deps: WorkflowEngineDeps) => WorkflowEngine;

export function createWorkflowEngine(
  deps: WorkflowEngineDeps,
  EngineCtor: WorkflowEngineConstructor = WorkflowEngine
): WorkflowEngine {
  return new EngineCtor(deps);
}
