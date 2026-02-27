import { sha256Hex, utf8Encode } from './crypto.js';
import { PlanVerifierError } from './errors.js';
import { verifyPlanVersionOrThrow } from './planVersion.js';

/**
 * Primary invariant:
 *   sha256( canonicalPlanJson ) === planId
 *
 * canonicalPlanJson MUST already be RFC-8785 canonical JSON produced by the planner.
 */
export async function verifyPlanIdOrThrow(params: {
  canonicalPlanJson: string;
  planId: string;
}): Promise<void> {
  const bytes = utf8Encode(params.canonicalPlanJson);
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
 * Convenience wrapper: checks version gate first, then planId integrity.
 */
export async function verifyPlanOrThrow(params: {
  canonicalPlanJson: string;
  planId: string;
  planVersion: string;
  supportedMajor: number;
  strictSameMinor?: boolean;
  supportedMinor?: number;
}): Promise<void> {
  verifyPlanVersionOrThrow({
    planVersion: params.planVersion,
    supportedMajor: params.supportedMajor,
    strictSameMinor: params.strictSameMinor,
    supportedMinor: params.supportedMinor,
  });
  await verifyPlanIdOrThrow({ canonicalPlanJson: params.canonicalPlanJson, planId: params.planId });
}
