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
  RunFailureEvidenceSchema,
  type EventEnvelope,
  type MaterializationEvidence,
  type RunFailureEvidence,
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
  emittedAt: string;
};

type ProjectableStepStartedEvent = {
  kind: 'StepStarted';
  emittedAt: string;
  stepId: string;
};

type ProjectableStepCompletedEvent = {
  kind: 'StepCompleted';
  emittedAt: string;
  stepId: string;
  gatewayDecision?: boolean;
  materialization?: MaterializationEvidence;
};

type ProjectableStepFailedEvent = {
  kind: 'StepFailed';
  emittedAt: string;
  stepId: string;
  failure: RunFailureEvidence;
};

type ProjectableStepSkippedEvent = {
  kind: 'StepSkipped';
  emittedAt: string;
  stepId: string;
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
      const materialization = readMaterializationEvidence(payload?.['materialization']);
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
        failure: readFailureEvidence(event.payload, stepId, event.emittedAt),
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

function requireStepId(event: EventEnvelope): string {
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

function readMaterializationEvidence(value: unknown): MaterializationEvidence | undefined {
  const parsed = MaterializationEvidenceSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

function readFailureEvidence(
  value: unknown,
  stepId: string,
  emittedAt: string
): RunFailureEvidence {
  const payload = asRecord(value);
  const failedAt = asNonBlankString(payload?.['failedAt']) ?? emittedAt;
  const reason = asNonBlankString(payload?.['reason']);
  const message = asNonBlankString(payload?.['message']);
  const candidate = {
    stepId,
    failedAt,
    ...(reason ? { reason } : {}),
    ...(message ? { message } : {}),
  };

  const parsed = RunFailureEvidenceSchema.safeParse(candidate);
  if (parsed.success) {
    return {
      stepId: parsed.data.stepId,
      failedAt: parsed.data.failedAt,
      ...(parsed.data.reason !== undefined ? { reason: parsed.data.reason } : {}),
      ...(parsed.data.message !== undefined ? { message: parsed.data.message } : {}),
    };
  }

  return {
    stepId,
    failedAt: emittedAt,
  };
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : undefined;
}

function asNonBlankString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}
