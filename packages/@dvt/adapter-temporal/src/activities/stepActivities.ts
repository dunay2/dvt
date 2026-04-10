/**
 * @file packages/@dvt/adapter-temporal/src/activities/stepActivities.ts
 * @baseline ADR-0001: Temporal Integration Test Policy (Build Preconditions + Lifecycle Discipline)
 * @baseline ADR-0004: Event Sourcing Strategy (Extended)
 * @decision Section 5 — All workflow side effects are mediated through deterministic activity boundaries
 * @decision Section 2.1 — Emitted events preserve idempotency and append-only state-store semantics
 * @consequence Activity execution keeps lifecycle/event persistence deterministic and replay-compatible
 * @version 1.1.0
 * @date 2026-03-07
 */
import {
  asStepId,
  parsePlanRef,
  parseResolvedRunContext,
  RUN_EVENT_PAYLOAD_VERSION,
} from '@dvt/contracts';
import type { MaterializationEvidence, PlanRef, ResolvedRunContext } from '@dvt/contracts';
import { evaluateDslV1, parseDslV1 } from '@dvt/dsl';
import { ApplicationFailure, Context } from '@temporalio/activity';

import type {
  EventInput,
  EventType,
  ExecutionPlan,
  IClock,
  IIdempotencyKeyBuilder,
  RunStateCommandPort,
} from '../engine-types.js';

// ---------------------------------------------------------------------------
// Error codes (3.7 — replace magic strings with named constants)
// ---------------------------------------------------------------------------

const ActivityErrorCode = {
  INVALID_STEP_SCHEMA: 'INVALID_STEP_SCHEMA',
  INVALID_GATEWAY_DSL: 'INVALID_GATEWAY_DSL',
  UNSUPPORTED_STEP_KIND: 'UNSUPPORTED_STEP_KIND',
  TRANSIENT_STEP_ERROR: 'TRANSIENT_STEP_ERROR',
  PERMANENT_STEP_ERROR: 'PERMANENT_STEP_ERROR',
} as const;

const PERMANENT_STEP_ERROR_TYPE = 'PermanentStepError';

// ---------------------------------------------------------------------------
// Role-based dependency interfaces (3.3 — ISP: each activity declares its needs)
// ---------------------------------------------------------------------------

export interface EventEmitterDeps {
  runStateCommandPort: RunStateCommandPort;
  clock: IClock;
  idempotency: IIdempotencyKeyBuilder;
  /** Optional override for tests; runtime uses Temporal activity context. */
  getEngineAttemptId?: () => number;
}

export interface RunBootstrapperDeps {
  runStateCommandPort: RunStateCommandPort;
}

/** Full dependency container (union of role interfaces). Injected at Worker creation time. */
export interface ActivityDeps extends EventEmitterDeps, RunBootstrapperDeps {}

// ---------------------------------------------------------------------------
// Activity input / output types
// ---------------------------------------------------------------------------

export interface StepInput {
  step: ExecutionPlan['steps'][number];
  ctx: ResolvedRunContext;
  /**
   * Deterministic context assembled by workflow from previously completed steps.
   * Used only by gateway steps.
   */
  gatewayContext?: Record<string, unknown>;
}

export interface StepResult {
  stepId: string;
  status: 'COMPLETED' | 'FAILED';
  gatewayDecision?: boolean;
  resultEvidence?: MaterializationEvidence;
  failureReason?: string;
  retriable?: boolean;
  error?: string;
}

export interface EmitEventInput {
  ctx: ResolvedRunContext;
  planRef: PlanRef;
  eventType: EventType;
  stepId?: string;
  payload?: Record<string, unknown>;
  /** Optional planner-driven logical attempt id; defaults to 1. */
  logicalAttemptId?: number;
}

// ---------------------------------------------------------------------------
// Step executor registry (3.4 — OCP: new step types added without modifying executeStep)
// ---------------------------------------------------------------------------

export interface StepExecutionContext {
  gatewayContext?: Record<string, unknown>;
}

export interface StepExecutor {
  canExecute(step: ExecutionPlan['steps'][number]): boolean;
  execute(step: ExecutionPlan['steps'][number], context: StepExecutionContext): Promise<StepResult>;
}

