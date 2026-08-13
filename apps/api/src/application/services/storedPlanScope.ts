/** Owned concern: construct complete scoped plan references without empty identifiers. */
import type { PlanRef, PlanStoreScope, ScopedPlanRef } from '@dvt/contracts';

type IncompletePlanStoreScope = {
  readonly [Field in keyof PlanStoreScope]: PlanStoreScope[Field] | undefined;
};

type StoredPlanScopeInput = {
  readonly scope: IncompletePlanStoreScope | undefined;
  readonly planRef: PlanRef;
};

export function createScopedPlanRef(input: StoredPlanScopeInput): ScopedPlanRef {
  return {
    tenantId: requireScopeIdentifier(input.scope?.tenantId, 'tenantId'),
    projectId: requireScopeIdentifier(input.scope?.projectId, 'projectId'),
    environmentId: requireScopeIdentifier(input.scope?.environmentId, 'environmentId'),
    planRef: input.planRef,
  };
}

function requireScopeIdentifier(value: string | undefined, field: keyof PlanStoreScope): string {
  if (value === undefined || value.trim().length === 0) {
    throw new Error(`PLAN_STORE_SCOPE_MISSING: ${field}`);
  }

  return value;
}
