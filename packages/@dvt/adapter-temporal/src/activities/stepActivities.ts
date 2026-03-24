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
import { TextDecoder } from 'node:util';

import { parsePlanRef, parseRunContext } from '@dvt/contracts';
import type { PlanRef, RunContext } from '@dvt/contracts';
import { evaluateDslV1, parseDslV1 } from '@dvt/dsl';
import { ApplicationFailure, Context } from '@temporalio/activity';

import type {
  EventInput,
  EventType,
  ExecutionPlan,
  IClock,
  IIdempotencyKeyBuilder,
  IPlanFetcher,
  IPlanIntegrityValidator,
  RunStateCommandPort,
} from '../engine-types.js';

// ---------------------------------------------------------------------------
// Error codes (3.7 — replace magic strings with named constants)
// ---------------------------------------------------------------------------

const ActivityErrorCode = {
  INVALID_PLAN_SCHEMA: 'INVALID_PLAN_SCHEMA',
  PLAN_CONTRACT_VERSION_MISSING: 'PLAN_CONTRACT_VERSION_MISSING',
  PLAN_CONTRACT_VERSION_UNKNOWN: 'PLAN_CONTRACT_VERSION_UNKNOWN',
  PLAN_REF_MISMATCH: 'PLAN_REF_MISMATCH',
  INVALID_STEP_SCHEMA: 'INVALID_STEP_SCHEMA',
  INVALID_GATEWAY_DSL: 'INVALID_GATEWAY_DSL',
  TRANSIENT_STEP_ERROR: 'TRANSIENT_STEP_ERROR',
  PERMANENT_STEP_ERROR: 'PERMANENT_STEP_ERROR',
} as const;

const PERMANENT_STEP_ERROR_TYPE = 'PermanentStepError';

// ---------------------------------------------------------------------------
// Role-based dependency interfaces (3.3 — ISP: each activity declares its needs)
// ---------------------------------------------------------------------------

export interface PlanFetcherDeps {
  fetcher: IPlanFetcher;
  integrity: IPlanIntegrityValidator;
}

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
export interface ActivityDeps extends PlanFetcherDeps, EventEmitterDeps, RunBootstrapperDeps {}

// ---------------------------------------------------------------------------
// Activity input / output types
// ---------------------------------------------------------------------------

export interface StepInput {
  step: ExecutionPlan['steps'][number];
  ctx: RunContext;
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
  retriable?: boolean;
  error?: string;
}

