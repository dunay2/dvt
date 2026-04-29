import { PlanVerifierError } from './errors.js';

export const PLAN_RUNTIME_ADMISSION_MATRIX = {
  planner: {
    admittedPlanVersions: ['1.0'],
  },
  engine: {
    admittedPlanVersions: ['1.0'],
  },
  'adapter-temporal': {
    admittedPlanVersions: ['1.0'],
  },
} as const;

export type PlanRuntime = keyof typeof PLAN_RUNTIME_ADMISSION_MATRIX;

export function getSupportedPlanVersionsForRuntime(runtime: PlanRuntime): readonly string[] {
  return PLAN_RUNTIME_ADMISSION_MATRIX[runtime].admittedPlanVersions;
}

export type VerifyPlanVersionParams = {
  planVersion: string;
  runtime: PlanRuntime;
};

/**
 * Plan-version admission gate:
 * - runtime support is governed by PLAN_RUNTIME_ADMISSION_MATRIX.
 * - no semver major/minor fallback is available in active development.
 */
export function verifyPlanVersionAgainstRuntimeOrThrow(params: VerifyPlanVersionParams): void {
  const supported = getSupportedPlanVersionsForRuntime(params.runtime);
  if (!supported.includes(params.planVersion)) {
    throw new PlanVerifierError(
      'UNSUPPORTED_PLAN_VERSION',
      `Unsupported planVersion '${params.planVersion}' for runtime '${params.runtime}'. Supported versions: ${supported.join(', ')}.`
    );
  }
}

export function verifyPlanVersionOrThrow(params: VerifyPlanVersionParams): void {
  verifyPlanVersionAgainstRuntimeOrThrow(params);
}
