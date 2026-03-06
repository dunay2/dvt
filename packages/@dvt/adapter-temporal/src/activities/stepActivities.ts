/**
 * @file packages/@dvt/adapter-temporal/src/activities/stepActivities.ts
 * @baseline ADR-0001: Temporal Integration Test Policy (Build Preconditions + Lifecycle Discipline)
 * @baseline ADR-0004: Event Sourcing Strategy (Extended)
 * @decision Section 5 — All workflow side effects are mediated through deterministic activity boundaries
 * @decision Section 2.1 — Emitted events preserve idempotency and append-only state-store semantics
 * @consequence Activity execution keeps lifecycle/event persistence deterministic and replay-compatible
 * @version 1.0.0
 * @date 2026-02-21
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
  IOutboxStorage,
  IPlanFetcher,
  IPlanIntegrityValidator,
  IRunStateStore,
  RunStateCommandPort,
  RunMetadata,
} from '../engine-types.js';

// ---------------------------------------------------------------------------
// Dependency container (injected at Worker creation time)
// ---------------------------------------------------------------------------

export interface ActivityDeps {
  runStateCommandPort: RunStateCommandPort;
  /** @deprecated transitional fallback while callers migrate to runStateCommandPort */
  stateStore?: IRunStateStore;
  /** @deprecated retained for backwards compatibility in tests */
  outbox?: IOutboxStorage;
  clock: IClock;
  idempotency: IIdempotencyKeyBuilder;
  fetcher: IPlanFetcher;
  integrity: IPlanIntegrityValidator;
  /** Optional override for tests; runtime uses Temporal activity context. */
  getEngineAttemptId?: () => number;
}

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
// Activity factory — creates closures over shared deps
// ---------------------------------------------------------------------------

export function createActivities(deps: ActivityDeps): {
  fetchPlan(planRef: PlanRef): Promise<ExecutionPlan>;
  executeStep(input: StepInput): Promise<StepResult>;
  emitEvent(input: EmitEventInput): Promise<void>;
  saveRunMetadata(meta: RunMetadata): Promise<void>;
} {
  const { runStateCommandPort } = deps;

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
     * Execute a single step (MVP: validates step shape only).
     * Real step dispatch (dbt-run, HTTP, etc.) comes in Phase 2+.
     */
    async executeStep(input: StepInput): Promise<StepResult> {
      validateStepShape(input.step);
      enforceSimulatedStepOutcome(input.step);
      if (input.step.type !== 'gateway') {
        return completedStepResult(input.step.stepId);
      }

      return executeGatewayStep(input.step, input.gatewayContext ?? {});
    },

    /**
     * Emit a lifecycle event (RunStarted, StepCompleted, etc.)
     * to the state store with idempotency + outbox forwarding.
     */
    async emitEvent(input: EmitEventInput): Promise<void> {
      const ctx = parseRunContext(input.ctx);
      const validatedPlanRef = parsePlanRef(input.planRef);
      const envelope = buildEventEnvelope({ deps, input, ctx, validatedPlanRef });
      await runStateCommandPort.appendTransitions(ctx.runId, [envelope]);
    },

    /**
     * Persist run metadata for correlation queries.
     *
     * Idempotent: when the WorkflowEngine has already called bootstrapRunTx (the normal
     * production path per ADR-0013/0014), the state store throws RUN_ALREADY_EXISTS.
     * The activity silently succeeds — the engine-owned bootstrap is the authoritative
     * write, and the workflow continuing from resumeFromLayerIndex>0 (continue-as-new)
     * should not re-bootstrap an already-existing run.
     */
    async saveRunMetadata(meta: RunMetadata): Promise<void> {
      try {
        await runStateCommandPort.bootstrapRun({ metadata: meta, firstEvents: [] });
      } catch (err) {
        if (err instanceof Error && err.message === 'RUN_ALREADY_EXISTS') return;
        throw err;
      }
    },
  };
}

export type Activities = ReturnType<typeof createActivities>;

function enforceSimulatedStepOutcome(step: ExecutionPlan['steps'][number]): void {
  const simulateErrorKind =
    typeof step['simulateError'] === 'string' ? String(step['simulateError']) : undefined;

  if (simulateErrorKind === 'transient') {
    throw new Error(`TRANSIENT_STEP_ERROR:${step.stepId}`);
  }

  if (simulateErrorKind === 'permanent') {
    throw ApplicationFailure.create({
      type: 'PermanentStepError',
      message: `PERMANENT_STEP_ERROR:${step.stepId}`,
      nonRetryable: true,
    });
  }
}

function completedStepResult(stepId: string): StepResult {
  return { stepId, status: 'COMPLETED' };
}

