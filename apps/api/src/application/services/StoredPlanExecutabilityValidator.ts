import type {
  ExecutabilityValidationResult,
  IPlanExecutabilityValidator,
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
    const adapter = resolveAdapter(this.deps.adapters, validatedRef, adapterId);
    if ('status' in adapter) {
      return adapter;
    }
    const stepTypeRegistry = this.deps.stepTypeRegistry ?? createDefaultStepTypeRegistry();
    const loadedPlan = await loadPlanForValidation(
      this.deps.fetcher,
      validatedRef,
      adapterId,
      stepTypeRegistry
    );
    if ('status' in loadedPlan) {
      return loadedPlan;
    }
    const planAlignmentError = validatePlanAlignment(loadedPlan.plan, validatedRef, adapterId);
    if (planAlignmentError !== undefined) {
      return planAlignmentError;
    }
    const unsupportedStepError = findUnsupportedStepError(
      loadedPlan.plan,
      validatedRef,
      adapterId,
      stepTypeRegistry
    );
    if (unsupportedStepError !== undefined) {
      return unsupportedStepError;
    }
    const capabilityError = validateRequiredCapabilities(
      loadedPlan,
      adapter,
      validatedRef,
      adapterId,
      stepTypeRegistry
    );
    if (capabilityError !== undefined) {
      return capabilityError;
    }

    return buildOkResult(validatedRef, adapterId);
  }
}

function resolveAdapter(
  adapters: ReadonlyMap<EngineRunRef['provider'], IProviderAdapter>,
  validatedRef: PlanRefSchemaT,
  adapterId: string
): IProviderAdapter | ExecutabilityValidationError {
  const adapter = adapters.get(adapterId as EngineRunRef['provider']);
  if (adapter !== undefined) {
    return adapter;
  }

  return buildValidationError(
    validatedRef,
    adapterId,
    'REJECTED',
    `Adapter is not configured: ${adapterId}`,
    'adapter'
  );
}

async function loadPlanForValidation(
  fetcher: IStoredPlanValidationReader,
  validatedRef: PlanRefSchemaT,
  adapterId: string,
  stepTypeRegistry: IStepTypeRegistry
): Promise<LoadedPlanForValidation | ExecutabilityValidationError> {
  try {
    const artifact = await fetcher.fetchForValidation(validatedRef);
    return {
      artifactExecutionPolicy: artifact.executionPolicy,
      plan: parseStoredExecutablePlan(artifact.bytes, {
        stepTypeRegistry,
      }),
    };
  } catch (error) {
    return buildValidationError(
      validatedRef,
      adapterId,
      'REJECTED',
      toErrorMessage(error),
      'plan_fetch'
    );
  }
}

function validatePlanAlignment(
  plan: ExecutionPlan,
  validatedRef: PlanRefSchemaT,
  adapterId: string
): ExecutabilityValidationError | undefined {
  const metadataMismatch = validatePlanRefAlignment(plan, validatedRef);
  if (metadataMismatch === null) {
    return undefined;
  }

  return buildValidationError(validatedRef, adapterId, 'REJECTED', metadataMismatch, 'plan_ref');
}

function findUnsupportedStepError(
  plan: ExecutionPlan,
  validatedRef: PlanRefSchemaT,
  adapterId: string,
  stepTypeRegistry: IStepTypeRegistry
): ExecutabilityValidationError | undefined {
  const unsupportedStep = plan.steps.find(
    (step) => isStepKindSupportedByAdapter(stepTypeRegistry, step.kind, adapterId) === false
  );
  if (unsupportedStep === undefined) {
    return undefined;
  }

  return buildValidationError(
    validatedRef,
    adapterId,
    'INVALID_STEP_KIND',
    `Step kind ${unsupportedStep.kind} is not executable on adapter ${adapterId}`,
    unsupportedStep.kind
  );
}

function validateRequiredCapabilities(
  loadedPlan: LoadedPlanForValidation,
  adapter: IProviderAdapter,
  validatedRef: PlanRefSchemaT,
  adapterId: string,
  stepTypeRegistry: IStepTypeRegistry
): ExecutabilityValidationError | undefined {
  const requiredCapabilities = dedupeCapabilities([
    ...collectRequiredCapabilitiesForSteps(stepTypeRegistry, loadedPlan.plan.steps),
    ...(loadedPlan.artifactExecutionPolicy?.requiresCapabilities ?? []),
  ]);
  const declaredCapabilities = adapter.capabilities?.();
  if (requiredCapabilities.length > 0 && declaredCapabilities === undefined) {
    return buildValidationError(
      validatedRef,
      adapterId,
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
        validatedRef,
        adapterId,
        'MISSING_CAPABILITY',
        `Missing adapter capability: ${missing}`,
        missing
      );
    }
  }

  return undefined;
}

function buildOkResult(
  validatedRef: PlanRefSchemaT,
  adapterId: string
): ExecutabilityValidationResult {
  return {
    status: 'OK',
    planId: validatedRef.planId,
    adapterId,
  };
}

function buildValidationError(
  validatedRef: PlanRefSchemaT,
  adapterId: string,
  code: ExecutabilityValidationError['code'],
  reason: string,
  cause: string
): ExecutabilityValidationError {
  return {
    status: 'ERROR',
    planId: validatedRef.planId,
    adapterId,
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
