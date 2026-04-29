/**
 * Owned concern: fail closed at engine ingress when a PlanRef names a
 * planVersion/schemaVersion pair that the runtime admission matrix does not admit.
 */
import { isAdmittedExecutionPlanPair } from '@dvt/contracts';

import { InvalidSchemaVersionError } from './errors.js';

export function assertAdmittedPlanPair(input: {
  planVersion: string;
  schemaVersion: string;
}): void {
  const planVersion = input.planVersion.trim();
  const schemaVersion = input.schemaVersion.trim();

  if (!planVersion || !schemaVersion) throw new InvalidSchemaVersionError(input.schemaVersion);

  if (!isAdmittedExecutionPlanPair(planVersion, schemaVersion)) {
    throw new InvalidSchemaVersionError(input.schemaVersion);
  }
}
