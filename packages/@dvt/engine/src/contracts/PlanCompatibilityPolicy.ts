/**
 * Owned concern: fail closed at engine ingress when a PlanRef names a
 * planVersion/schemaVersion pair that the runtime contract matrix does not support.
 */
import {
  isSupportedExecutionPlanCompatibility,
  SUPPORTED_EXECUTION_PLAN_COMPATIBILITY_PAIRS,
} from '@dvt/contracts';

import { InvalidSchemaVersionError } from './errors.js';

export function assertSupportedPlanCompatibility(input: {
  planVersion: string;
  schemaVersion: string;
}): void {
  const planVersion = input.planVersion.trim();
  const schemaVersion = input.schemaVersion.trim();

  if (!planVersion || !schemaVersion) throw new InvalidSchemaVersionError(input.schemaVersion);

  if (!isSupportedExecutionPlanCompatibility(planVersion, schemaVersion)) {
    throw new InvalidSchemaVersionError(input.schemaVersion);
  }
}

export function supportedPlanCompatibilityPairs(): Array<{
  planVersion: string;
  schemaVersion: string;
}> {
  return SUPPORTED_EXECUTION_PLAN_COMPATIBILITY_PAIRS.map((pair) => ({
    planVersion: pair.planVersion,
    schemaVersion: pair.schemaVersion,
  }));
}
