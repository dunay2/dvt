/**
 * Owned concern: resolve stored executable plans from immutable plan refs.
 * This resolver validates integrity and metadata before returning a plan to
 * planner-backed runtime consumers.
 */
import { createHash } from 'node:crypto';

import type { IStoredPlanArtifactReader } from '@dvt/artifacts';
import {
  CURRENT_EXECUTION_PLAN_CONTRACT_VERSION,
  CURRENT_EXECUTION_PLAN_SCHEMA_VERSION,
  CURRENT_EXECUTION_PLAN_VERSION,
  type PlanRef,
  type IStepTypeRegistry,
  type ScopedPlanRef,
} from '@dvt/contracts';
import type { ExecutionPlan } from '@dvt/engine';

import { parseStoredExecutablePlan } from './storedExecutablePlan.js';

export class StoredExecutablePlanResolver {
  public constructor(
    private readonly deps: {
      readonly fetcher: IStoredPlanArtifactReader;
      readonly stepTypeRegistry?: IStepTypeRegistry;
    }
  ) {}

  public async fetch(input: ScopedPlanRef): Promise<ExecutionPlan> {
    const { planRef } = input;
    if (planRef.uri.startsWith('dvt-plan://')) {
      const bytes = await this.deps.fetcher.fetchStoredPlanArtifact(input);
      validateStoredPlanIntegrity(bytes.bytes, planRef);
      const plan = parseStoredExecutablePlan(bytes.bytes, {
        ...(this.deps.stepTypeRegistry === undefined
          ? {}
          : { stepTypeRegistry: this.deps.stepTypeRegistry }),
      });
      validateStoredPlanMetadata(plan, planRef);
      return plan;
    }

    return {
      metadata: {
        planId: planRef.planId,
        planVersion: CURRENT_EXECUTION_PLAN_VERSION,
        schemaVersion: CURRENT_EXECUTION_PLAN_SCHEMA_VERSION,
        contractVersion: CURRENT_EXECUTION_PLAN_CONTRACT_VERSION,
        inputHashSha256: planRef.sha256,
        createdAtIso: new Date().toISOString(),
      },
      steps: [],
    };
  }
}

function validateStoredPlanIntegrity(bytes: Uint8Array, planRef: PlanRef): void {
  const actualSha256 = createHash('sha256').update(bytes).digest('hex');
  if (actualSha256 !== planRef.sha256) {
    throw new Error(
      `PLAN_INTEGRITY_VALIDATION_FAILED: expected=${planRef.sha256} actual=${actualSha256}`
    );
  }
}

function validateStoredPlanMetadata(plan: ExecutionPlan, planRef: PlanRef): void {
  if (plan.metadata.planId !== planRef.planId) {
    throw new Error('PLAN_REF_MISMATCH: planId');
  }
  if (plan.metadata.planVersion !== planRef.planVersion) {
    throw new Error('PLAN_REF_MISMATCH: planVersion');
  }
  if (plan.metadata.schemaVersion !== planRef.schemaVersion) {
    throw new Error('PLAN_REF_MISMATCH: schemaVersion');
  }
}
