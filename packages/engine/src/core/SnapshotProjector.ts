import type { RunStatusSnapshot } from '@dvt/contracts';

import type { EventEnvelope, WorkflowSnapshot } from '../contracts/runEvents.js';
import { jcsCanonicalize } from '../utils/jcs.js';
import { sha256Hex } from '../utils/sha256.js';

export class SnapshotProjector {
  rebuild(runId: string, events: EventEnvelope[]): RunStatusSnapshot {
    const snap: WorkflowSnapshot = {
      runId,
      status: 'PENDING',
      paused: false,
      steps: {},
    };

    for (const e of events) {
      applyEvent(snap, e);
    }

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
}

function applyEvent(snap: WorkflowSnapshot, e: EventEnvelope): void {
  switch (e.eventType) {
    case 'RunQueued':
      // stays pending
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
      // In Phase 1 we leave run status updates to RunFailed event.
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
}
