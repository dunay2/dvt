/**
 * @ownedConcern Compose Temporal core activities with optional worker-provided step registries.
 */
import {
  asStepId,
  parsePlanRef,
  parseResolvedRunContext,
  RUN_EVENT_PAYLOAD_VERSION,
} from '@dvt/contracts';
import { heartbeat as temporalActivityHeartbeat } from '@temporalio/activity';

import type { EventInput } from '../engine-types.js';
import type { ResolvedExecutionSegment } from '../workflows/executionSegmentResolver.js';
import { resolveExecutionSegmentFromPlan } from '../workflows/executionSegmentResolver.js';

import type {
  ActivityDeps,
  EmitEventInput,
  StepActivityRegistry,
  StepExecutor,
  StepInput,
  StepResult,
} from './activityTypes.js';
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

const STEP_ACTIVITY_HEARTBEAT_INTERVAL_MS = 1_000;

export type ActivityHeartbeat = () => void;

export function createActivities(
  deps: ActivityDeps,
  stepExecutors: readonly StepExecutor[] = DEFAULT_STEP_EXECUTORS,
  stepActivitiesByKind?: StepActivityRegistry,
  activityHeartbeat: ActivityHeartbeat = temporalActivityHeartbeat
): {
  executeStep(input: StepInput): Promise<StepResult>;
  emitEvent(input: EmitEventInput): Promise<void>;
  resolveExecutionSegment(input: {
    planRef: EmitEventInput['planRef'];
    ctx: EmitEventInput['ctx'];
    layerIndex: number;
  }): Promise<ResolvedExecutionSegment>;
} {
  assertSegmentResolverConfigured(deps);

  const dispatcher = new StepActivityDispatcher(
    new GatewayStepActivity(),
    resolveStepActivityRegistry(stepActivitiesByKind)
  );

  return {
    async executeStep(input: StepInput): Promise<StepResult> {
      validateStepShape(input.step);
      return executeWithHeartbeat(
        () =>
          dispatcher.execute(
            input.step,
            {
              executionIdentity: toStepExecutionIdentity(input.ctx),
              runContext: input.ctx,
              gatewayContext: input.gatewayContext,
            },
            stepExecutors
          ),
        activityHeartbeat
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

    async resolveExecutionSegment(input): Promise<ResolvedExecutionSegment> {
      const validatedPlanRef = parsePlanRef(input.planRef);
      const ctx = parseResolvedRunContext(input.ctx);
      const { plan } = await deps.planArtifactReader.fetchForEngineDispatch({
        planRef: validatedPlanRef,
        ctx,
      });
      return resolveExecutionSegmentFromPlan(plan, input.layerIndex);
    },
  };
}

async function executeWithHeartbeat<T>(
  operation: () => Promise<T>,
  activityHeartbeat: ActivityHeartbeat
): Promise<T> {
  activityHeartbeat();
  const heartbeatTimer = setInterval(activityHeartbeat, STEP_ACTIVITY_HEARTBEAT_INTERVAL_MS);
  try {
    return await operation();
  } finally {
    clearInterval(heartbeatTimer);
  }
}

function assertSegmentResolverConfigured(deps: ActivityDeps): void {
  if (deps.planArtifactReader === undefined) {
    throw new Error('PLAN_SEGMENT_RESOLVER_NOT_CONFIGURED');
  }
}

function resolveStepActivityRegistry(overrides?: StepActivityRegistry): StepActivityRegistry {
  const runtimeRegistry = new Map(createDefaultStepActivityRegistry());
  if (overrides === undefined) {
    return runtimeRegistry;
  }

  for (const [stepKind, activity] of overrides.entries()) {
    runtimeRegistry.set(stepKind, activity);
  }

  return runtimeRegistry;
}

export type Activities = ReturnType<typeof createActivities>;
