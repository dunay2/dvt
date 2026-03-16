/**
 * @file packages/@dvt/run-domain/src/applyRunEvent.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @baseline ADR-0004: Event Sourcing Strategy (Extended)
 * @baseline ADR-0007: Run Cancellation Semantics
 * @decision Canonical pure-function event projection shared by engine and storage adapters.
 * @consequence One source of truth for run snapshot mutation rules and terminal guards.
 * @version 1.0.0
 * @date 2026-03-15
 */
import type { EventEnvelope, WorkflowSnapshot } from '@dvt/contracts';

import { InvalidStateTransitionError } from './errors.js';

const TERMINAL_RUN_STATUSES = new Set(['COMPLETED', 'FAILED', 'CANCELLED']);
const TERMINAL_STEP_STATUSES = new Set(['COMPLETED', 'SKIPPED']);

export function applyRunEvent(snap: WorkflowSnapshot, e: EventEnvelope): void {
  switch (e.eventType) {
    case 'RunQueued':
      break;

    case 'RunStarted':
      assertRunNotTerminal(snap, e.eventType);
      snap.status = 'RUNNING';
      snap.startedAt = snap.startedAt ?? e.emittedAt;
      break;

    case 'RunPaused':
      assertRunNotTerminal(snap, e.eventType);
      snap.status = 'PAUSED';
      snap.paused = true;
      break;

    case 'RunResumed':
      assertRunNotTerminal(snap, e.eventType);
      snap.status = 'RUNNING';
      snap.paused = false;
      break;

    case 'RunCancelRequested':
      assertRunNotTerminal(snap, e.eventType);
      snap.cancelling = true;
      break;

    case 'RunCancelled':
      assertRunNotTerminal(snap, e.eventType);
      snap.status = 'CANCELLED';
      snap.cancelling = false;
      snap.completedAt = e.emittedAt;
      break;

    case 'RunCompleted':
      assertRunNotTerminal(snap, e.eventType);
      snap.status = 'COMPLETED';
      snap.completedAt = e.emittedAt;
      break;

    case 'RunFailed':
      assertRunNotTerminal(snap, e.eventType);
      snap.status = 'FAILED';
      snap.completedAt = e.emittedAt;
      break;

    case 'StepStarted': {
      const stepId = (e as EventEnvelope & { stepId: string }).stepId;
      assertStepNotTerminal(snap, stepId, e.eventType);
      const s = snap.steps[stepId] ?? { status: 'PENDING', attempts: 0 };
      s.status = 'RUNNING';
      s.startedAt = s.startedAt ?? e.emittedAt;
      s.attempts += 1;
      snap.steps[stepId] = s;
      break;
    }

    case 'StepCompleted': {
      const stepId = (e as EventEnvelope & { stepId: string }).stepId;
      assertStepNotTerminal(snap, stepId, e.eventType);
      const s = snap.steps[stepId] ?? { status: 'PENDING', attempts: 0 };
      s.status = 'COMPLETED';
      s.completedAt = e.emittedAt;
      snap.steps[stepId] = s;
      const decision = extractGatewayDecision(e);
      if (decision !== undefined) {
        snap.gatewayDecisions ??= {};
        snap.gatewayDecisions[stepId] = decision;
      }
      break;
    }

    case 'StepFailed': {
      const stepId = (e as EventEnvelope & { stepId: string }).stepId;
      assertStepNotTerminal(snap, stepId, e.eventType);
      const s = snap.steps[stepId] ?? { status: 'PENDING', attempts: 0 };
      s.status = 'FAILED';
      s.completedAt = e.emittedAt;
      snap.steps[stepId] = s;
      break;
    }

    case 'StepSkipped': {
      const stepId = (e as EventEnvelope & { stepId: string }).stepId;
      assertStepNotTerminal(snap, stepId, e.eventType);
      const s = snap.steps[stepId] ?? { status: 'PENDING', attempts: 0 };
      s.status = 'SKIPPED';
      s.completedAt = e.emittedAt;
      snap.steps[stepId] = s;
      break;
    }

    default:
      break;
  }
}

function assertRunNotTerminal(snap: WorkflowSnapshot, eventType: string): void {
  if (TERMINAL_RUN_STATUSES.has(snap.status)) {
    throw new InvalidStateTransitionError(snap.runId, snap.status, eventType);
  }
}

function assertStepNotTerminal(snap: WorkflowSnapshot, stepId: string, eventType: string): void {
  const step = snap.steps[stepId];
  if (step !== undefined && TERMINAL_STEP_STATUSES.has(step.status)) {
    throw new InvalidStateTransitionError(snap.runId, step.status, eventType, stepId);
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
