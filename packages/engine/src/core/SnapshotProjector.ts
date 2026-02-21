import type { RunStatusSnapshot } from '@dvt/contracts';

import type { EventEnvelope, WorkflowSnapshot } from '../contracts/runEvents.js';
import { jcsCanonicalize } from '../utils/jcs.js';
import { sha256Hex } from '../utils/sha256.js';

/**
 * Pure function: applies a single event to a mutable WorkflowSnapshot.
 *
 * Exported so state store implementations can incrementally maintain a
 * materialized snapshot without depending on SnapshotProjector as a class.
 * Must remain a pure value transform — no I/O, no side effects.
 */
export function applyRunEvent(snap: WorkflowSnapshot, e: EventEnvelope): WorkflowSnapshot {
  switch (e.eventType) {
    case 'RunQueued':
      // stays PENDING
      break;
    case 'RunStarted':
      snap.status = 'RUNNING';
      snap.startedAt = snap.startedAt ?? e.emittedAt;
      break;
    case 'RunPaused':
      snap.status = 'PAUSED';
      snap.paused = true;
      break;
    case 'RunResumed':
      snap.status = 'RUNNING';
      snap.paused = false;
      break;
    case 'RunCancelled':
      snap.status = 'CANCELLED';
      snap.completedAt = e.emittedAt;
      break;
    case 'RunCompleted':
      snap.status = 'COMPLETED';
      snap.completedAt = e.emittedAt;
      break;
    case 'RunFailed':
      snap.status = 'FAILED';
      snap.completedAt = e.emittedAt;
      break;
    case 'StepStarted': {
      const stepId = (e as { stepId: string }).stepId;
      const s = snap.steps[stepId] ?? { status: 'PENDING', attempts: 0 };
      s.status = 'RUNNING';
      s.startedAt = s.startedAt ?? e.emittedAt;
      s.attempts += 1;
      snap.steps[stepId] = s;
      break;
    }
    case 'StepCompleted': {
      const stepId = (e as { stepId: string }).stepId;
      const s = snap.steps[stepId] ?? { status: 'PENDING', attempts: 0 };
      s.status = 'COMPLETED';
      s.completedAt = e.emittedAt;
      snap.steps[stepId] = s;
      break;
    }
    case 'StepFailed': {
      const stepId = (e as { stepId: string }).stepId;
      const s = snap.steps[stepId] ?? { status: 'PENDING', attempts: 0 };
      s.status = 'FAILED';
      s.completedAt = e.emittedAt;
      snap.steps[stepId] = s;
      break;
    }
    case 'StepSkipped': {
      const stepId = (e as { stepId: string }).stepId;
      const s = snap.steps[stepId] ?? { status: 'PENDING', attempts: 0 };
      s.status = 'SKIPPED';
      s.completedAt = e.emittedAt;
      snap.steps[stepId] = s;
      break;
    }
    default: {
      // Forward-compatibility: tolerate unknown event types without mutating state.
      console.warn('SnapshotProjector: unknown eventType skipped', {
        eventType: (e as { eventType: string }).eventType,
        runId: snap.runId,
        runSeq: (e as { runSeq?: number }).runSeq,
      });
      break;
    }
  }
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
    startedAt: snap.startedAt,
    completedAt: snap.completedAt,
    steps: snap.steps,
  };

  const canonical = jcsCanonicalize(logical);
  const hash = sha256Hex(canonical);

  return {
    runId: snap.runId,
    status: snap.status,
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
      steps: {},
    };

    for (const e of events) {
      applyRunEvent(snap, e);
    }

    return snapshotToStatus(snap);
  }
}
