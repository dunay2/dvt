/**
 * @file packages/@dvt/engine/src/security/RunAccessPolicy.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @baseline ADR-0031: Storage Adapter Tenant Isolation Strategy
 * @decision Groups authorizer, planRefPolicy, and outboxRateLimiter into a single
 *   access-control collaborator so that WorkflowEngine depends on one policy port
 *   instead of three separate deps.
 * @consequence The engine surface shrinks; policy can evolve independently of the engine.
 * @version 1.0.0
 * @date 2026-03-14
 */
import type { PlanRef } from '@dvt/contracts';

import { OutboxRateLimitExceededError } from '../contracts/errors.js';
import type { IOutboxRateLimiter } from '../outbox/IOutboxRateLimiter.js';

import type { IAuthorizer } from './authorizer.js';
import type { PlanRefPolicy } from './planRefPolicy.js';

/**
 * Single access-control port for the WorkflowEngine.
 * Implementations decide whether a tenant may perform engine operations.
 */
export interface IRunAccessPolicy {
  /** Throws if the tenant does not have access. */
  assertTenantAccess(tenantId: string): Promise<void>;
  /** Throws if the plan URI is not allowed by policy. */
  validatePlanRef(planRef: PlanRef): void;
  /** Throws OutboxRateLimitExceededError if the tenant is over its outbox limit. */
  checkRateLimit(tenantId: string): void;
}

export interface RunAccessPolicyConfig {
  authorizer: IAuthorizer;
  planRefPolicy: PlanRefPolicy;
  outboxRateLimiter?: IOutboxRateLimiter;
}

/**
 * Default implementation that delegates to the existing authorizer, planRefPolicy,
 * and optional outboxRateLimiter.
 */
export class RunAccessPolicy implements IRunAccessPolicy {
  constructor(private readonly config: RunAccessPolicyConfig) {}

  async assertTenantAccess(tenantId: string): Promise<void> {
    await this.config.authorizer.assertTenantAccess(tenantId);
  }

  validatePlanRef(planRef: PlanRef): void {
    this.config.planRefPolicy.validateOrThrow(planRef.uri);
  }

  checkRateLimit(tenantId: string): void {
    if (this.config.outboxRateLimiter && !this.config.outboxRateLimiter.tryAcquire(tenantId, 1)) {
      throw new OutboxRateLimitExceededError(tenantId);
    }
  }
}
