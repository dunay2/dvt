/**
 * @file packages/@dvt/engine/src/security/planIntegrity.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @baseline ADR-0012: Plan Integrity Ownership
 * @decision Engine entry-point plan integrity verification resolves the executable plan,
 *   validates metadata alignment, and recomputes planner identity before adapter dispatch.
 * @consequence Adapters receive an immutable PlanRef and must revalidate fetched plan bytes
 *   before executing runtime segments.
 */
import {
  parseExecutionPlan,
  type ExecutionPlan,
  type PlanRef,
  type RunExecutionPolicy,
} from '@dvt/contracts';
import { jcsCanonicalize } from '@dvt/crypto';

import type { IPlanFetcher } from '../ports/IPlanArtifactReader.js';
import { sha256Hex } from '../utils/sha256.js';

export class PlanIntegrityValidator {
  async fetchAndValidate(
    planRef: PlanRef,
    fetcher: IPlanFetcher
  ): Promise<{ plan: ExecutionPlan; executionPolicy: RunExecutionPolicy }> {
    const artifact = await fetcher.fetch(planRef);
    const bytes = artifact.bytes;
    validatePlanBytesAgainstRef(bytes, planRef);
    const plan = parseExecutablePlan(bytes);
    validatePlanAgainstRef(plan, planRef);
    const actualPlanId = derivePlanId(plan);
    if (actualPlanId !== planRef.planId) {
      throw new Error(`PLAN_ID_MISMATCH: expected=${planRef.planId} actual=${actualPlanId}`);
    }
    return {
      plan,
      executionPolicy: artifact.executionPolicy,
    };
  }
}

function validatePlanBytesAgainstRef(bytes: Uint8Array, ref: PlanRef): void {
  const actualSha256 = sha256Hex(bytes);
  if (actualSha256 !== ref.sha256) {
    throw new Error(
      `PLAN_INTEGRITY_VALIDATION_FAILED: expected=${ref.sha256} actual=${actualSha256}`
    );
  }
}

function parseExecutablePlan(bytes: Uint8Array): ExecutionPlan {
  try {
    const input = JSON.parse(Buffer.from(bytes).toString('utf8')) as unknown;
    return parseExecutionPlan(input);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`INVALID_EXECUTABLE_PLAN: ${reason}`, { cause: error });
  }
}

function validatePlanAgainstRef(plan: ExecutionPlan, ref: PlanRef): void {
  if (plan.metadata.planId !== ref.planId) {
    throw new Error('PLAN_REF_MISMATCH: planId');
  }
  if (plan.metadata.planVersion !== ref.planVersion) {
    throw new Error('PLAN_REF_MISMATCH: planVersion');
  }
  if (plan.metadata.schemaVersion !== ref.schemaVersion) {
    throw new Error('PLAN_REF_MISMATCH: schemaVersion');
  }
}

function derivePlanId(plan: ExecutionPlan): string {
  const canonical = jcsCanonicalize({
    metadata: {
      planVersion: plan.metadata.planVersion,
      inputHashSha256: plan.metadata.inputHashSha256,
    },
    steps: plan.steps,
  });
  return sha256Hex(canonical);
}
