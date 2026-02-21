/**
 * @file packages/@dvt/engine/src/adapters/mock/MockAdapter.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @baseline ADR-0004: Event Sourcing Strategy (Extended)
 * @decision Decision — The mock adapter executes steps and emits canonical events to validate engine semantics without an external runtime
 * @consequence Tests and local development verify run/step lifecycle using the same domain event model
 * @version 1.0.0
 * @date 2026-02-21
 */
import type {
  EngineRunRef,
  PlanRef,
  RunContext,
  RunStatusSnapshot,
  SignalRequest,
} from '@dvt/contracts';

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
  planFetcher?: {
    fetch(planRef: PlanRef): Promise<ExecutionPlan>;
  };
}

type RunEventMeta = Pick<
  RunMetadata,
  'tenantId' | 'projectId' | 'environmentId' | 'runId' | 'planId' | 'planVersion'
>;

export class MockAdapter implements IProviderAdapter {
  readonly provider = 'mock' as const;

  constructor(private readonly deps: MockAdapterDeps) {}

  async startRun(planRef: PlanRef, ctx: RunContext): Promise<EngineRunRef> {
    const plan: ExecutionPlan = this.deps.planFetcher
      ? await this.deps.planFetcher.fetch(planRef)
      : {
          metadata: {
            planId: planRef.planId,
            planVersion: planRef.planVersion,
            schemaVersion: planRef.schemaVersion,
          },
          steps: [],
        };

    const eventMeta: RunEventMeta = {
      tenantId: ctx.tenantId,
      projectId: ctx.projectId,
      environmentId: ctx.environmentId,
      runId: ctx.runId,
      planId: planRef.planId,
      planVersion: planRef.planVersion,
    };

    await this.emitRunEvent(eventMeta, 'RunStarted');

    const runRef: EngineRunRef = {
      provider: 'mock',
      workflowId: `mock_${ctx.runId}`,
      runId: ctx.runId,
    };

    for (const step of plan.steps) {
      validateMockStep(step);
      await this.emitStepEvent(eventMeta, step.stepId, 'StepStarted');
      await this.emitStepEvent(eventMeta, step.stepId, 'StepCompleted');
    }

    await this.emitRunEvent(eventMeta, 'RunCompleted');
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

  private async emitRunEvent(meta: RunEventMeta, eventType: EventType): Promise<void> {
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
    meta: RunEventMeta,
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
