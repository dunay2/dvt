import { sha256Hex, utf8Bytes } from '@dvt/crypto';

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
  if (!globalThis.TextEncoder) {
    throw new PlanVerifierError(
      'MISSING_TEXT_ENCODER',
      'TextEncoder is not available on globalThis. Provide a runtime/polyfill with TextEncoder support.'
    );
  }
  const bytes = utf8Bytes(params.canonicalPlanCoreJson);
  const actual = sha256Hex(bytes);
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
