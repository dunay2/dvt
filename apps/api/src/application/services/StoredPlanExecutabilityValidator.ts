import type {
  ExecutabilityValidationResult,
  IPlanExecutabilityValidator,
  PlanRefSchemaT,
} from '@dvt/contracts';
import { parsePlanRef } from '@dvt/contracts';
import type { EngineRunRef, ExecutionPlan, IProviderAdapter } from '@dvt/engine';

import type { IStoredPlanValidationReader } from '../ports/storedPlan.js';

import { parseStoredExecutablePlan } from './storedExecutablePlan.js';

export class StoredPlanExecutabilityValidator implements IPlanExecutabilityValidator {
  public constructor(
    private readonly deps: {
      readonly fetcher: IStoredPlanValidationReader;
      readonly adapters: ReadonlyMap<EngineRunRef['provider'], IProviderAdapter>;
    }
  ) {}

  public async validatePlan(
    planRef: PlanRefSchemaT,
    adapterId: string
  ): Promise<ExecutabilityValidationResult> {
    const validatedRef = parsePlanRef(planRef);
    const adapter = this.deps.adapters.get(adapterId as EngineRunRef['provider']);
    if (!adapter) {
      return {
        status: 'ERROR',
        planId: validatedRef.planId,
        adapterId,
        code: 'REJECTED',
        degradable: false,
        reason: `Adapter is not configured: ${adapterId}`,
        cause: 'adapter',
      };
    }

    let plan: ExecutionPlan;
    try {
      const bytes = await this.deps.fetcher.fetchForValidation(validatedRef);
      plan = parseStoredExecutablePlan(bytes);
    } catch (error) {
      return {
        status: 'ERROR',
        planId: validatedRef.planId,
        adapterId,
        code: 'REJECTED',
        degradable: false,
        reason: toErrorMessage(error),
        cause: 'plan_fetch',
      };
    }

    const metadataMismatch = validatePlanRefAlignment(plan, validatedRef);
    if (metadataMismatch) {
      return {
        status: 'ERROR',
        planId: validatedRef.planId,
        adapterId,
        code: 'REJECTED',
        degradable: false,
        reason: metadataMismatch,
        cause: 'plan_ref',
      };
    }

    const requiredCapabilities =
      plan.metadata.requiresCapabilities ?? validatedRef.requiresCapabilities ?? [];
    const declaredCapabilities = adapter.capabilities?.();
    if (declaredCapabilities !== undefined) {
      const supported = new Set(declaredCapabilities);
      const missing = requiredCapabilities.find((capability) => !supported.has(capability));
      if (missing) {
        return {
          status: 'ERROR',
          planId: validatedRef.planId,
          adapterId,
          code: 'MISSING_CAPABILITY',
          degradable: false,
          reason: `Missing adapter capability: ${missing}`,
          cause: missing,
        };
      }
    }

    return {
      status: 'OK',
      planId: validatedRef.planId,
      adapterId,
    };
  }
}

function validatePlanRefAlignment(plan: ExecutionPlan, planRef: PlanRefSchemaT): string | null {
  if (plan.metadata.planId !== planRef.planId) {
    return 'PLAN_REF_MISMATCH: planId';
  }
  if (plan.metadata.planVersion !== planRef.planVersion) {
    return 'PLAN_REF_MISMATCH: planVersion';
  }
  if (plan.metadata.schemaVersion !== planRef.schemaVersion) {
    return 'PLAN_REF_MISMATCH: schemaVersion';
  }
  return null;
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
