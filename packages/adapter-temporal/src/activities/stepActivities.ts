import { TextDecoder } from 'node:util';

import type { PlanRef, RunContext } from '@dvt/contracts';
import { Context } from '@temporalio/activity';

import type {
  EventEnvelope,
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
  error?: string;
}

export interface EmitEventInput {
  ctx: RunContext;
  eventType: EventType;
  stepId?: string;
  /** Optional planner-driven logical attempt id; fallback is engineAttemptId from Temporal runtime. */
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
      return { stepId: input.step.stepId, status: 'COMPLETED' };
    },

    /**
     * Emit a lifecycle event (RunStarted, StepCompleted, etc.)
     * to the state store with idempotency + outbox forwarding.
     */
    async emitEvent(input: EmitEventInput): Promise<void> {
      const { ctx, eventType, stepId } = input;

      let engineAttemptId = 1;
      try {
        engineAttemptId = Context.current().info.attempt;
      } catch {
        // Activity context not available (unit tests) — fall back to 1.
        engineAttemptId = 1;
      }

      const logicalAttemptId = input.logicalAttemptId ?? engineAttemptId;

      const envelope = {
        eventType,
        emittedAt: deps.clock.nowIsoUtc(),
        tenantId: ctx.tenantId,
        projectId: ctx.projectId,
        environmentId: ctx.environmentId,
        runId: ctx.runId,
        ...(stepId ? { stepId } : {}),
        engineAttemptId,
        logicalAttemptId,
        idempotencyKey: deps.idempotency.runEventKey({
          eventType,
          tenantId: ctx.tenantId,
          runId: ctx.runId,
          logicalAttemptId,
          engineAttemptId,
          ...(stepId ? { stepId } : {}),
        }),
      } as Omit<EventEnvelope, 'runSeq'>;

      const { appended } = await deps.stateStore.appendEventsTx(ctx.runId, [envelope]);
      await deps.outbox.enqueueTx(ctx.runId, appended);
    },

    /** Persist run metadata for correlation queries. */
    async saveRunMetadata(meta: RunMetadata): Promise<void> {
      await deps.stateStore.saveRunMetadata(meta);
    },
  };
}

export type Activities = ReturnType<typeof createActivities>;

// ---------------------------------------------------------------------------
// Internal helpers (mirrors MockAdapter)
// ---------------------------------------------------------------------------

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
  const allowed = new Set(['stepId', 'kind']);
  for (const k of Object.keys(step)) {
    if (!allowed.has(k)) {
      throw new Error(`INVALID_STEP_SCHEMA: field_not_allowed:${k}`);
    }
  }
}
