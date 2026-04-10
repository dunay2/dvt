/**
 * @file packages/@dvt/run-domain/src/applyRunEvent.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @baseline ADR-0004: Event Sourcing Strategy (Extended)
 * @baseline ADR-0007: Run Cancellation Semantics
 * @decision Canonical run projection delegates envelope normalization to a mapper and mutates snapshots through focused handlers.
 * @consequence Transition rules, payload normalization, and snapshot mutation no longer share one procedural blob.
 * @version 1.0.0
 * @date 2026-04-08
 */
import type { EventEnvelope, IsoUtcString, StepId, WorkflowSnapshot } from '@dvt/contracts';

import { InvalidStateTransitionError } from './errors.js';
import {
  mapEventEnvelopeToProjectableEvent,
  type ProjectableRunEvent,
} from './mapEventEnvelopeToProjectableEvent.js';
import {
  RUN_EVENT_ALLOWED_FROM,
  STEP_EVENT_ALLOWED_FROM,
  TERMINAL_RUN_STATUSES,
  TERMINAL_STEP_STATUSES,
} from './transitionPolicy.js';

type StepSnapshot = WorkflowSnapshot['steps'][string];
type StepStatus = WorkflowSnapshot['steps'][string]['status'];
type ProjectionHandler<Kind extends ProjectableRunEvent['kind']> = (
  snap: WorkflowSnapshot,
  event: Extract<ProjectableRunEvent, { kind: Kind }>
) => void;
type ProjectionHandlerMap = {
  [Kind in ProjectableRunEvent['kind']]: ProjectionHandler<Kind>;
};

const PROJECTION_HANDLERS: ProjectionHandlerMap = {
  RunQueued: (_snap, _event) => {
    // Deliberate no-op: queue admission is already represented by the
    // bootstrapped pre-start snapshot state.
  },
  RunStarted: (snap, event) => {
    assertRunNotTerminal(snap, event.kind);
    snap.status = 'RUNNING';
    snap.startedAt = snap.startedAt ?? event.emittedAt;
  },
  RunPaused: (snap, event) => {
    assertRunNotTerminal(snap, event.kind);
    assertRunStatusIn(snap, event.kind, RUN_EVENT_ALLOWED_FROM.RunPaused);
    snap.status = 'PAUSED';
    snap.paused = true;
  },
  RunResumed: (snap, event) => {
    assertRunNotTerminal(snap, event.kind);
    assertRunStatusIn(snap, event.kind, RUN_EVENT_ALLOWED_FROM.RunResumed);
    snap.status = 'RUNNING';
    snap.paused = false;
  },
  RunCancelRequested: (snap, event) => {
    assertRunNotTerminal(snap, event.kind);
    assertRunStatusIn(snap, event.kind, RUN_EVENT_ALLOWED_FROM.RunCancelRequested);
    snap.cancelling = true;
  },
  RunCancelled: (snap, event) => {
    assertRunNotTerminal(snap, event.kind);
    if (!snap.cancelling) {
      throw new InvalidStateTransitionError({
        runId: snap.runId,
        fromStatus: snap.status,
        eventType: event.kind,
      });
    }
    snap.status = 'CANCELLED';
    snap.cancelling = false;
    clearActiveStep(snap);
    snap.completedAt = event.emittedAt;
  },
  RunCompleted: (snap, event) => {
    assertRunNotTerminal(snap, event.kind);
    snap.status = 'COMPLETED';
    clearActiveStep(snap);
    snap.completedAt = event.emittedAt;
  },
  RunFailed: (snap, event) => {
    assertRunNotTerminal(snap, event.kind);
    snap.status = 'FAILED';
    clearActiveStep(snap);
    snap.completedAt = event.emittedAt;
  },
  StepStarted: (snap, event) => {
    applyStepTransition(snap, event, STEP_EVENT_ALLOWED_FROM.StepStarted, (step, emittedAt) => {
      step.status = 'RUNNING';
      step.startedAt = step.startedAt ?? emittedAt;
      step.attempts += 1;
    });
    setActiveStep(snap, event.stepId);
  },
  StepCompleted: (snap, event) => {
    applyStepTransition(snap, event, STEP_EVENT_ALLOWED_FROM.StepCompleted, (step, emittedAt) => {
      step.status = 'COMPLETED';
      step.completedAt = emittedAt;
    });
    if (event.gatewayDecision !== undefined) {
      snap.gatewayDecisions ??= {};
      snap.gatewayDecisions[event.stepId] = event.gatewayDecision;
    }
    clearActiveStepIfMatches(snap, event.stepId);
    if (event.materialization !== undefined) {
      setMaterializationEvidence(snap, event.materialization);
    }
  },
  StepFailed: (snap, event) => {
    applyStepTransition(snap, event, STEP_EVENT_ALLOWED_FROM.StepFailed, (step, emittedAt) => {
      step.status = 'FAILED';
      step.completedAt = emittedAt;
    });
    setFailureEvidence(snap, event.failure);
  },
  StepSkipped: (snap, event) => {
    applyStepTransition(snap, event, STEP_EVENT_ALLOWED_FROM.StepSkipped, (step, emittedAt) => {
      step.status = 'SKIPPED';
      step.completedAt = emittedAt;
    });
    clearActiveStepIfMatches(snap, event.stepId);
  },
} satisfies ProjectionHandlerMap;

