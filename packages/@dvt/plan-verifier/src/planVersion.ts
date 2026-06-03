/**
 * @ownedConcern Adapter-side plan admission facade for the canonical
 * planVersion/schemaVersion compatibility matrix owned by @dvt/contracts.
 */
import {
  EXECUTION_PLAN_ADMISSION_MATRIX,
  SUPPORTED_EXECUTION_PLAN_ADMISSION_PAIRS,
  isAdmittedExecutionPlanPair,
  type ExecutionPlanAdmissionPair,
} from '@dvt/contracts';

import { PlanVerifierError } from './errors.js';

export { EXECUTION_PLAN_ADMISSION_MATRIX, SUPPORTED_EXECUTION_PLAN_ADMISSION_PAIRS };

const PLAN_ADMISSION_RUNTIMES = ['planner', 'engine', 'adapter-temporal'] as const;

export type PlanRuntime = (typeof PLAN_ADMISSION_RUNTIMES)[number];

export type VerifyPlanAdmissionParams = {
  planVersion: string;
  schemaVersion: string;
  runtime: PlanRuntime;
};

export function getSupportedPlanAdmissionPairsForRuntime(
  runtime: PlanRuntime
): readonly ExecutionPlanAdmissionPair[] {
  assertKnownRuntime(runtime);
  return SUPPORTED_EXECUTION_PLAN_ADMISSION_PAIRS;
}

export function verifyPlanAdmissionAgainstRuntimeOrThrow(params: VerifyPlanAdmissionParams): void {
  assertKnownRuntime(params.runtime);

  if (isAdmittedExecutionPlanPair(params.planVersion, params.schemaVersion)) {
    return;
  }

  const supportedPairs = getSupportedPlanAdmissionPairsForRuntime(params.runtime)
    .map((pair) => `${pair.planVersion}/${pair.schemaVersion}`)
    .join(', ');

  throw new PlanVerifierError(
    'UNSUPPORTED_PLAN_VERSION',
    `Unsupported planVersion/schemaVersion admission pair for runtime '${params.runtime}': planVersion '${params.planVersion}' with schemaVersion '${params.schemaVersion}'. Supported pairs: ${supportedPairs}.`
  );
}

export function verifyPlanAdmissionOrThrow(params: VerifyPlanAdmissionParams): void {
  verifyPlanAdmissionAgainstRuntimeOrThrow(params);
}

function assertKnownRuntime(runtime: PlanRuntime): void {
  if ((PLAN_ADMISSION_RUNTIMES as readonly string[]).includes(runtime)) {
    return;
  }

  throw new PlanVerifierError(
    'UNSUPPORTED_PLAN_VERSION',
    `Unsupported plan admission runtime '${runtime}'. Supported runtimes: ${PLAN_ADMISSION_RUNTIMES.join(', ')}.`
  );
}
