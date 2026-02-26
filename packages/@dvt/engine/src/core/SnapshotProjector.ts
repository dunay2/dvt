/**
 * @file packages/@dvt/engine/src/core/SnapshotProjector.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @baseline ADR-0004: Event Sourcing Strategy (Extended)
 * @baseline ADR-0007: Run Cancellation Semantics (RunCancelRequested + cancelling substatus)
 * @decision Decision — The snapshot projection is derived exclusively from events for deterministic state reads
 * @consequence getRunStatus and incremental stores reuse the same replay semantics without duplicating rules
 * @version 1.1.0
 * @date 2026-02-21
 */
import { jcsCanonicalize, sha256Hex } from '@dvt/canonical';
import type { RunStatusSnapshot } from '@dvt/contracts';

import type { EventEnvelope, WorkflowSnapshot } from '../contracts/runEvents.js';

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
    case 'RunCancelRequested':
      // ADR-0007: Engine emits RunCancelRequested (intent only). Run stays RUNNING.
      // Adapter emits RunCancelled from workflow context when cancellation completes.
      snap.cancelling = true;
      break;
    case 'RunCancelled':
      snap.status = 'CANCELLED';
      snap.cancelling = false;
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

      const decision = extractGatewayDecision(e);
      if (decision !== undefined) {
        if (!snap.gatewayDecisions) {
          snap.gatewayDecisions = {};
        }
        snap.gatewayDecisions[stepId] = decision;
      }
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

function extractGatewayDecision(e: EventEnvelope): boolean | undefined {
  const payload = e.payload;
  if (!payload || typeof payload !== 'object') {
    return undefined;
  }

  const maybeDecision = (payload as Record<string, unknown>)['gatewayDecision'];
  return typeof maybeDecision === 'boolean' ? maybeDecision : undefined;
}
