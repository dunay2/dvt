/**
 * @ownedConcern Enforce start-run schema-version admission semantics before
 * runtime bootstrap or provider dispatch.
 */
import { assertAdmittedPlanPair } from './PlanAdmissionPolicy.js';

export interface PlanSchemaVersionAdmissionInput {
  readonly planVersion: string;
  readonly schemaVersion: string;
}

export function assertSupportedPlanSchemaVersion(input: PlanSchemaVersionAdmissionInput): void {
  assertAdmittedPlanPair(input);
}
