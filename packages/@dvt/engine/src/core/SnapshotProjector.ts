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
import type { RunStatusSnapshot } from '@dvt/contracts';
import { jcsCanonicalize, sha256Hex } from '@dvt/crypto';

import type { EventEnvelope, WorkflowSnapshot } from '../contracts/runEvents.js';

/**
 * Pure function: applies a single event to a mutable WorkflowSnapshot.
 *
 * Exported so state store implementations can incrementally maintain a
 * materialized snapshot without depending on SnapshotProjector as a class.
 * Must remain a pure value transform — no I/O, no side effects.
 */
export function applyRunEvent(snap: WorkflowSnapshot, e: EventEnvelope): WorkflowSnapshot {
  const handlers: Record<string, (snap: WorkflowSnapshot, e: EventEnvelope) => void> = {
    RunQueued: () => {},
    RunStarted: handleRunStarted,
    RunPaused: handleRunPaused,
    RunResumed: handleRunResumed,
    RunCancelRequested: handleRunCancelRequested,
    RunCancelled: handleRunCancelled,
    RunCompleted: handleRunCompleted,
    RunFailed: handleRunFailed,
    StepStarted: handleStepStarted,
    StepCompleted: handleStepCompleted,
    StepFailed: handleStepFailed,
    StepSkipped: handleStepSkipped,
  };

  const handler = handlers[e.eventType] ?? handleUnknownEvent;
  handler(snap, e);
  return snap;
}

function handleRunStarted(snap: WorkflowSnapshot, e: EventEnvelope): void {
  snap.status = 'RUNNING';
  snap.startedAt = snap.startedAt ?? e.emittedAt;
}

function handleRunPaused(snap: WorkflowSnapshot, _e: EventEnvelope): void {
  snap.status = 'PAUSED';
  snap.paused = true;
}

function handleRunResumed(snap: WorkflowSnapshot, _e: EventEnvelope): void {
  snap.status = 'RUNNING';
  snap.paused = false;
}

function handleRunCancelRequested(snap: WorkflowSnapshot, _e: EventEnvelope): void {
  snap.cancelling = true;
}

function handleRunCancelled(snap: WorkflowSnapshot, e: EventEnvelope): void {
  snap.status = 'CANCELLED';
  snap.cancelling = false;
  snap.completedAt = e.emittedAt;
}

function handleRunCompleted(snap: WorkflowSnapshot, e: EventEnvelope): void {
  snap.status = 'COMPLETED';
  snap.completedAt = e.emittedAt;
}

function handleRunFailed(snap: WorkflowSnapshot, e: EventEnvelope): void {
  snap.status = 'FAILED';
  snap.completedAt = e.emittedAt;
}

function handleStepStarted(snap: WorkflowSnapshot, e: EventEnvelope): void {
  const stepId = (e as { stepId: string }).stepId;
  const s = snap.steps[stepId] ?? { status: 'PENDING', attempts: 0 };
  s.status = 'RUNNING';
  s.startedAt = s.startedAt ?? e.emittedAt;
  s.attempts += 1;
  snap.steps[stepId] = s;
}

function handleStepCompleted(snap: WorkflowSnapshot, e: EventEnvelope): void {
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
}

function handleStepFailed(snap: WorkflowSnapshot, e: EventEnvelope): void {
  const stepId = (e as { stepId: string }).stepId;
  const s = snap.steps[stepId] ?? { status: 'PENDING', attempts: 0 };
  s.status = 'FAILED';
  s.completedAt = e.emittedAt;
  snap.steps[stepId] = s;
}

function handleStepSkipped(snap: WorkflowSnapshot, e: EventEnvelope): void {
  const stepId = (e as { stepId: string }).stepId;
  const s = snap.steps[stepId] ?? { status: 'PENDING', attempts: 0 };
  s.status = 'SKIPPED';
  s.completedAt = e.emittedAt;
  snap.steps[stepId] = s;
}

function handleUnknownEvent(snap: WorkflowSnapshot, e: EventEnvelope): void {
  // Forward-compatibility: tolerate unknown event types without mutating state.
  console.warn('SnapshotProjector: unknown eventType skipped', {
    eventType: (e as { eventType: string }).eventType,
    runId: snap.runId,
    runSeq: (e as { runSeq?: number }).runSeq,
  });
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
