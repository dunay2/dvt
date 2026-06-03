/**
 * @ownedConcern Dispatch workflow step work to core gateway or composed plugin activities.
 */
import { ActivityErrorCode, createPermanentStepFailure } from './activityFailures.js';
import type {
  StepActivity,
  StepActivityRegistry,
  StepDefinition,
  StepExecutionContext,
  StepExecutor,
  StepResult,
} from './activityTypes.js';
import { UnsupportedStepKindError } from './activityTypes.js';
import { GatewayStepActivity } from './gatewayStepActivity.js';

export function createDefaultStepActivityRegistry(): StepActivityRegistry {
  // Core registry starts empty; plugin activities are composed by worker profiles.
  return new Map<string, StepActivity>();
}

export const DEFAULT_STEP_ACTIVITY_REGISTRY: StepActivityRegistry =
  createDefaultStepActivityRegistry();

export class StepActivityDispatcher {
  private readonly stepActivitiesByKind: StepActivityRegistry;

  constructor(
    private readonly gatewayActivity: StepActivity = new GatewayStepActivity(),
    stepActivitiesByKind: StepActivityRegistry = createDefaultStepActivityRegistry()
  ) {
    this.stepActivitiesByKind = new Map(stepActivitiesByKind);
  }

  async execute(
    step: StepDefinition,
    context: StepExecutionContext,
    overrideExecutors: readonly StepExecutor[]
  ): Promise<StepResult> {
    const overrideExecutor = overrideExecutors.find((executor) => executor.canExecute(step));
    if (overrideExecutor) {
      return overrideExecutor.execute(step, context);
    }

    if (step.type === 'gateway') {
      return this.gatewayActivity.execute(step, context);
    }

    if (typeof step.kind !== 'string' || step.kind.length === 0) {
      throw createPermanentStepFailure(
        `${ActivityErrorCode.INVALID_STEP_SCHEMA}: step_kind_required:${step.stepId}`
      );
    }

    const activity = this.stepActivitiesByKind.get(step.kind);
    if (activity) {
      return activity.execute(step, context);
    }

    throw createPermanentStepFailure(new UnsupportedStepKindError(step.kind, step.stepId).message);
  }
}

/**
 * Optional override executors intended for tests.
 * Runtime dispatch is owned by StepActivityDispatcher.
 */
export const DEFAULT_STEP_EXECUTORS: readonly StepExecutor[] = [];