export interface EmitEventInput {
  ctx: RunContext;
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

const gatewayStepExecutor: StepExecutor = {
  canExecute(step) {
    return step.type === 'gateway';
  },
  async execute(step, context) {
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
  },
};

const defaultStepExecutor: StepExecutor = {
  canExecute() {
    return true;
  },
  async execute(step) {
    return { stepId: step.stepId, status: 'COMPLETED' };
  },
};

/** Default executor chain: gateway first, catch-all last. */
export const DEFAULT_STEP_EXECUTORS: readonly StepExecutor[] = [
  gatewayStepExecutor,
  defaultStepExecutor,
];

// ---------------------------------------------------------------------------
// Activity factory — creates closures over shared deps
// ---------------------------------------------------------------------------

export function createActivities(
  deps: ActivityDeps,
  stepExecutors: readonly StepExecutor[] = DEFAULT_STEP_EXECUTORS
): {
  fetchPlan(planRef: PlanRef): Promise<ExecutionPlan>;
  executeStep(input: StepInput): Promise<StepResult>;
  emitEvent(input: EmitEventInput): Promise<void>;
} {
  return {
    /**
     * Fetch plan from storage, validate SHA-256 integrity, parse JSON,
     * and verify metadata matches PlanRef.
     */
    async fetchPlan(planRef: PlanRef): Promise<ExecutionPlan> {
      const validatedPlanRef = parsePlanRef(planRef);
      const bytes = await deps.integrity.fetchAndValidate(validatedPlanRef, deps.fetcher);
      const plan = parsePlan(bytes);
      validatePlanAgainstRef(plan, validatedPlanRef);
      return plan;
    },

    /**
     * Execute a single step.
     * Thin dispatcher: validates shape, applies test hook, then delegates to executor registry.
     */
    async executeStep(input: StepInput): Promise<StepResult> {
      validateStepShape(input.step);
      return dispatchStep(input.step, { gatewayContext: input.gatewayContext }, stepExecutors);
    },

    /**
     * Emit a lifecycle event (RunStarted, StepCompleted, etc.)
     * to the state store with idempotency + outbox forwarding.
     */
    async emitEvent(input: EmitEventInput): Promise<void> {
      const ctx = parseRunContext(input.ctx);
      const validatedPlanRef = parsePlanRef(input.planRef);
      const { eventType, stepId, payload } = input;

      const engineAttemptId =
        typeof deps.getEngineAttemptId === 'function'
          ? deps.getEngineAttemptId()
          : resolveTemporalAttemptFromContext();

      const logicalAttemptId = input.logicalAttemptId ?? 1;
      const envelopeBase = {
        eventId: deps.idempotency.eventId(),
        eventType,
        payloadVersion: 1,
        emittedAt: deps.clock.nowIsoUtc(),
        tenantId: ctx.tenantId,
        projectId: ctx.projectId,
        environmentId: ctx.environmentId,
        runId: ctx.runId,
        planId: validatedPlanRef.planId,
        planVersion: validatedPlanRef.planVersion,
        ...(stepId === undefined ? {} : { stepId }),
        engineAttemptId,
        logicalAttemptId,
        idempotencyKey: deps.idempotency.runEventKey({
          eventType,
          tenantId: ctx.tenantId,
          runId: ctx.runId,
          logicalAttemptId,
          planId: validatedPlanRef.planId,
          planVersion: validatedPlanRef.planVersion,
          ...(stepId === undefined ? {} : { stepId }),
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

const SUPPORTED_PLAN_CONTRACT_VERSIONS = new Set(['1.0.0']);

function resolveTemporalAttemptFromContext(): number {
  try {
    const attempt = Context.current().info.attempt;
    return Number.isInteger(attempt) && attempt > 0 ? attempt : 1;
  } catch {
    // Activity context not available (unit tests) — fall back to 1.
    return 1;
  }
}

function parsePlan(bytes: Uint8Array): ExecutionPlan {
  const text = new TextDecoder().decode(bytes);
  const obj: unknown = JSON.parse(text);
  if (!isExecutionPlan(obj)) {
    throw new TypeError(ActivityErrorCode.INVALID_PLAN_SCHEMA);
  }
  const contractVersion = obj.metadata.contractVersion;
  if (typeof contractVersion !== 'string') {
    throw new TypeError(ActivityErrorCode.PLAN_CONTRACT_VERSION_MISSING);
  }
  validatePlanContractVersion(contractVersion);
  return obj;
}

function isExecutionPlan(v: unknown): v is ExecutionPlan {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  const meta = o['metadata'];
  const steps = o['steps'];
  if (typeof meta !== 'object' || meta === null) return false;
  if (!Array.isArray(steps)) return false;
  const m = meta as Record<string, unknown>;
  return (
    typeof m['planId'] === 'string' &&
    typeof m['planVersion'] === 'string' &&
    typeof m['schemaVersion'] === 'string' &&
    typeof m['contractVersion'] === 'string'
  );
}

function validatePlanContractVersion(contractVersion: string): void {
  if (SUPPORTED_PLAN_CONTRACT_VERSIONS.has(contractVersion)) return;
  throw new TypeError(
    `${ActivityErrorCode.PLAN_CONTRACT_VERSION_UNKNOWN}: ${contractVersion}. Supported: ${Array.from(SUPPORTED_PLAN_CONTRACT_VERSIONS).join(', ')}`
  );
}

function validatePlanAgainstRef(plan: ExecutionPlan, ref: PlanRef): void {
  if (plan.metadata.planId !== ref.planId)
    throw new TypeError(`${ActivityErrorCode.PLAN_REF_MISMATCH}: planId`);
  if (plan.metadata.planVersion !== ref.planVersion)
    throw new TypeError(`${ActivityErrorCode.PLAN_REF_MISMATCH}: planVersion`);
  if (plan.metadata.schemaVersion !== ref.schemaVersion)
    throw new TypeError(`${ActivityErrorCode.PLAN_REF_MISMATCH}: schemaVersion`);
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

async function dispatchStep(
  step: ExecutionPlan['steps'][number],
  context: StepExecutionContext,
  executors: readonly StepExecutor[]
): Promise<StepResult> {
  const executor = executors.find((e) => e.canExecute(step));
  if (!executor) {
    throw ApplicationFailure.create({
      type: PERMANENT_STEP_ERROR_TYPE,
      message: `${ActivityErrorCode.INVALID_STEP_SCHEMA}: no_executor_for_step_type:${step.type ?? 'unknown'}`,
      nonRetryable: true,
    });
  }
  return executor.execute(step, context);
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
