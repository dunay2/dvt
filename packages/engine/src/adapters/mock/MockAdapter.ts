import type {
  EngineRunRef,
  PlanRef,
  RunContext,
  RunStatusSnapshot,
  SignalRequest,
} from '@dvt/contracts';

import type { ExecutionPlan } from '../../contracts/executionPlan.js';
import type { EventEnvelope } from '../../contracts/runEvents.js';
import { IdempotencyKeyBuilder } from '../../core/idempotency.js';
import { SnapshotProjector } from '../../core/SnapshotProjector.js';
import type { IOutboxStorage } from '../../outbox/types.js';
import { PlanIntegrityValidator, type IPlanFetcher } from '../../security/planIntegrity.js';
import type { IRunStateStore } from '../../state/IRunStateStore.js';
import type { IClock } from '../../utils/clock.js';
import type { IProviderAdapter } from '../IProviderAdapter.js';

export interface MockAdapterDeps {
  stateStore: IRunStateStore;
  outbox: IOutboxStorage;
  clock: IClock;
  idempotency: IdempotencyKeyBuilder;
  projector: SnapshotProjector;
  fetcher: IPlanFetcher;
  integrity: PlanIntegrityValidator;
}

export class MockAdapter implements IProviderAdapter {
  readonly provider = 'mock' as const;

  constructor(private readonly deps: MockAdapterDeps) {}

  async startRun(planRef: PlanRef, ctx: RunContext): Promise<EngineRunRef> {
    // Fetch and validate integrity (normative). In real Temporal/Conductor this happens in worker Activity.
    const bytes = await this.deps.integrity.fetchAndValidate(planRef, this.deps.fetcher);
    const plan = parsePlan(bytes);
    validatePlanAgainstRef(plan, planRef);

    const runRef: EngineRunRef = {
      provider: 'mock',
      workflowId: `mock_${ctx.runId}`,
      runId: ctx.runId,
    };

    // Execute sequentially (deterministic)
    for (const step of plan.steps) {
      validateMockStep(step);
      await this.emitStepEvent(ctx, step.stepId, 'StepStarted');
      await this.emitStepEvent(ctx, step.stepId, 'StepCompleted');
    }

    await this.emitRunEvent(ctx, 'RunCompleted');
    return runRef;
  }

  async cancelRun(_runRef: EngineRunRef): Promise<void> {
    // For mock, cancellation is cooperative; engine emits RunCancelled.
  }

  async getRunStatus(runRef: EngineRunRef): Promise<RunStatusSnapshot> {
    const events = await this.deps.stateStore.listEvents(runRef.runId);
    return this.deps.projector.rebuild(runRef.runId, events);
  }

  async signal(_runRef: EngineRunRef, _request: SignalRequest): Promise<void> {
    // For mock, signals are interpreted by engine (pause/resume/cancel events).
  }

  private async emitRunEvent(
    ctx: RunContext,
    eventType: EventEnvelope['eventType']
  ): Promise<void> {
    const env: Omit<EventEnvelope, 'runSeq'> = {
      eventType,
      emittedAt: this.deps.clock.nowIsoUtc(),
      tenantId: ctx.tenantId,
      projectId: ctx.projectId,
      environmentId: ctx.environmentId,
      runId: ctx.runId,
      engineAttemptId: 1,
      logicalAttemptId: 1,
      idempotencyKey: this.deps.idempotency.runEventKey({
        eventType,
        tenantId: ctx.tenantId,
        runId: ctx.runId,
        logicalAttemptId: 1,
      }),
    };

    const { appended } = await this.deps.stateStore.appendEventsTx(ctx.runId, [env]);
    await this.deps.outbox.enqueueTx(ctx.runId, appended);
  }

  private async emitStepEvent(
    ctx: RunContext,
    stepId: string,
    eventType: 'StepStarted' | 'StepCompleted' | 'StepFailed'
  ): Promise<void> {
    const env: Omit<EventEnvelope, 'runSeq'> = {
      eventType,
      emittedAt: this.deps.clock.nowIsoUtc(),
      tenantId: ctx.tenantId,
      projectId: ctx.projectId,
      environmentId: ctx.environmentId,
      runId: ctx.runId,
      stepId,
      engineAttemptId: 1,
      logicalAttemptId: 1,
      idempotencyKey: this.deps.idempotency.runEventKey({
        eventType,
        tenantId: ctx.tenantId,
        runId: ctx.runId,
        logicalAttemptId: 1,
        stepId,
      }),
    };

    const { appended } = await this.deps.stateStore.appendEventsTx(ctx.runId, [env]);
    await this.deps.outbox.enqueueTx(ctx.runId, appended);
  }
}

function parsePlan(bytes: Uint8Array): ExecutionPlan {
  const text = new TextDecoder().decode(bytes);
  const obj: unknown = JSON.parse(text);
  // Minimal runtime validation (Phase 1): check expected shape.
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

function validateMockStep(step: ExecutionPlan['steps'][number]): void {
  // Adapter narrowing rule: reject unrecognized fields.
  // For mock we only allow: stepId, kind.
  const allowed = new Set(['stepId', 'kind']);
  for (const k of Object.keys(step)) {
    if (!allowed.has(k)) {
      throw new Error(`INVALID_STEP_SCHEMA: field_not_allowed:${k}`);
    }
  }
}
