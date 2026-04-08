/**
 * @file packages/@dvt/engine/src/core/SnapshotProjector.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @baseline ADR-0004: Event Sourcing Strategy (Extended)
 * @baseline ADR-0007: Run Cancellation Semantics (RunCancelRequested + cancelling substatus)
 * @decision The snapshot projection is derived exclusively from events for deterministic state reads
 * @consequence getRunStatus and incremental stores reuse the same replay semantics without duplicating rules
 * @version 1.1.0
 * @date 2026-02-21
 */
import { CURRENT_WORKFLOW_SNAPSHOT_SCHEMA_VERSION, type RunStatusSnapshot } from '@dvt/contracts';
import { applyRunEvent as applyCanonicalRunEvent } from '@dvt/run-domain';

import type { EventEnvelope, WorkflowSnapshot } from '../contracts/runEvents.js';

/**
 * Pure function: applies a single event to a mutable WorkflowSnapshot.
 *
 * Exported so state store implementations can incrementally maintain a
 * materialized snapshot without depending on SnapshotProjector as a class.
 * Must remain a pure value transform — no I/O, no side effects.
 *
 * Throws `InvalidStateTransitionError` when an event targets a run or step
 * already in a terminal status. This surfaces upstream bugs (duplicate events,
 * out-of-order delivery) instead of silently corrupting the snapshot.
 */
export function applyRunEvent(snap: WorkflowSnapshot, e: EventEnvelope): WorkflowSnapshot {
  applyCanonicalRunEvent(snap, e);
  return snap;
}

/**
 * Pure function: converts a materialized WorkflowSnapshot into a RunStatusSnapshot.
 *
 * Exported so WorkflowEngine.getRunStatus can produce its response from a
 * stored snapshot without a full event replay.
 */
export function snapshotToStatus(snap: WorkflowSnapshot): RunStatusSnapshot {
  return {
    runId: snap.runId,
    status: snap.status,
    ...(snap.cancelling ? { substatus: 'CANCELLING' as const } : {}),
    ...(snap.startedAt ? { startedAt: snap.startedAt } : {}),
    ...(snap.completedAt ? { completedAt: snap.completedAt } : {}),
    ...(snap.currentStepId ? { currentStepId: snap.currentStepId } : {}),
    ...(snap.failedStepId ? { failedStepId: snap.failedStepId } : {}),
    ...(snap.errorReason ? { errorReason: snap.errorReason } : {}),
    ...(snap.materialization ? { materialization: snap.materialization } : {}),
  };
}

export class SnapshotProjector {
  rebuild(runId: string, events: EventEnvelope[]): RunStatusSnapshot {
    const snap: WorkflowSnapshot = {
      schemaVersion: CURRENT_WORKFLOW_SNAPSHOT_SCHEMA_VERSION,
      runId,
      status: 'PENDING',
      paused: false,
      cancelling: false,
      gatewayDecisions: {},
      steps: {},
    };

    for (const e of events) {
      applyRunEvent(snap, e);
    }

    return snapshotToStatus(snap);
  }
}
