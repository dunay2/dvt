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
  ScopedPlanRef,
} from '@dvt/contracts';
import {
  collectRequiredCapabilitiesForSteps,
  createDefaultStepTypeRegistry,
  isStepKindSupportedByAdapter,
} from '@dvt/contracts';
import type { EngineRunRef, ExecutionPlan, IProviderAdapter } from '@dvt/engine';
import type { IPlanExecutabilityValidator, PlanExecutabilityValidationInput } from '@dvt/planner';

import {
  STORED_PLAN_MATERIALIZATION_MODE,
  StoredPlanMaterializationError,
  type StoredExecutablePlanResolver,
} from './StoredExecutablePlanResolver.js';

type ExecutabilityValidationError = Extract<ExecutabilityValidationResult, { status: 'ERROR' }>;

type LoadedPlanForValidation = {
  readonly artifactExecutionPolicy: RunExecutionPolicy | undefined;
  readonly plan: ExecutionPlan;
};

type ExecutabilityValidationContext = {
  readonly adapterId: string;
  readonly scopedPlanRef: ScopedPlanRef;
  readonly validatedRef: PlanRefSchemaT;
};

export class StoredPlanExecutabilityValidator implements IPlanExecutabilityValidator {
  public constructor(
    private readonly deps: {
      readonly materializer: Pick<StoredExecutablePlanResolver, 'materialize'>;
      readonly adapters: ReadonlyMap<EngineRunRef['provider'], IProviderAdapter>;
      readonly stepTypeRegistry?: IStepTypeRegistry;
    }
  ) {}

  public async validatePlan(
    input: PlanExecutabilityValidationInput
  ): Promise<ExecutabilityValidationResult> {
    const validationContext: ExecutabilityValidationContext = {
      adapterId: input.adapterId,
      scopedPlanRef: input,
      validatedRef: input.planRef,
    };
    const adapter = resolveAdapter(this.deps.adapters, validationContext);
    if ('status' in adapter) {
      return adapter;
    }
    const stepTypeRegistry = this.deps.stepTypeRegistry ?? createDefaultStepTypeRegistry();
    const loadedPlan = await loadPlanForValidation(this.deps.materializer, validationContext);
    if ('status' in loadedPlan) {
      return loadedPlan;
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
  materializer: Pick<StoredExecutablePlanResolver, 'materialize'>,
  validationContext: ExecutabilityValidationContext
): Promise<LoadedPlanForValidation | ExecutabilityValidationError> {
  try {
    const materialized = await materializer.materialize(
      validationContext.scopedPlanRef,
      STORED_PLAN_MATERIALIZATION_MODE.validation
    );
    return {
      artifactExecutionPolicy: materialized.executionPolicy,
      plan: materialized.plan,
    };
  } catch (error) {
    return buildValidationError(
      validationContext,
      'REJECTED',
      toErrorMessage(error),
      error instanceof StoredPlanMaterializationError ? error.code : 'plan_materialization'
    );
  }
}

function findUnsupportedStepError(
  plan: ExecutionPlan,
  validationContext: ExecutabilityValidationContext,
  stepTypeRegistry: IStepTypeRegistry
): ExecutabilityValidationError | undefined {
  const unsupportedStep = plan.steps.find(
    (step) =>
      isStepKindSupportedByAdapter(stepTypeRegistry, step.kind, validationContext.adapterId) ===
      false
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
