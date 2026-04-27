/**
 * Owned concern: fail-closed executability validation for stored plans.
 * This service checks adapter presence, stored-plan integrity, step-kind
 * support, and capability requirements before planner-backed runtime dispatch.
 */
import type {
  ExecutabilityValidationResult,
  IStepTypeRegistry,
  PlanRefSchemaT,
  RunExecutionPolicy,
} from '@dvt/contracts';
import {
  collectRequiredCapabilitiesForSteps,
  createDefaultStepTypeRegistry,
  isStepKindSupportedByAdapter,
  parsePlanRef,
} from '@dvt/contracts';
import type { EngineRunRef, ExecutionPlan, IProviderAdapter } from '@dvt/engine';
import type { IPlanExecutabilityValidator } from '@dvt/planner';

import type { IStoredPlanValidationReader } from '../ports/storedPlan.js';

import { parseStoredExecutablePlan } from './storedExecutablePlan.js';

type ExecutabilityValidationError = Extract<
  ExecutabilityValidationResult,
  { status: 'ERROR' }
>;

type LoadedPlanForValidation = {
  readonly artifactExecutionPolicy: RunExecutionPolicy | undefined;
  readonly plan: ExecutionPlan;
};

type ExecutabilityValidationContext = {
  readonly adapterId: string;
  readonly validatedRef: PlanRefSchemaT;
};

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
    const validationContext: ExecutabilityValidationContext = {
      adapterId,
      validatedRef: parsePlanRef(planRef),
    };
    const adapter = resolveAdapter(this.deps.adapters, validationContext);
    if ('status' in adapter) {
      return adapter;
    }
    const stepTypeRegistry = this.deps.stepTypeRegistry ?? createDefaultStepTypeRegistry();
    const loadedPlan = await loadPlanForValidation(
      this.deps.fetcher,
      validationContext,
      stepTypeRegistry
    );
    if ('status' in loadedPlan) {
      return loadedPlan;
    }
    const planAlignmentError = validatePlanAlignment(loadedPlan.plan, validationContext);
    if (planAlignmentError !== undefined) {
      return planAlignmentError;
    }
    const unsupportedStepError = findUnsupportedStepError(
      loadedPlan.plan,
      validationContext,
      stepTypeRegistry
    );
    if (unsupportedStepError !== undefined) {
      return unsupportedStepError;
    }
    const capabilityError = validateRequiredCapabilities(
      loadedPlan,
      adapter,
      validationContext,
      stepTypeRegistry
    );
    if (capabilityError !== undefined) {
      return capabilityError;
    }

    return buildOkResult(validationContext);
  }
}

function resolveAdapter(
  adapters: ReadonlyMap<EngineRunRef['provider'], IProviderAdapter>,
  validationContext: ExecutabilityValidationContext
): IProviderAdapter | ExecutabilityValidationError {
  const adapter = adapters.get(validationContext.adapterId as EngineRunRef['provider']);
  if (adapter !== undefined) {
    return adapter;
  }

  return buildValidationError(
    validationContext,
    'REJECTED',
    `Adapter is not configured: ${validationContext.adapterId}`,
    'adapter'
  );
}

async function loadPlanForValidation(
  fetcher: IStoredPlanValidationReader,
  validationContext: ExecutabilityValidationContext,
  stepTypeRegistry: IStepTypeRegistry
): Promise<LoadedPlanForValidation | ExecutabilityValidationError> {
  try {
    const artifact = await fetcher.fetchForValidation(validationContext.validatedRef);
    return {
      artifactExecutionPolicy: artifact.executionPolicy,
      plan: parseStoredExecutablePlan(artifact.bytes, {
        stepTypeRegistry,
      }),
    };
  } catch (error) {
    return buildValidationError(
      validationContext,
      'REJECTED',
      toErrorMessage(error),
      'plan_fetch'
    );
  }
}

function validatePlanAlignment(
  plan: ExecutionPlan,
  validationContext: ExecutabilityValidationContext
): ExecutabilityValidationError | undefined {
  const metadataMismatch = validatePlanRefAlignment(plan, validationContext.validatedRef);
  if (metadataMismatch === null) {
    return undefined;
  }

  return buildValidationError(validationContext, 'REJECTED', metadataMismatch, 'plan_ref');
}

function findUnsupportedStepError(
  plan: ExecutionPlan,
  validationContext: ExecutabilityValidationContext,
  stepTypeRegistry: IStepTypeRegistry
): ExecutabilityValidationError | undefined {
  const unsupportedStep = plan.steps.find(
    (step) =>
      isStepKindSupportedByAdapter(
        stepTypeRegistry,
        step.kind,
        validationContext.adapterId
      ) === false
  );
  if (unsupportedStep === undefined) {
    return undefined;
  }

  return buildValidationError(
    validationContext,
    'INVALID_STEP_KIND',
    `Step kind ${unsupportedStep.kind} is not executable on adapter ${validationContext.adapterId}`,
    unsupportedStep.kind
  );
}

function validateRequiredCapabilities(
  loadedPlan: LoadedPlanForValidation,
  adapter: IProviderAdapter,
  validationContext: ExecutabilityValidationContext,
  stepTypeRegistry: IStepTypeRegistry
): ExecutabilityValidationError | undefined {
  const requiredCapabilities = dedupeCapabilities([
    ...collectRequiredCapabilitiesForSteps(stepTypeRegistry, loadedPlan.plan.steps),
    ...(loadedPlan.artifactExecutionPolicy?.requiresCapabilities ?? []),
  ]);
  const declaredCapabilities = adapter.capabilities?.();
  if (requiredCapabilities.length > 0 && declaredCapabilities === undefined) {
    return buildValidationError(
      validationContext,
      'REJECTED',
      'Adapter does not declare capabilities required for executability validation',
      'capabilities'
    );
  }
  if (declaredCapabilities !== undefined) {
    const supported = new Set(declaredCapabilities);
    const missing = requiredCapabilities.find((capability) => supported.has(capability) === false);
    if (missing !== undefined) {
      return buildValidationError(
        validationContext,
        'MISSING_CAPABILITY',
        `Missing adapter capability: ${missing}`,
        missing
      );
    }
  }

  return undefined;
}

function buildOkResult(
  validationContext: ExecutabilityValidationContext
): ExecutabilityValidationResult {
  return {
    status: 'OK',
    planId: validationContext.validatedRef.planId,
    adapterId: validationContext.adapterId,
  };
}

function buildValidationError(
  validationContext: ExecutabilityValidationContext,
  code: ExecutabilityValidationError['code'],
  reason: string,
  cause: string
): ExecutabilityValidationError {
  return {
    status: 'ERROR',
    planId: validationContext.validatedRef.planId,
    adapterId: validationContext.adapterId,
    code,
    degradable: false,
    reason,
    cause,
  };
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
