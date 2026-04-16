/**
 * @file packages/@dvt/run-domain/src/mapEventEnvelopeToProjectableEvent.ts
 * @baseline ADR-0004: Event Sourcing Strategy (Extended)
 * @decision Raw event envelopes are normalized into projector-specific domain events before snapshot mutation.
 * @consequence Payload parsing stays outside the projector and contracts remain the source of validation truth.
 * @version 1.0.0
 * @date 2026-04-08
 */
import {
  MaterializationEvidenceSchema,
  asNonBlankString,
  asStepId,
  type EventEnvelope,
  type IsoUtcString,
  type MaterializationEvidence,
  type NonBlankString,
  type RunFailureEvidence,
  type StepId,
} from '@dvt/contracts';

import { InvalidRunEventShapeError } from './errors.js';

type RunEventKind =
  | 'RunQueued'
  | 'RunStarted'
  | 'RunPaused'
  | 'RunResumed'
  | 'RunCancelRequested'
  | 'RunCancelled'
  | 'RunCompleted'
  | 'RunFailed';

type ProjectableRunLifecycleEvent<Kind extends RunEventKind> = {
  kind: Kind;
  emittedAt: IsoUtcString;
};

type ProjectableStepStartedEvent = {
  kind: 'StepStarted';
  emittedAt: IsoUtcString;
  stepId: StepId;
};

type ProjectableStepCompletedEvent = {
  kind: 'StepCompleted';
  emittedAt: IsoUtcString;
  stepId: StepId;
  gatewayDecision?: boolean;
  materialization?: MaterializationEvidence;
};

type ProjectableStepFailedEvent = {
  kind: 'StepFailed';
  emittedAt: IsoUtcString;
  stepId: StepId;
  failure: RunFailureEvidence;
};

type ProjectableStepSkippedEvent = {
  kind: 'StepSkipped';
  emittedAt: IsoUtcString;
  stepId: StepId;
};

export type ProjectableRunEvent =
  | ProjectableRunLifecycleEvent<'RunQueued'>
  | ProjectableRunLifecycleEvent<'RunStarted'>
  | ProjectableRunLifecycleEvent<'RunPaused'>
  | ProjectableRunLifecycleEvent<'RunResumed'>
  | ProjectableRunLifecycleEvent<'RunCancelRequested'>
  | ProjectableRunLifecycleEvent<'RunCancelled'>
  | ProjectableRunLifecycleEvent<'RunCompleted'>
  | ProjectableRunLifecycleEvent<'RunFailed'>
  | ProjectableStepStartedEvent
  | ProjectableStepCompletedEvent
  | ProjectableStepFailedEvent
  | ProjectableStepSkippedEvent;

export function mapEventEnvelopeToProjectableEvent(
  event: EventEnvelope
): ProjectableRunEvent | null {
  switch (event.eventType) {
    case 'RunQueued':
    case 'RunStarted':
    case 'RunPaused':
    case 'RunResumed':
    case 'RunCancelRequested':
    case 'RunCancelled':
    case 'RunCompleted':
    case 'RunFailed':
      return {
        kind: event.eventType,
        emittedAt: event.emittedAt,
      };

    case 'StepStarted':
      return {
        kind: 'StepStarted',
        emittedAt: event.emittedAt,
        stepId: requireStepId(event),
      };

    case 'StepCompleted': {
      const payload = asRecord(event.payload);
      const materialization =
        readMaterializationEvidence(payload?.['resultEvidence']) ??
        readMaterializationEvidence(payload?.['materialization']);
      return {
        kind: 'StepCompleted',
        emittedAt: event.emittedAt,
        stepId: requireStepId(event),
        ...(typeof payload?.['gatewayDecision'] === 'boolean'
          ? { gatewayDecision: payload['gatewayDecision'] }
          : {}),
        ...(materialization ? { materialization } : {}),
      };
    }

    case 'StepFailed': {
      const stepId = requireStepId(event);
      return {
        kind: 'StepFailed',
        emittedAt: event.emittedAt,
        stepId,
        failure: readFailureEvidence(event, stepId),
      };
    }

    case 'StepSkipped':
      return {
        kind: 'StepSkipped',
        emittedAt: event.emittedAt,
        stepId: requireStepId(event),
      };

    default:
      return null;
  }
}

function requireStepId(event: EventEnvelope): StepId {
  const rawStepId = (event as { stepId?: unknown }).stepId;
  if (typeof rawStepId !== 'string') {
    throw new InvalidRunEventShapeError({
      runId: event.runId,
      eventType: event.eventType,
      reason: 'stepId must be a non-blank string for step events',
    });
  }

  try {
    return asStepId(rawStepId);
  } catch {
    throw new InvalidRunEventShapeError({
      runId: event.runId,
      eventType: event.eventType,
      reason: 'stepId must be a non-blank string for step events',
    });
  }
}

function readMaterializationEvidence(value: unknown): MaterializationEvidence | undefined {
  const parsed = MaterializationEvidenceSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

function readFailureEvidence(event: EventEnvelope, stepId: StepId): RunFailureEvidence {
  const payload = asRecord(event.payload);
  const reason = readOptionalFailureText(event, payload?.['reason'], 'reason');
  const message = readOptionalFailureText(event, payload?.['message'], 'message');
  return {
    stepId,
    failedAt: event.emittedAt,
    ...(reason ? { reason } : {}),
    ...(message ? { message } : {}),
  };
}

function readOptionalFailureText(
  event: EventEnvelope,
  value: unknown,
  field: 'reason' | 'message'
): NonBlankString | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === 'string') {
    try {
      return asNonBlankString(value);
    } catch {
      // Fall through to canonical error below.
    }
  }

  throw new InvalidRunEventShapeError({
    runId: event.runId,
    eventType: event.eventType,
    reason: `payload.${field} must be a non-blank string when provided`,
  });
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : undefined;
}