export function applyRunEvent(snap: WorkflowSnapshot, eventEnvelope: EventEnvelope): void {
  const event = mapEventEnvelopeToProjectableEvent(eventEnvelope);
  if (!event) {
    return;
  }

  const handler = PROJECTION_HANDLERS[event.kind] as (
    snapshot: WorkflowSnapshot,
    projectableEvent: ProjectableRunEvent
  ) => void;
  handler(snap, event);
}

function applyStepTransition(
  snap: WorkflowSnapshot,
  event: Extract<ProjectableRunEvent, { stepId: StepId }>,
  allowedStatuses: StepStatus[],
  mutator: (step: StepSnapshot, emittedAt: IsoUtcString) => void
): void {
  assertStepNotTerminal(snap, event.stepId, event.kind);
  const step = snap.steps[event.stepId] ?? { status: 'PENDING', attempts: 0 };
  assertStepStatusIn(snap, event.stepId, event.kind, step.status, allowedStatuses);
  mutator(step, event.emittedAt);
  snap.steps[event.stepId] = step;
}

function ensureExecutionEvidence(
  snap: WorkflowSnapshot
): NonNullable<WorkflowSnapshot['execution']> {
  snap.execution ??= {};
  return snap.execution;
}

function trimExecutionEvidence(snap: WorkflowSnapshot): void {
  const execution = snap.execution;
  if (!execution) {
    return;
  }

  if (
    execution.activeStepId === undefined &&
    execution.failure === undefined &&
    execution.materialization === undefined
  ) {
    delete snap.execution;
  }
}

function setActiveStep(snap: WorkflowSnapshot, stepId: StepId): void {
  const execution = ensureExecutionEvidence(snap);
  execution.activeStepId = stepId;
  delete execution.failure;
  trimExecutionEvidence(snap);
}

function clearActiveStep(snap: WorkflowSnapshot): void {
  if (snap.execution?.activeStepId !== undefined) {
    delete snap.execution.activeStepId;
    trimExecutionEvidence(snap);
  }
}

function clearActiveStepIfMatches(snap: WorkflowSnapshot, stepId: StepId): void {
  if (snap.execution?.activeStepId === stepId) {
    delete snap.execution.activeStepId;
    trimExecutionEvidence(snap);
  }
}

function setFailureEvidence(
  snap: WorkflowSnapshot,
  failure: NonNullable<NonNullable<WorkflowSnapshot['execution']>['failure']>
): void {
  const execution = ensureExecutionEvidence(snap);
  delete execution.activeStepId;
  execution.failure = failure;
}

function setMaterializationEvidence(
  snap: WorkflowSnapshot,
  materialization: NonNullable<NonNullable<WorkflowSnapshot['execution']>['materialization']>
): void {
  const execution = ensureExecutionEvidence(snap);
  execution.materialization = materialization;
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

function assertStepNotTerminal(snap: WorkflowSnapshot, stepId: StepId, eventType: string): void {
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
  stepId: StepId,
  eventType: string,
  currentStatus: StepStatus,
  allowedStatuses: StepStatus[]
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
