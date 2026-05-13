/**
 * @ownedConcern Enforce start-run schema-version admission semantics before
 * runtime bootstrap or provider dispatch.
 * @baseline ADR-0017: ExecutionPlan Schema Versioning
 * @baseline ADR-0036: ExecutionPlan PlanVersion Registry And Runtime Compatibility Matrix
 * @decision Expose schema-version admission as an engine semantic policy while
 * delegating compatibility truth to the shared admission matrix.
 * @version 1.0.0
 */
import { assertAdmittedPlanPair } from './PlanAdmissionPolicy.js';

export interface PlanSchemaVersionAdmissionInput {
  readonly planVersion: string;
  readonly schemaVersion: string;
}

export function assertSupportedPlanSchemaVersion(input: PlanSchemaVersionAdmissionInput): void {
  assertAdmittedPlanPair(input);
}
