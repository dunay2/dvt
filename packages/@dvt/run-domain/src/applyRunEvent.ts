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
import {
  RUN_EVENT_ALLOWED_FROM,
  STEP_EVENT_ALLOWED_FROM,
  TERMINAL_RUN_STATUSES,
  TERMINAL_STEP_STATUSES,
} from './transitionPolicy.js';

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
      assertRunStatusIn(snap, e.eventType, RUN_EVENT_ALLOWED_FROM.RunPaused ?? ['RUNNING']);
      snap.status = 'PAUSED';
      snap.paused = true;
      break;

    case 'RunResumed':
      assertRunNotTerminal(snap, e.eventType);
      assertRunStatusIn(snap, e.eventType, RUN_EVENT_ALLOWED_FROM.RunResumed ?? ['PAUSED']);
      snap.status = 'RUNNING';
      snap.paused = false;
      break;

    case 'RunCancelRequested':
      assertRunNotTerminal(snap, e.eventType);
      assertRunStatusIn(
        snap,
        e.eventType,
        RUN_EVENT_ALLOWED_FROM.RunCancelRequested ?? ['RUNNING', 'PAUSED']
      );
      snap.cancelling = true;
      break;

    case 'RunCancelled':
      assertRunNotTerminal(snap, e.eventType);
      if (!snap.cancelling) {
        throw new InvalidStateTransitionError({
          runId: snap.runId,
          fromStatus: snap.status,
          eventType: e.eventType,
        });
      }
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
      assertStepStatusIn(
        snap,
        stepId,
        e.eventType,
        s.status,
        STEP_EVENT_ALLOWED_FROM.StepStarted ?? ['PENDING', 'FAILED']
      );
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
      assertStepStatusIn(
        snap,
        stepId,
        e.eventType,
        s.status,
        STEP_EVENT_ALLOWED_FROM.StepCompleted ?? ['RUNNING']
      );
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
      assertStepStatusIn(
        snap,
        stepId,
        e.eventType,
        s.status,
        STEP_EVENT_ALLOWED_FROM.StepFailed ?? ['RUNNING']
      );
      s.status = 'FAILED';
      s.completedAt = e.emittedAt;
      snap.steps[stepId] = s;
      break;
    }

    case 'StepSkipped': {
      const stepId = (e as EventEnvelope & { stepId: string }).stepId;
      assertStepNotTerminal(snap, stepId, e.eventType);
      const s = snap.steps[stepId] ?? { status: 'PENDING', attempts: 0 };
      assertStepStatusIn(
        snap,
        stepId,
        e.eventType,
        s.status,
        STEP_EVENT_ALLOWED_FROM.StepSkipped ?? ['PENDING']
      );
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
    throw new InvalidStateTransitionError({
      runId: snap.runId,
      fromStatus: snap.status,
      eventType,
    });
  }
}

function assertStepNotTerminal(snap: WorkflowSnapshot, stepId: string, eventType: string): void {
  const step = snap.steps[stepId];
  if (step !== undefined && TERMINAL_STEP_STATUSES.has(step.status)) {
    throw new InvalidStateTransitionError({
      runId: snap.runId,
      fromStatus: step.status,
      eventType,
      stepId,
    });
  }
}

function assertRunStatusIn(
  snap: WorkflowSnapshot,
  eventType: string,
  allowedStatuses: WorkflowSnapshot['status'][]
): void {
  if (allowedStatuses.includes(snap.status)) {
    return;
  }
  throw new InvalidStateTransitionError({
    runId: snap.runId,
    fromStatus: snap.status,
    eventType,
  });
}

function assertStepStatusIn(
  snap: WorkflowSnapshot,
  stepId: string,
  eventType: string,
  currentStatus: WorkflowSnapshot['steps'][string]['status'],
  allowedStatuses: WorkflowSnapshot['steps'][string]['status'][]
): void {
  if (allowedStatuses.includes(currentStatus)) {
    return;
  }
  throw new InvalidStateTransitionError({
    runId: snap.runId,
    fromStatus: currentStatus,
    eventType,
    stepId,
  });
}

function extractGatewayDecision(e: EventEnvelope): boolean | undefined {
  const payload = e.payload;
  if (!payload || typeof payload !== 'object') {
    return undefined;
  }

  const maybeDecision = (payload as Record<string, unknown>)['gatewayDecision'];
  return typeof maybeDecision === 'boolean' ? maybeDecision : undefined;
}
