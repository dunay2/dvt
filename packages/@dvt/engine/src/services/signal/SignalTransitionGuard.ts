import type { EventType, RunMetadata, SignalRequest, WorkflowSnapshot } from '@dvt/contracts';

import type { IdempotencyKeyBuilder } from '../../core/idempotency.js';
import { buildSignalDerivedRunEventInput } from '../../core/lifecycle/coreRuntime.js';
import { applyRunEvent } from '../../core/SnapshotProjector.js';
import type { IRunStateStoreRead } from '../../ports/IRunStateStore.js';

export interface SignalTransitionGuardDeps {
  stateStoreRead: IRunStateStoreRead;
  idempotency: IdempotencyKeyBuilder;
  clock: { nowIsoUtc(): string };
}

export class SignalTransitionGuard {
  constructor(private readonly deps: SignalTransitionGuardDeps) {}

  async assertAllowed(meta: RunMetadata, req: SignalRequest, eventType: EventType): Promise<void> {
    const storedSnap = await this.deps.stateStoreRead.getSnapshot(meta.tenantId, meta.runId);
    const baseSnap = storedSnap ?? (await this.rebuildWorkflowSnapshot(meta.tenantId, meta.runId));
    const transientSnap = cloneWorkflowSnapshot(baseSnap);
    const event = buildSignalDerivedRunEventInput({
      idempotency: this.deps.idempotency,
      clock: this.deps.clock,
      meta,
      req,
      eventType,
    });

    applyRunEvent(transientSnap, {
      ...event,
      runSeq: 0,
      persistedAt: event.emittedAt,
    });
  }

  private async rebuildWorkflowSnapshot(
    tenantId: string,
    runId: string
  ): Promise<WorkflowSnapshot> {
    const events = await this.deps.stateStoreRead.listEvents(tenantId, runId);
    const snapshot: WorkflowSnapshot = {
      runId,
      status: 'PENDING',
      paused: false,
      cancelling: false,
      gatewayDecisions: {},
      steps: {},
    };

    for (const event of events) {
      applyRunEvent(snapshot, event);
    }

    return snapshot;
  }
}

function cloneWorkflowSnapshot(snapshot: WorkflowSnapshot): WorkflowSnapshot {
  const steps = Object.fromEntries(
    Object.entries(snapshot.steps).map(([stepId, step]) => [stepId, { ...step }])
  );

  return {
    ...snapshot,
    steps,
    gatewayDecisions: snapshot.gatewayDecisions ? { ...snapshot.gatewayDecisions } : {},
  };
}
