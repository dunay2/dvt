import { createHash } from 'node:crypto';

import type { IPlanFetcher as IStoredPlanFetcher, PlanRef } from '@dvt/contracts';
import type { ExecutionPlan } from '@dvt/engine';

import { parseStoredExecutablePlan } from './storedExecutablePlan.js';

export class StoredExecutablePlanResolver {
  public constructor(
    private readonly deps: {
      readonly fetcher: IStoredPlanFetcher;
    }
  ) {}

  public async fetch(planRef: PlanRef): Promise<ExecutionPlan> {
    if (planRef.uri.startsWith('dvt-plan://')) {
      const bytes = await this.deps.fetcher.fetch(planRef);
      validateStoredPlanIntegrity(bytes, planRef);
      const plan = parseStoredExecutablePlan(bytes);
      validateStoredPlanMetadata(plan, planRef);
      return plan;
    }

    return {
      metadata: {
        planId: planRef.planId,
        planVersion: planRef.planVersion,
        schemaVersion: planRef.schemaVersion,
        contractVersion: '1.0.0',
        ...(planRef.requiresCapabilities === undefined
          ? {}
          : { requiresCapabilities: planRef.requiresCapabilities }),
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