function executeGatewayStep(
  step: ExecutionPlan['steps'][number],
  gatewayContext: Record<string, unknown>
): StepResult {
  const gateway = parseGatewayConfigOrThrow(step);
  try {
    const parsed = parseDslV1(gateway.expression);
    const passed = evaluateDslV1(parsed, gatewayContext);
    return {
      stepId: step.stepId,
      status: 'COMPLETED',
      gatewayDecision: passed,
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw ApplicationFailure.create({
      type: 'PermanentStepError',
      message: `INVALID_GATEWAY_DSL:${step.stepId}:${reason}`,
      nonRetryable: true,
    });
  }
}

function buildEventEnvelope(args: {
  deps: ActivityDeps;
  input: EmitEventInput;
  ctx: RunContext;
  validatedPlanRef: PlanRef;
}): EventInput {
  const { deps, input, ctx, validatedPlanRef } = args;
  const logicalAttemptId = input.logicalAttemptId ?? 1;
  const engineAttemptId =
    typeof deps.getEngineAttemptId === 'function'
      ? deps.getEngineAttemptId()
      : resolveTemporalAttemptFromContext();

  return {
    eventId: deps.idempotency.eventId(),
    eventType: input.eventType,
    emittedAt: deps.clock.nowIsoUtc(),
    tenantId: ctx.tenantId,
    projectId: ctx.projectId,
    environmentId: ctx.environmentId,
    runId: ctx.runId,
    planId: validatedPlanRef.planId,
    planVersion: validatedPlanRef.planVersion,
    ...(input.stepId ? { stepId: input.stepId } : {}),
    engineAttemptId,
    logicalAttemptId,
    idempotencyKey: deps.idempotency.runEventKey({
      eventType: input.eventType,
      tenantId: ctx.tenantId,
      runId: ctx.runId,
      logicalAttemptId,
      planId: validatedPlanRef.planId,
      planVersion: validatedPlanRef.planVersion,
      ...(input.stepId ? { stepId: input.stepId } : {}),
    }),
    ...(input.payload !== undefined ? { payload: input.payload } : {}),
  };
}

// ---------------------------------------------------------------------------
// Internal helpers (mirrors MockAdapter)
// ---------------------------------------------------------------------------

const ALLOWED_STEP_FIELDS = new Set([
  'stepId',
  'kind',
  'type',
  'gateway',
  'stepTypeConfig',
  'dependsOn',
  'simulateError',
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
    throw new TypeError('INVALID_PLAN_SCHEMA');
  }
  const contractVersion = obj.metadata.contractVersion;
  if (typeof contractVersion !== 'string') {
    throw new TypeError('PLAN_CONTRACT_VERSION_MISSING');
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
  if (SUPPORTED_PLAN_CONTRACT_VERSIONS.has(contractVersion)) {
    return;
  }

  throw new TypeError(
    `PLAN_CONTRACT_VERSION_UNKNOWN: ${contractVersion}. Supported: ${Array.from(
      SUPPORTED_PLAN_CONTRACT_VERSIONS
    ).join(', ')}`
  );
}

function validatePlanAgainstRef(plan: ExecutionPlan, ref: PlanRef): void {
  if (plan.metadata.planId !== ref.planId) throw new TypeError('PLAN_REF_MISMATCH: planId');
  if (plan.metadata.planVersion !== ref.planVersion)
    throw new TypeError('PLAN_REF_MISMATCH: planVersion');
  if (plan.metadata.schemaVersion !== ref.schemaVersion)
    throw new TypeError('PLAN_REF_MISMATCH: schemaVersion');
}

function validateStepShape(step: ExecutionPlan['steps'][number]): void {
  if (hasOwn(step, 'inputBindings')) {
    throw new TypeError('INVALID_STEP_SCHEMA: inputBindings_not_supported_in_v1');
  }

  for (const k of Object.keys(step)) {
    if (!ALLOWED_STEP_FIELDS.has(k)) {
      throw new TypeError(`INVALID_STEP_SCHEMA: field_not_allowed:${k}`);
    }
  }

  if (!Array.isArray(step.dependsOn) && step.dependsOn !== undefined) {
    throw new TypeError('INVALID_STEP_SCHEMA: dependsOn_must_be_array');
  }

  if (Array.isArray(step.dependsOn) && step.dependsOn.some((dep) => typeof dep !== 'string')) {
    throw new TypeError('INVALID_STEP_SCHEMA: dependsOn_values_must_be_string');
  }
}

function hasOwn(obj: object, key: PropertyKey): boolean {
  const objectWithHasOwn = Object as typeof Object & {
    hasOwn?: (target: object, property: PropertyKey) => boolean;
  };

  if (typeof objectWithHasOwn.hasOwn === 'function') {
    return objectWithHasOwn.hasOwn(obj, key);
  }

  return Object.prototype.hasOwnProperty.call(obj, key);
}

function parseGatewayConfigOrThrow(step: ExecutionPlan['steps'][number]): {
  dslVersion: '1.0';
  expression: string;
} {
  const gateway = step.gateway;
  if (typeof gateway !== 'object' || gateway === null) {
    throw ApplicationFailure.create({
      type: 'PermanentStepError',
      message: `INVALID_STEP_SCHEMA: gateway_config_required:${step.stepId}`,
      nonRetryable: true,
    });
  }

  const value = gateway as Record<string, unknown>;
  if (value['dslVersion'] !== '1.0') {
    throw ApplicationFailure.create({
      type: 'PermanentStepError',
      message: `INVALID_STEP_SCHEMA: gateway_dsl_version:${step.stepId}`,
      nonRetryable: true,
    });
  }

  const expression = value['expression'];
  if (typeof expression !== 'string' || expression.trim().length === 0) {
    throw ApplicationFailure.create({
      type: 'PermanentStepError',
      message: `INVALID_STEP_SCHEMA: gateway_expression:${step.stepId}`,
      nonRetryable: true,
    });
  }

  return {
    dslVersion: '1.0',
    expression,
  };
}
