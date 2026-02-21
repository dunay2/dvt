import type { EngineRunRef, RunContext, RunStatusSnapshot, SignalRequest } from '@dvt/contracts';

import type { ExecutionPlan } from '../../contracts/executionPlan.js';
import type { EventType, RunEventInput, RunMetadata } from '../../contracts/runEvents.js';
import { IdempotencyKeyBuilder } from '../../core/idempotency.js';
import { SnapshotProjector } from '../../core/SnapshotProjector.js';
import type { IRunStateStore } from '../../state/IRunStateStore.js';
import type { IClock } from '../../utils/clock.js';
import type { IProviderAdapter } from '../IProviderAdapter.js';

export interface MockAdapterDeps {
  stateStore: IRunStateStore;
  clock: IClock;
  idempotency: IdempotencyKeyBuilder;
  projector: SnapshotProjector;
}

export class MockAdapter implements IProviderAdapter {
  readonly provider = 'mock' as const;

  constructor(private readonly deps: MockAdapterDeps) {}

  async startRun(plan: ExecutionPlan, ctx: RunContext): Promise<EngineRunRef> {
    const metadata = await this.deps.stateStore.getRunMetadataByRunId(ctx.runId);
    if (!metadata) throw new Error(`RUN_NOT_FOUND: ${ctx.runId}`);

    await this.emitRunEvent(metadata, 'RunStarted');

    const runRef: EngineRunRef = {
      provider: 'mock',
      workflowId: `mock_${ctx.runId}`,
      runId: ctx.runId,
    };

    for (const step of plan.steps) {
      validateMockStep(step);
      await this.emitStepEvent(metadata, step.stepId, 'StepStarted');
      await this.emitStepEvent(metadata, step.stepId, 'StepCompleted');
    }

    await this.emitRunEvent(metadata, 'RunCompleted');
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

  private async emitRunEvent(meta: RunMetadata, eventType: EventType): Promise<void> {
    const env: RunEventInput = {
      eventId: this.deps.idempotency.eventId(),
      eventType,
      emittedAt: this.deps.clock.nowIsoUtc(),
      tenantId: meta.tenantId,
      projectId: meta.projectId,
      environmentId: meta.environmentId,
      runId: meta.runId,
      planId: meta.planId,
      planVersion: meta.planVersion,
      engineAttemptId: 1,
      logicalAttemptId: 1,
      idempotencyKey: this.deps.idempotency.runEventKey({
        eventType,
        runId: meta.runId,
        logicalAttemptId: 1,
        planId: meta.planId,
        planVersion: meta.planVersion,
      }),
    };

    await this.deps.stateStore.appendAndEnqueueTx(meta.runId, [env]);
  }

  private async emitStepEvent(
    meta: RunMetadata,
    stepId: string,
    eventType: 'StepStarted' | 'StepCompleted' | 'StepFailed'
  ): Promise<void> {
    const env: RunEventInput = {
      eventId: this.deps.idempotency.eventId(),
      eventType,
      emittedAt: this.deps.clock.nowIsoUtc(),
      tenantId: meta.tenantId,
      projectId: meta.projectId,
      environmentId: meta.environmentId,
      runId: meta.runId,
      planId: meta.planId,
      planVersion: meta.planVersion,
      stepId,
      engineAttemptId: 1,
      logicalAttemptId: 1,
      idempotencyKey: this.deps.idempotency.runEventKey({
        eventType,
        runId: meta.runId,
        logicalAttemptId: 1,
        planId: meta.planId,
        planVersion: meta.planVersion,
        stepId,
      }),
    };

    await this.deps.stateStore.appendAndEnqueueTx(meta.runId, [env]);
  }
}

function validateMockStep(step: ExecutionPlan['steps'][number]): void {
  // Adapter narrowing rule: reject unrecognized fields.
  // For mock we only allow: stepId, kind, dependsOn.
  const allowed = new Set(['stepId', 'kind', 'dependsOn']);
  for (const k of Object.keys(step)) {
    if (!allowed.has(k)) {
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
