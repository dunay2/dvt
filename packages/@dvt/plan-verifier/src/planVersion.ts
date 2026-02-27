import { PlanVerifierError } from './errors.js';

export type ParsedPlanVersion = {
  raw: string;
  major: number;
  minor: number;
  patch?: number;
};

const RE = /^(\d+)\.(\d+)(?:\.(\d+))?$/;

export function parsePlanVersionOrThrow(raw: string): ParsedPlanVersion {
  const m = RE.exec(raw);
  if (!m) {
    throw new PlanVerifierError(
      'INVALID_PLAN_VERSION',
      `Invalid planVersion '${raw}'. Expected 'MAJOR.MINOR' or 'MAJOR.MINOR.PATCH'.`
    );
  }
  const major = Number(m[1]);
  const minor = Number(m[2]);
  const patch = m[3] ? Number(m[3]) : undefined;
  if (
    !Number.isFinite(major) ||
    !Number.isFinite(minor) ||
    (patch !== undefined && !Number.isFinite(patch))
  ) {
    throw new PlanVerifierError(
      'INVALID_PLAN_VERSION',
      `planVersion '${raw}' contains non-numeric parts.`
    );
  }
  return { raw, major, minor, patch };
}

/**
 * Compatibility gate (Phase 1):
 * - must match MAJOR
 * Optional strictSameMinor:
 * - must also match MINOR (for strict minor mode operations)
 */
export function verifyPlanVersionOrThrow(params: {
  planVersion: string;
  supportedMajor: number;
  strictSameMinor?: boolean;
  supportedMinor?: number;
}): void {
  const v = parsePlanVersionOrThrow(params.planVersion);
  if (v.major !== params.supportedMajor) {
    throw new PlanVerifierError(
      'UNSUPPORTED_PLAN_VERSION',
      `Unsupported planVersion '${v.raw}'. Supported major=${params.supportedMajor}.`
    );
  }
  if (params.strictSameMinor) {
    if (params.supportedMinor === undefined) {
      throw new PlanVerifierError(
        'INVALID_PLAN_VERSION',
        'strictSameMinor=true requires supportedMinor.'
      );
    }
    if (v.minor !== params.supportedMinor) {
      throw new PlanVerifierError(
        'UNSUPPORTED_PLAN_VERSION',
        `Unsupported planVersion '${v.raw}'. Supported ${params.supportedMajor}.${params.supportedMinor}.x only.`
      );
    }
  }
}
