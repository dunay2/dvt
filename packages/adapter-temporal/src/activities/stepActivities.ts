import { TextDecoder } from 'node:util';

import type { PlanRef, RunContext } from '@dvt/contracts';
import { Context } from '@temporalio/activity';
import { ApplicationFailure } from '@temporalio/activity';

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
  RunMetadata,
} from '../engine-types.js';

// ---------------------------------------------------------------------------
// Dependency container (injected at Worker creation time)
// ---------------------------------------------------------------------------

export interface ActivityDeps {
  stateStore: IRunStateStore;
  outbox: IOutboxStorage;
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
}

export interface StepResult {
  stepId: string;
  status: 'COMPLETED' | 'FAILED';
  retriable?: boolean;
  error?: string;
}

export interface EmitEventInput {
  ctx: RunContext;
  planRef: PlanRef;
  eventType: EventType;
  stepId?: string;
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
  return {
    /**
     * Fetch plan from storage, validate SHA-256 integrity, parse JSON,
     * and verify metadata matches PlanRef.
     */
    async fetchPlan(planRef: PlanRef): Promise<ExecutionPlan> {
      const bytes = await deps.integrity.fetchAndValidate(planRef, deps.fetcher);
      const plan = parsePlan(bytes);
      validatePlanAgainstRef(plan, planRef);
      return plan;
    },

    /**
     * Execute a single step (MVP: validates step shape only).
     * Real step dispatch (dbt-run, HTTP, etc.) comes in Phase 2+.
     */
    async executeStep(input: StepInput): Promise<StepResult> {
      validateStepShape(input.step);

      const simulateErrorKind =
        typeof input.step['simulateError'] === 'string'
          ? String(input.step['simulateError'])
          : undefined;

      if (simulateErrorKind === 'transient') {
        throw new Error(`TRANSIENT_STEP_ERROR:${input.step.stepId}`);
      }

      if (simulateErrorKind === 'permanent') {
        throw ApplicationFailure.create({
          type: 'PermanentStepError',
          message: `PERMANENT_STEP_ERROR:${input.step.stepId}`,
          nonRetryable: true,
        });
      }

      return { stepId: input.step.stepId, status: 'COMPLETED' };
    },

    /**
     * Emit a lifecycle event (RunStarted, StepCompleted, etc.)
     * to the state store with idempotency + outbox forwarding.
     */
    async emitEvent(input: EmitEventInput): Promise<void> {
      const { ctx, eventType, stepId } = input;

      const engineAttemptId =
        typeof deps.getEngineAttemptId === 'function'
          ? deps.getEngineAttemptId()
          : resolveTemporalAttemptFromContext();

      const logicalAttemptId = input.logicalAttemptId ?? 1;

      const envelope: EventInput = {
        eventId: deps.idempotency.eventId(),
        eventType,
        emittedAt: deps.clock.nowIsoUtc(),
        tenantId: ctx.tenantId,
        projectId: ctx.projectId,
        environmentId: ctx.environmentId,
        runId: ctx.runId,
        planId: input.planRef.planId,
        planVersion: input.planRef.planVersion,
        ...(stepId ? { stepId } : {}),
        engineAttemptId,
        logicalAttemptId,
        idempotencyKey: deps.idempotency.runEventKey({
          eventType,
          runId: ctx.runId,
          logicalAttemptId,
          planId: input.planRef.planId,
          planVersion: input.planRef.planVersion,
          ...(stepId ? { stepId } : {}),
        }),
      };

      await deps.stateStore.appendAndEnqueueTx(ctx.runId, [envelope]);
    },

    /** Persist run metadata for correlation queries. */
    async saveRunMetadata(meta: RunMetadata): Promise<void> {
      await deps.stateStore.bootstrapRunTx({ metadata: meta, firstEvents: [] });
    },
  };
}

export type Activities = ReturnType<typeof createActivities>;

// ---------------------------------------------------------------------------
// Internal helpers (mirrors MockAdapter)
// ---------------------------------------------------------------------------

const ALLOWED_STEP_FIELDS = new Set(['stepId', 'kind', 'dependsOn', 'simulateError']);

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
    throw new Error('INVALID_PLAN_SCHEMA');
  }
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
    typeof m['schemaVersion'] === 'string'
  );
}

function validatePlanAgainstRef(plan: ExecutionPlan, ref: PlanRef): void {
  if (plan.metadata.planId !== ref.planId) throw new Error('PLAN_REF_MISMATCH: planId');
  if (plan.metadata.planVersion !== ref.planVersion)
    throw new Error('PLAN_REF_MISMATCH: planVersion');
  if (plan.metadata.schemaVersion !== ref.schemaVersion)
    throw new Error('PLAN_REF_MISMATCH: schemaVersion');
}

function validateStepShape(step: ExecutionPlan['steps'][number]): void {
  for (const k of Object.keys(step)) {
    if (!ALLOWED_STEP_FIELDS.has(k)) {
      throw new Error(`INVALID_STEP_SCHEMA: field_not_allowed:${k}`);
    }
  }

  if (!Array.isArray(step.dependsOn) && typeof step.dependsOn !== 'undefined') {
    throw new Error('INVALID_STEP_SCHEMA: dependsOn_must_be_array');
  }

  if (Array.isArray(step.dependsOn) && step.dependsOn.some((dep) => typeof dep !== 'string')) {
    throw new Error('INVALID_STEP_SCHEMA: dependsOn_values_must_be_string');
  }
}
