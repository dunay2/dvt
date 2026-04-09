import { sha256Hex, utf8Encode } from './crypto.js';
import { PlanVerifierError } from './errors.js';
import { type PlanRuntime, verifyPlanVersionOrThrow } from './planVersion.js';

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
 * Convenience wrapper: checks version gate first, then planId integrity.
 */
type VerifyPlanBaseParams = {
  canonicalPlanCoreJson: string;
  planId: string;
  planVersion: string;
};

type VerifyPlanLegacyParams = VerifyPlanBaseParams & {
  supportedMajor: number;
  strictSameMinor?: boolean;
  supportedMinor?: number;
};

type VerifyPlanRuntimeParams = VerifyPlanBaseParams & {
  runtime: PlanRuntime;
};

export async function verifyPlanOrThrow(
  params: VerifyPlanLegacyParams | VerifyPlanRuntimeParams
): Promise<void> {
  if ('runtime' in params) {
    verifyPlanVersionOrThrow({
      planVersion: params.planVersion,
      runtime: params.runtime,
    });
  } else {
    const versionParams: {
      planVersion: string;
      supportedMajor: number;
      strictSameMinor?: boolean;
      supportedMinor?: number;
    } = {
      planVersion: params.planVersion,
      supportedMajor: params.supportedMajor,
    };
    if (params.strictSameMinor !== undefined) {
      versionParams.strictSameMinor = params.strictSameMinor;
    }
    if (params.supportedMinor !== undefined) {
      versionParams.supportedMinor = params.supportedMinor;
    }
    verifyPlanVersionOrThrow(versionParams);
  }

  await verifyPlanIdOrThrow({
    canonicalPlanCoreJson: params.canonicalPlanCoreJson,
    planId: params.planId,
  });
}
