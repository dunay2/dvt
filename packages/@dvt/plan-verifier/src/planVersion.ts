import { PlanVerifierError } from './errors.js';

export type ParsedPlanVersion = {
  raw: string;
  major: number;
  minor: number;
  patch?: number;
};

export const PLAN_RUNTIME_COMPATIBILITY_MATRIX = {
  planner: {
    acceptedPlanVersions: ['2.3'],
  },
  engine: {
    acceptedPlanVersions: ['2.3'],
  },
  'adapter-temporal': {
    acceptedPlanVersions: ['2.3'],
  },
} as const;

export type PlanRuntime = keyof typeof PLAN_RUNTIME_COMPATIBILITY_MATRIX;

export function getSupportedPlanVersionsForRuntime(runtime: PlanRuntime): readonly string[] {
  return PLAN_RUNTIME_COMPATIBILITY_MATRIX[runtime].acceptedPlanVersions;
}

type RuntimeCompatibilityParams = {
  planVersion: string;
  runtime: PlanRuntime;
};

type LegacyCompatibilityParams = {
  planVersion: string;
  supportedMajor: number;
  strictSameMinor?: boolean;
  supportedMinor?: number;
};

export type VerifyPlanVersionParams = LegacyCompatibilityParams | RuntimeCompatibilityParams;

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
  return patch === undefined ? { raw, major, minor } : { raw, major, minor, patch };
}

/**
 * Compatibility gate (legacy):
 * - must match MAJOR
 * Optional strictSameMinor:
 * - must also match MINOR
 *
 * Compatibility gate (current):
 * - runtime support is governed by PLAN_RUNTIME_COMPATIBILITY_MATRIX.
 */
export function verifyPlanVersionAgainstRuntimeOrThrow(params: RuntimeCompatibilityParams): void {
  const supported = getSupportedPlanVersionsForRuntime(params.runtime);
  if (!supported.includes(params.planVersion)) {
    throw new PlanVerifierError(
      'UNSUPPORTED_PLAN_VERSION',
      `Unsupported planVersion '${params.planVersion}' for runtime '${params.runtime}'. Supported versions: ${supported.join(', ')}.`
    );
  }
}

export function verifyPlanVersionOrThrow(params: VerifyPlanVersionParams): void {
  if ('runtime' in params) {
    verifyPlanVersionAgainstRuntimeOrThrow(params);
    return;
  }
  verifyPlanVersionOrThrowLegacy(params);
}

function verifyPlanVersionOrThrowLegacy(params: LegacyCompatibilityParams): void {
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
