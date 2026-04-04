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
import type { RunStatusSnapshot } from '@dvt/contracts';
import { jcsCanonicalize, sha256Hex } from '@dvt/crypto';
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
 * Pure function: converts a materialized WorkflowSnapshot into a RunStatusSnapshot
 * (adds the deterministic JCS+SHA-256 hash).
 *
 * Exported so WorkflowEngine.getRunStatus can produce its response from a
 * stored snapshot without a full event replay.
 */
export function snapshotToStatus(snap: WorkflowSnapshot): RunStatusSnapshot {
  const logical = {
    runId: snap.runId,
    status: snap.status,
    paused: snap.paused,
    cancelling: snap.cancelling,
    startedAt: snap.startedAt,
    completedAt: snap.completedAt,
    gatewayDecisions: snap.gatewayDecisions,
    steps: snap.steps,
  };

  const canonical = jcsCanonicalize(logical);
  const hash = sha256Hex(canonical);

  return {
    runId: snap.runId,
    status: snap.status,
    ...(snap.cancelling ? { substatus: 'CANCELLING' as const } : {}),
    ...(snap.startedAt ? { startedAt: snap.startedAt } : {}),
    ...(snap.completedAt ? { completedAt: snap.completedAt } : {}),
    hash,
  };
}

export class SnapshotProjector {
  rebuild(runId: string, events: EventEnvelope[]): RunStatusSnapshot {
    const snap: WorkflowSnapshot = {
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