export interface StepActivity {
  execute(step: ExecutionPlan['steps'][number], context: StepExecutionContext): Promise<StepResult>;
}

export type StepActivityRegistry = ReadonlyMap<string, StepActivity>;

export class UnsupportedStepKindError extends Error {
  constructor(
    readonly stepKind: string,
    readonly stepId: string
  ) {
    super(`${ActivityErrorCode.UNSUPPORTED_STEP_KIND}:${stepKind}:${stepId}`);
    this.name = 'UnsupportedStepKindError';
  }
}

class GatewayStepActivity implements StepActivity {
  async execute(
    step: ExecutionPlan['steps'][number],
    context: StepExecutionContext
  ): Promise<StepResult> {
    const gateway = parseGatewayConfigOrThrow(step);
    try {
      const parsed = parseDslV1(gateway.expression);
      const passed = evaluateDslV1(parsed, context.gatewayContext ?? {});
      return { stepId: step.stepId, status: 'COMPLETED', gatewayDecision: passed };
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw ApplicationFailure.create({
        type: PERMANENT_STEP_ERROR_TYPE,
        message: `${ActivityErrorCode.INVALID_GATEWAY_DSL}:${step.stepId}:${reason}`,
        nonRetryable: true,
      });
    }
  }
}

export class DbtStepActivity implements StepActivity {
  static readonly SUPPORTED_STEP_KINDS = new Set(['DBT_MODEL', 'DBT_TEST', 'DBT_SNAPSHOT']);

  async execute(
    step: ExecutionPlan['steps'][number],
    _context: StepExecutionContext
  ): Promise<StepResult> {
    return { stepId: step.stepId, status: 'COMPLETED' };
  }
}

const DEFAULT_DBT_STEP_ACTIVITY = new DbtStepActivity();

const DEFAULT_STEP_ACTIVITY_ENTRIES = Object.freeze(
  Array.from(
    DbtStepActivity.SUPPORTED_STEP_KINDS,
    (stepKind) => [stepKind, DEFAULT_DBT_STEP_ACTIVITY] as const
  )
);

export function createDefaultStepActivityRegistry(): StepActivityRegistry {
  return new Map(DEFAULT_STEP_ACTIVITY_ENTRIES);
}

export const DEFAULT_STEP_ACTIVITY_REGISTRY: StepActivityRegistry =
  createDefaultStepActivityRegistry();

export class StepActivityDispatcher {
  private readonly stepActivitiesByKind: StepActivityRegistry;

  constructor(
    private readonly gatewayActivity: StepActivity = new GatewayStepActivity(),
    stepActivitiesByKind: StepActivityRegistry = createDefaultStepActivityRegistry()
  ) {
    // Snapshot the registry on construction so later mutations cannot change
    // dispatch behavior for already-created workers/activities.
    this.stepActivitiesByKind = new Map(stepActivitiesByKind);
  }

  async execute(
    step: ExecutionPlan['steps'][number],
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
      throw ApplicationFailure.create({
        type: PERMANENT_STEP_ERROR_TYPE,
        message: `${ActivityErrorCode.INVALID_STEP_SCHEMA}: step_kind_required:${step.stepId}`,
        nonRetryable: true,
      });
    }

    const activity = this.stepActivitiesByKind.get(step.kind);
    if (activity) {
      return activity.execute(step, context);
    }

    throw ApplicationFailure.create({
      type: PERMANENT_STEP_ERROR_TYPE,
      message: new UnsupportedStepKindError(step.kind, step.stepId).message,
      nonRetryable: true,
    });
  }
}

/**
 * Optional override executors intended for tests.
 * Runtime dispatch is owned by StepActivityDispatcher.
 */
export const DEFAULT_STEP_EXECUTORS: readonly StepExecutor[] = [];

// ---------------------------------------------------------------------------
// Activity factory — creates closures over shared deps
// ---------------------------------------------------------------------------

