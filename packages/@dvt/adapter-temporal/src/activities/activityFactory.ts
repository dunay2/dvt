import {
  asStepId,
  parsePlanRef,
  parseResolvedRunContext,
  RUN_EVENT_PAYLOAD_VERSION,
} from '@dvt/contracts';

import type { EventInput } from '../engine-types.js';

import type {
  ActivityDeps,
  EmitEventInput,
  StepActivityRegistry,
  StepExecutor,
  StepInput,
  StepResult,
} from './activityTypes.js';
import { DbtStepActivity } from './dbtStepActivity.js';
import { GatewayStepActivity } from './gatewayStepActivity.js';
import {
  createDefaultStepActivityRegistry,
  DEFAULT_STEP_EXECUTORS,
  StepActivityDispatcher,
} from './stepActivityDispatcher.js';
import {
  resolveTemporalAttemptFromContext,
  toStepExecutionIdentity,
  validateStepShape,
} from './stepActivityValidation.js';

export function createActivities(
  deps: ActivityDeps,
  stepExecutors: readonly StepExecutor[] = DEFAULT_STEP_EXECUTORS,
  stepActivitiesByKind?: StepActivityRegistry
): {
  executeStep(input: StepInput): Promise<StepResult>;
  emitEvent(input: EmitEventInput): Promise<void>;
} {
  const dispatcher = new StepActivityDispatcher(
    new GatewayStepActivity(),
    resolveStepActivityRegistry(deps, stepActivitiesByKind)
  );

  return {
    async executeStep(input: StepInput): Promise<StepResult> {
      validateStepShape(input.step);
      return dispatcher.execute(
        input.step,
        {
          executionIdentity: toStepExecutionIdentity(input.ctx),
          runContext: input.ctx,
          gatewayContext: input.gatewayContext,
        },
        stepExecutors
      );
    },

    async emitEvent(input: EmitEventInput): Promise<void> {
      const ctx = parseResolvedRunContext(input.ctx);
      const validatedPlanRef = parsePlanRef(input.planRef);
      const { eventType, stepId, payload } = input;
      const validatedStepId = stepId === undefined ? undefined : asStepId(stepId);

      const engineAttemptId =
        typeof deps.getEngineAttemptId === 'function'
          ? deps.getEngineAttemptId()
          : resolveTemporalAttemptFromContext();

      const logicalAttemptId = input.logicalAttemptId ?? ctx.logicalAttemptId;
      const envelopeBase = {
        eventId: deps.idempotency.eventId(),
        eventType,
        payloadVersion: RUN_EVENT_PAYLOAD_VERSION,
        emittedAt: deps.clock.nowIsoUtc(),
        tenantId: ctx.tenantId,
        projectId: ctx.projectId,
        environmentId: ctx.environmentId,
        runId: ctx.runId,
        planId: validatedPlanRef.planId,
        planVersion: validatedPlanRef.planVersion,
        ...(validatedStepId === undefined ? {} : { stepId: validatedStepId }),
        engineAttemptId,
        logicalAttemptId,
        idempotencyKey: deps.idempotency.runEventKey({
          eventType,
          tenantId: ctx.tenantId,
          runId: ctx.runId,
          logicalAttemptId,
          planId: validatedPlanRef.planId,
          planVersion: validatedPlanRef.planVersion,
          ...(validatedStepId === undefined ? {} : { stepId: validatedStepId }),
        }),
      };
      const envelope: EventInput =
        payload === undefined ? envelopeBase : { ...envelopeBase, payload };

      await deps.runStateCommandPort.appendTransitions(ctx.runId, [envelope]);
    },
  };
}

function resolveStepActivityRegistry(
  deps: ActivityDeps,
  overrides?: StepActivityRegistry
): StepActivityRegistry {
  const runtimeRegistry = new Map(createDefaultStepActivityRegistry(deps));
  if (overrides === undefined) {
    return runtimeRegistry;
  }

  for (const [stepKind, activity] of overrides.entries()) {
    if (DbtStepActivity.SUPPORTED_STEP_KINDS.has(stepKind)) {
      continue;
    }
    runtimeRegistry.set(stepKind, activity);
  }

  return runtimeRegistry;
}

export type Activities = ReturnType<typeof createActivities>;
