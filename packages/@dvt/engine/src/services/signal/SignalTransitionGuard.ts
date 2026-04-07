import {
  CURRENT_WORKFLOW_SNAPSHOT_SCHEMA_VERSION,
  type RunMetadata,
  type SignalRequest,
  type WorkflowSnapshot,
} from '@dvt/contracts';
import type { GuardedRunEventType } from '@dvt/run-domain';

import type { IdempotencyKeyBuilder } from '../../core/idempotency.js';
import { buildSignalDerivedRunEventInput } from '../../core/lifecycle/coreRuntime.js';
import { applyRunEvent } from '../../core/SnapshotProjector.js';
import type { EventEnvelope, IRunStateStoreRead } from '../../ports/IRunStateStore.js';

export interface SignalTransitionGuardDeps {
  stateStoreRead: IRunStateStoreRead;
  idempotency: IdempotencyKeyBuilder;
  clock: { nowIsoUtc(): string };
}

export class SignalTransitionGuard {
  constructor(private readonly deps: SignalTransitionGuardDeps) {}

  async assertAllowed(
    meta: RunMetadata,
    req: SignalRequest,
    eventType: GuardedRunEventType
  ): Promise<'allowed' | 'already_applied'> {
    const storedSnap = await this.deps.stateStoreRead.getSnapshot(meta.tenantId, meta.runId);
    const events = await this.deps.stateStoreRead.listEvents(meta.tenantId, meta.runId);
    const baseSnap = storedSnap ?? this.rebuildWorkflowSnapshot(meta.runId, events);
    if (this.isAlreadyApplied(baseSnap, events, req)) {
      return 'already_applied';
    }
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
    return 'allowed';
  }

  private rebuildWorkflowSnapshot(
    runId: string,
    events: readonly EventEnvelope[]
  ): WorkflowSnapshot {
    const snapshot: WorkflowSnapshot = {
      schemaVersion: CURRENT_WORKFLOW_SNAPSHOT_SCHEMA_VERSION,
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

  private isAlreadyApplied(
    snapshot: WorkflowSnapshot,
    events: readonly EventEnvelope[],
    req: SignalRequest
  ): boolean {
    if (req.type === 'PAUSE') {
      return snapshot.status === 'PAUSED' || snapshot.paused;
    }

    if (req.type === 'RESUME') {
      return (
        snapshot.status === 'RUNNING' &&
        !snapshot.paused &&
        this.lastPauseResumeEventType(events) === 'RunResumed'
      );
    }

    return false;
  }

  private lastPauseResumeEventType(events: readonly EventEnvelope[]): GuardedRunEventType | null {
    for (let index = events.length - 1; index >= 0; index -= 1) {
      const eventType = events[index]?.eventType;
      if (eventType === 'RunPaused' || eventType === 'RunResumed') {
        return eventType;
      }
    }
    return null;
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
