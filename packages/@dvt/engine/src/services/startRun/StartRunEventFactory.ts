import type { EngineRunRef, PlanRef, ResolvedRunContext } from '@dvt/contracts';

import type { EventType, RunEventInput, RunMetadata } from '../../contracts/runEvents.js';
import type { IdempotencyKeyBuilder } from '../../core/idempotency.js';
import type { IClock } from '../../utils/clock.js';

export interface StartRunEventFactoryDeps {
  idempotency: IdempotencyKeyBuilder;
  clock: IClock;
}

export interface ProviderRefUpdate {
  providerWorkflowId: string;
  providerRunId: string;
  providerNamespace?: string;
  providerTaskQueue?: string;
  providerConductorUrl?: string;
}

export class StartRunEventFactory {
  constructor(private readonly deps: StartRunEventFactoryDeps) {}

  buildRunEvent(
    meta: RunMetadata,
    eventType: EventType,
    payload?: Record<string, unknown>
  ): RunEventInput {
    return {
      eventId: this.deps.idempotency.eventId(),
      eventType,
      payloadVersion: 1,
      emittedAt: this.deps.clock.nowIsoUtc(),
      tenantId: meta.tenantId,
      projectId: meta.projectId,
      environmentId: meta.environmentId,
      runId: meta.runId,
      planId: meta.planId,
      planVersion: meta.planVersion,
      engineAttemptId: 1,
      logicalAttemptId: meta.logicalAttemptId,
      idempotencyKey: this.deps.idempotency.runEventKey({
        eventType,
        runId: meta.runId,
        logicalAttemptId: meta.logicalAttemptId,
        planId: meta.planId,
        planVersion: meta.planVersion,
      }),
      ...(payload === undefined ? {} : { payload }),
    };
  }

  buildRunMetadata(
    context: ResolvedRunContext,
    planRef: PlanRef,
    runRef: EngineRunRef,
    createdAt: string
  ): RunMetadata {
    return {
      tenantId: context.tenantId,
      projectId: context.projectId,
      environmentId: context.environmentId,
      runId: context.runId,
      planId: planRef.planId,
      planVersion: planRef.planVersion,
      logicalAttemptId: context.logicalAttemptId,
      ...(context.parentRunId !== undefined ? { parentRunId: context.parentRunId } : {}),
      ...(context.originRunId !== undefined ? { originRunId: context.originRunId } : {}),
      provider: context.targetAdapter,
      providerWorkflowId: runRef.workflowId,
      providerRunId: runRef.runId,
      ...(runRef.provider === 'temporal' ? { providerNamespace: runRef.namespace } : {}),
      ...(runRef.provider === 'temporal' && runRef.taskQueue !== undefined
        ? { providerTaskQueue: runRef.taskQueue }
        : {}),
      ...(runRef.provider === 'conductor' ? { providerConductorUrl: runRef.conductorUrl } : {}),
      createdAt,
    };
  }

  buildProviderRefUpdate(runRef: EngineRunRef): ProviderRefUpdate {
    const update: ProviderRefUpdate = {
      providerWorkflowId: runRef.workflowId,
      providerRunId: runRef.runId,
    };
    if (runRef.provider === 'temporal') {
      update.providerNamespace = runRef.namespace;
      if (runRef.taskQueue !== undefined) {
        update.providerTaskQueue = runRef.taskQueue;
      }
    }
    if (runRef.provider === 'conductor') {
      update.providerConductorUrl = runRef.conductorUrl;
    }
    return update;
  }
}
