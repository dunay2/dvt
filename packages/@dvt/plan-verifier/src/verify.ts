import { sha256Hex, utf8Encode } from './crypto.js';
import { PlanVerifierError } from './errors.js';
import { type PlanRuntime, verifyPlanAdmissionOrThrow } from './planVersion.js';

/**
 * Primary invariant:
 *   sha256( canonicalPlanCoreJson ) === planId
 *
 * canonicalPlanCoreJson MUST already be RFC-8785 canonical JSON produced by the planner.
 */
export async function verifyPlanIdOrThrow(params: {
  canonicalPlanCoreJson: string;
  planId: string;
}): Promise<void> {
  const bytes = utf8Encode(params.canonicalPlanCoreJson);
  const actual = await sha256Hex(bytes);
  const expected = params.planId.toLowerCase();
  if (actual !== expected) {
    throw new PlanVerifierError(
      'PLAN_ID_MISMATCH',
      `planId mismatch. expected=${expected} actual=${actual}`
    );
  }
}

/**
 * Convenience wrapper: checks canonical plan admission first, then planId integrity.
 * Pair compatibility is delegated to the EXECUTION_PLAN_ADMISSION_MATRIX facade.
 */
type VerifyPlanBaseParams = {
  canonicalPlanCoreJson: string;
  planId: string;
  planVersion: string;
  schemaVersion: string;
};

type VerifyPlanRuntimeParams = VerifyPlanBaseParams & {
  runtime: PlanRuntime;
};

export async function verifyPlanOrThrow(params: VerifyPlanRuntimeParams): Promise<void> {
  verifyPlanAdmissionOrThrow({
    planVersion: params.planVersion,
    schemaVersion: params.schemaVersion,
    runtime: params.runtime,
  });

  await verifyPlanIdOrThrow({
    canonicalPlanCoreJson: params.canonicalPlanCoreJson,
    planId: params.planId,
  });
}
