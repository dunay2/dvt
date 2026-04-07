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

import { InvalidRunEventShapeError, InvalidStateTransitionError } from './errors.js';
import {
  RUN_EVENT_ALLOWED_FROM,
  STEP_EVENT_ALLOWED_FROM,
  TERMINAL_RUN_STATUSES,
  TERMINAL_STEP_STATUSES,
} from './transitionPolicy.js';

type StepSnapshot = WorkflowSnapshot['steps'][string];

export function applyRunEvent(snap: WorkflowSnapshot, e: EventEnvelope): void {
  switch (e.eventType) {
    case 'RunQueued':
      // Deliberate no-op: queue admission is already represented by the bootstrapped
      // pre-start snapshot state. The event still remains authoritative lifecycle evidence.
      break;

    case 'RunStarted':
      assertRunNotTerminal(snap, e.eventType);
      snap.status = 'RUNNING';
      snap.startedAt = snap.startedAt ?? e.emittedAt;
      break;

    case 'RunPaused':
      assertRunNotTerminal(snap, e.eventType);
      assertRunStatusIn(snap, e.eventType, RUN_EVENT_ALLOWED_FROM.RunPaused);
      snap.status = 'PAUSED';
      snap.paused = true;
      break;

    case 'RunResumed':
      assertRunNotTerminal(snap, e.eventType);
      assertRunStatusIn(snap, e.eventType, RUN_EVENT_ALLOWED_FROM.RunResumed);
      snap.status = 'RUNNING';
      snap.paused = false;
      break;

    case 'RunCancelRequested':
      assertRunNotTerminal(snap, e.eventType);
      assertRunStatusIn(snap, e.eventType, RUN_EVENT_ALLOWED_FROM.RunCancelRequested);
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
      applyStepTransition(snap, e, STEP_EVENT_ALLOWED_FROM.StepStarted, (step, emittedAt) => {
        step.status = 'RUNNING';
        step.startedAt = step.startedAt ?? emittedAt;
        step.attempts += 1;
      });
      break;
    }

    case 'StepCompleted': {
      applyStepTransition(snap, e, STEP_EVENT_ALLOWED_FROM.StepCompleted, (step, emittedAt) => {
        step.status = 'COMPLETED';
        step.completedAt = emittedAt;
      });
      const stepId = getStepId(e);
      const decision = extractGatewayDecision(e);
      if (decision !== undefined) {
        snap.gatewayDecisions ??= {};
        snap.gatewayDecisions[stepId] = decision;
      }
      break;
    }

    case 'StepFailed': {
      applyStepTransition(snap, e, STEP_EVENT_ALLOWED_FROM.StepFailed, (step, emittedAt) => {
        step.status = 'FAILED';
        step.completedAt = emittedAt;
      });
      break;
    }

    case 'StepSkipped': {
      applyStepTransition(snap, e, STEP_EVENT_ALLOWED_FROM.StepSkipped, (step, emittedAt) => {
        step.status = 'SKIPPED';
        step.completedAt = emittedAt;
      });
      break;
    }

    default:
      break;
  }
}

function applyStepTransition(
  snap: WorkflowSnapshot,
  event: EventEnvelope,
  allowedStatuses: WorkflowSnapshot['steps'][string]['status'][],
  mutator: (step: StepSnapshot, emittedAt: string) => void
): void {
  const stepId = getStepId(event);
  assertStepNotTerminal(snap, stepId, event.eventType);
  const step = snap.steps[stepId] ?? { status: 'PENDING', attempts: 0 };
  assertStepStatusIn(snap, stepId, event.eventType, step.status, allowedStatuses);
  mutator(step, event.emittedAt);
  snap.steps[stepId] = step;
}

function getStepId(event: EventEnvelope): string {
  const maybeStepId = (event as { stepId?: unknown }).stepId;
  if (typeof maybeStepId === 'string' && maybeStepId.length > 0) {
    return maybeStepId;
  }
  throw new InvalidRunEventShapeError({
    runId: event.runId,
    eventType: event.eventType,
    reason: 'stepId must be a non-empty string for step events',
  });
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
