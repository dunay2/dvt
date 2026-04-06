import type {
  ExecutabilityValidationResult,
  IPlanExecutabilityValidator,
  PlanRefSchemaT,
} from '@dvt/contracts';
import {
  collectRequiredCapabilitiesForSteps,
  createDefaultStepTypeRegistry,
  parsePlanRef,
} from '@dvt/contracts';
import { isStepKindSupportedByAdapter } from '@dvt/contracts';
import type { IStepTypeRegistry } from '@dvt/contracts';
import type { EngineRunRef, ExecutionPlan, IProviderAdapter } from '@dvt/engine';

import type { IStoredPlanValidationReader } from '../ports/storedPlan.js';

import { parseStoredExecutablePlan } from './storedExecutablePlan.js';

export class StoredPlanExecutabilityValidator implements IPlanExecutabilityValidator {
  public constructor(
    private readonly deps: {
      readonly fetcher: IStoredPlanValidationReader;
      readonly adapters: ReadonlyMap<EngineRunRef['provider'], IProviderAdapter>;
      readonly stepTypeRegistry?: IStepTypeRegistry;
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

    const stepTypeRegistry = this.deps.stepTypeRegistry ?? createDefaultStepTypeRegistry();

    let plan: ExecutionPlan;
    try {
      const bytes = await this.deps.fetcher.fetchForValidation(validatedRef);
      plan = parseStoredExecutablePlan(bytes, {
        stepTypeRegistry,
      });
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

    const unsupportedStep = plan.steps.find(
      (step) => !isStepKindSupportedByAdapter(stepTypeRegistry, step.kind, adapterId)
    );
    if (unsupportedStep !== undefined) {
      return {
        status: 'ERROR',
        planId: validatedRef.planId,
        adapterId,
        code: 'INVALID_STEP_KIND',
        degradable: false,
        reason: `Step kind ${unsupportedStep.kind} is not executable on adapter ${adapterId}`,
        cause: unsupportedStep.kind,
      };
    }

    const requiredCapabilities = dedupeCapabilities([
      ...collectRequiredCapabilitiesForSteps(stepTypeRegistry, plan.steps),
      ...(plan.metadata.requiresCapabilities ?? []),
      ...(validatedRef.requiresCapabilities ?? []),
    ]);
    const declaredCapabilities = adapter.capabilities?.();
    if (requiredCapabilities.length > 0 && declaredCapabilities === undefined) {
      return {
        status: 'ERROR',
        planId: validatedRef.planId,
        adapterId,
        code: 'REJECTED',
        degradable: false,
        reason: 'Adapter does not declare capabilities required for executability validation',
        cause: 'capabilities',
      };
    }
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
  if (
    planRef.pluginCompatibilityFingerprint !== undefined &&
    plan.metadata.pluginCompatibilityFingerprint !== planRef.pluginCompatibilityFingerprint
  ) {
    return 'PLAN_REF_MISMATCH: pluginCompatibilityFingerprint';
  }
  return null;
}

function dedupeCapabilities(values: readonly string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'Unknown error';
}