export function createActivities(
  deps: ActivityDeps,
  stepExecutors: readonly StepExecutor[] = DEFAULT_STEP_EXECUTORS,
  stepActivitiesByKind: StepActivityRegistry = createDefaultStepActivityRegistry()
): {
  executeStep(input: StepInput): Promise<StepResult>;
  emitEvent(input: EmitEventInput): Promise<void>;
} {
  const dispatcher = new StepActivityDispatcher(new GatewayStepActivity(), stepActivitiesByKind);
  return {
    /**
     * Execute a single step.
     * Thin dispatcher: validates shape, applies test hook, then delegates to executor registry.
     */
    async executeStep(input: StepInput): Promise<StepResult> {
      validateStepShape(input.step);
      return dispatcher.execute(
        input.step,
        { gatewayContext: input.gatewayContext },
        stepExecutors
      );
    },

    /**
     * Emit a lifecycle event (RunStarted, StepCompleted, etc.)
     * to the state store with idempotency + outbox forwarding.
     */
    async emitEvent(input: EmitEventInput): Promise<void> {
      const ctx = parseResolvedRunContext(input.ctx);
      const validatedPlanRef = parsePlanRef(input.planRef);
      const { eventType, stepId, payload } = input;
      const validatedStepId = stepId === undefined ? undefined : asStepId(stepId);

      const engineAttemptId =
        typeof deps.getEngineAttemptId === 'function'
          ? deps.getEngineAttemptId()
          : resolveTemporalAttemptFromContext();

      // Temporal technical retries reuse the same logical attempt. Only the
      // engine/application layer may advance logicalAttemptId.
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

export type Activities = ReturnType<typeof createActivities>;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const ALLOWED_STEP_FIELDS = new Set([
  'stepId',
  'kind',
  'type',
  'gateway',
  'stepTypeConfig',
  'compiledCodeRef',
  'dependsOn',
]);

function resolveTemporalAttemptFromContext(): number {
  try {
    const attempt = Context.current().info.attempt;
    return Number.isInteger(attempt) && attempt > 0 ? attempt : 1;
  } catch {
    // Activity context not available (unit tests) — fall back to 1.
    return 1;
  }
}

function validateStepShape(step: ExecutionPlan['steps'][number]): void {
  if (Object.keys(step).includes('inputBindings')) {
    throw new TypeError(
      `${ActivityErrorCode.INVALID_STEP_SCHEMA}: inputBindings_not_supported_in_v1`
    );
  }
  for (const k of Object.keys(step)) {
    if (!ALLOWED_STEP_FIELDS.has(k)) {
      throw new TypeError(`${ActivityErrorCode.INVALID_STEP_SCHEMA}: field_not_allowed:${k}`);
    }
  }
  if (!Array.isArray(step.dependsOn) && step.dependsOn !== undefined) {
    throw new TypeError(`${ActivityErrorCode.INVALID_STEP_SCHEMA}: dependsOn_must_be_array`);
  }
  if (Array.isArray(step.dependsOn) && step.dependsOn.some((dep) => typeof dep !== 'string')) {
    throw new TypeError(
      `${ActivityErrorCode.INVALID_STEP_SCHEMA}: dependsOn_values_must_be_string`
    );
  }
}

function parseGatewayConfigOrThrow(step: ExecutionPlan['steps'][number]): {
  dslVersion: '1.0';
  expression: string;
} {
  const gateway = step.gateway;
  if (typeof gateway !== 'object' || gateway === null) {
    throw ApplicationFailure.create({
      type: PERMANENT_STEP_ERROR_TYPE,
      message: `${ActivityErrorCode.INVALID_STEP_SCHEMA}: gateway_config_required:${step.stepId}`,
      nonRetryable: true,
    });
  }

  const value = gateway as Record<string, unknown>;
  if (value['dslVersion'] !== '1.0') {
    throw ApplicationFailure.create({
      type: PERMANENT_STEP_ERROR_TYPE,
      message: `${ActivityErrorCode.INVALID_STEP_SCHEMA}: gateway_dsl_version:${step.stepId}`,
      nonRetryable: true,
    });
  }

  const expression = value['expression'];
  if (typeof expression !== 'string' || expression.trim().length === 0) {
    throw ApplicationFailure.create({
      type: PERMANENT_STEP_ERROR_TYPE,
      message: `${ActivityErrorCode.INVALID_STEP_SCHEMA}: gateway_expression:${step.stepId}`,
      nonRetryable: true,
    });
  }

  return { dslVersion: '1.0', expression };
}
