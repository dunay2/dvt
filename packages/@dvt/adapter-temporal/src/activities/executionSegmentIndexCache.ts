/**
 * @ownedConcern Bound activity-local reuse of verified execution-plan indexes.
 * @baseline ADR-0052: PlanRef Continuation Safety
 * @decision Retain one digest-and-scope index after each request has fetched and verified its plan.
 * @consequence Eviction and worker restart rebuild derived data without retaining plans or authorization.
 * @version 1.0.0
 */
import type { ExecutionPlan, PlanRef, ResolvedRunContext } from '@dvt/contracts';

import {
  prepareExecutionSegmentIndex,
  resolveExecutionSegmentFromPlan,
  type ExecutionSegmentIndex,
  type ResolvedExecutionSegment,
} from '../workflows/executionSegmentResolver.js';

type VerifiedPlanIdentity = Pick<PlanRef, 'sha256'> &
  Pick<ResolvedRunContext, 'tenantId' | 'projectId' | 'environmentId'>;

export class ExecutionSegmentIndexCache {
  private entry: { key: string; index: ExecutionSegmentIndex } | undefined;

  resolve(
    plan: ExecutionPlan,
    identity: VerifiedPlanIdentity,
    layerIndex: number
  ): ResolvedExecutionSegment {
    const key = JSON.stringify([
      identity.sha256,
      identity.tenantId,
      identity.projectId,
      identity.environmentId,
    ]);
    if (this.entry?.key !== key) {
      this.entry = { key, index: prepareExecutionSegmentIndex(plan) };
    }
    return resolveExecutionSegmentFromPlan(plan, layerIndex, this.entry.index);
  }
}
