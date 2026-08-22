/**
 * @ownedConcern Verify executable plan bytes and metadata before provider dispatch.
 * @file packages/@dvt/engine/src/security/planIntegrity.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @baseline ADR-0012: Plan Integrity Ownership
 * @decision Engine entry-point plan integrity verification resolves the executable plan,
 *   validates metadata alignment, and recomputes planner identity before adapter dispatch.
 * @consequence Adapters receive an immutable PlanRef and must revalidate fetched plan bytes
 *   before executing runtime segments.
 */
import type { IStoredPlanArtifactReader } from '@dvt/artifacts';
import {
  parseExecutionPlan,
  type ExecutionPlan,
  type PlanRef,
  type RunExecutionPolicy,
  type ScopedPlanRef,
} from '@dvt/contracts';
import { jcsCanonicalize } from '@dvt/crypto';

import { type IClock, parseIsoUtcToEpochMs } from '../utils/clock.js';
import { sha256Hex, sha256HexUtf8 } from '../utils/sha256.js';

export class PlanIntegrityValidator {
  private readonly clock: IClock;

  constructor(args: { clock: IClock }) {
    this.clock = args.clock;
  }

  async fetchAndValidate(
    input: ScopedPlanRef,
    fetcher: IStoredPlanArtifactReader
  ): Promise<{ plan: ExecutionPlan; executionPolicy: RunExecutionPolicy }> {
    const planRef = input.planRef;
    assertPlanRefNotExpired(planRef, this.clock);
    const artifact = await fetcher.fetchStoredPlanArtifact(input);
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

function assertPlanRefNotExpired(ref: PlanRef, clock: IClock): void {
  if (ref.expiresAt === undefined) {
    return;
  }

  const expiresAtEpochMs = parseIsoUtcToEpochMs(ref.expiresAt);
  const nowIsoUtc = clock.nowIsoUtc();
  const nowEpochMs = parseIsoUtcToEpochMs(nowIsoUtc);
  if (expiresAtEpochMs <= nowEpochMs) {
    throw new Error(`PLAN_REF_EXPIRED: expiresAt=${ref.expiresAt} now=${nowIsoUtc}`);
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
  return sha256HexUtf8(canonical);
}
