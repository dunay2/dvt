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
import type { IRunSnapshotStalenessQuery } from '../../ports/IRunSnapshotStalenessQuery.js';
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
    if (storedSnap === null) {
      const events = await this.deps.stateStoreRead.listEvents(meta.tenantId, meta.runId);
      const rebuiltSnap = this.rebuildWorkflowSnapshot(meta.runId, events);
      if (this.isAlreadyApplied(rebuiltSnap, events, req)) {
        return 'already_applied';
      }
      this.assertTransitionAllowed(rebuiltSnap, meta, req, eventType);
      return 'allowed';
    }

    const replayFromEvents = await this.shouldReplayFromEvents(meta);
    if (!replayFromEvents) {
      if (this.isAlreadyAppliedFromSnapshot(storedSnap, req)) {
        return 'already_applied';
      }
      this.assertTransitionAllowed(storedSnap, meta, req, eventType);
      return 'allowed';
    }

    const events = await this.deps.stateStoreRead.listEvents(meta.tenantId, meta.runId);
    const rebuiltSnap = this.rebuildWorkflowSnapshot(meta.runId, events);
    if (this.isAlreadyApplied(rebuiltSnap, events, req)) {
      return 'already_applied';
    }
    this.assertTransitionAllowed(rebuiltSnap, meta, req, eventType);
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
    const lastPauseResumeEvent = this.lastPauseResumeEventType(events);

    if (req.type === 'PAUSE') {
      if (snapshot.status === 'PAUSED' || snapshot.paused) {
        return true;
      }
      return (
        snapshot.status === 'RUNNING' && !snapshot.paused && lastPauseResumeEvent === 'RunPaused'
      );
    }

    if (req.type === 'RESUME') {
      if (
        snapshot.status === 'PAUSED' &&
        snapshot.paused &&
        lastPauseResumeEvent === 'RunResumed'
      ) {
        return true;
      }
      return (
        snapshot.status === 'RUNNING' && !snapshot.paused && lastPauseResumeEvent === 'RunResumed'
      );
    }

    return false;
  }

  private isAlreadyAppliedFromSnapshot(snapshot: WorkflowSnapshot, req: SignalRequest): boolean {
    if (req.type === 'PAUSE') {
      return snapshot.status === 'PAUSED' || snapshot.paused;
    }

    if (req.type === 'RESUME') {
      return snapshot.status === 'RUNNING' && !snapshot.paused;
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

  private assertTransitionAllowed(
    snapshot: WorkflowSnapshot,
    meta: RunMetadata,
    req: SignalRequest,
    eventType: GuardedRunEventType
  ): void {
    const transientSnap = cloneWorkflowSnapshot(snapshot);
    // Validation-only simulation: the engine no longer persists pause/resume
    // realized lifecycle events, but it still validates whether the transition
    // would be legal if the runtime later realized it.
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

  private async shouldReplayFromEvents(meta: RunMetadata): Promise<boolean> {
    if (!hasSnapshotStalenessQuery(this.deps.stateStoreRead)) {
      return true;
    }
    return this.deps.stateStoreRead.isSnapshotStale(meta.tenantId, meta.runId);
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

function hasSnapshotStalenessQuery(
  stateStoreRead: IRunStateStoreRead
): stateStoreRead is IRunStateStoreRead & IRunSnapshotStalenessQuery {
  return (
    typeof (stateStoreRead as Partial<IRunSnapshotStalenessQuery>).isSnapshotStale === 'function'
  );
}
