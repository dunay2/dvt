import { randomUUID } from 'node:crypto';

import type { SignalRequest } from '@dvt/contracts';

import type { EventType } from '../contracts/runEvents.js';
import { sha256Hex } from '../utils/sha256.js';

export interface EventIdempotencyInput {
  eventType: EventType;
  runId: string;
  logicalAttemptId: number;
  planId: string;
  planVersion: string;
  stepId?: string;
}

/**
 * Idempotency keys MUST derive from logicalAttemptId (not engineAttemptId).
 * This builder is deterministic and stable.
 */
export class IdempotencyKeyBuilder {
  runEventKey(e: EventIdempotencyInput): string {
    const logicalAttemptId = normalizeLogicalAttemptId(e.logicalAttemptId);
    const stepIdNormalized = normalizeStepId(e.eventType, e.stepId);
    const preimage = [
      e.runId,
      stepIdNormalized,
      logicalAttemptId,
      e.eventType,
      e.planId,
      e.planVersion,
    ].join('|');

    return sha256Hex(preimage);
  }

  signalKey(tenantId: string, runId: string, req: SignalRequest): string {
    // Contract: (tenantId, runId, signalId)
    return ['sig', tenantId, runId, req.signalId].join('|');
  }

  eventId(): string {
    return randomUUID();
  }
}

function isStepEventType(t: EventType): boolean {
  return t === 'StepStarted' || t === 'StepCompleted' || t === 'StepFailed' || t === 'StepSkipped';
}

function normalizeLogicalAttemptId(value: number): string {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`IdempotencyKeyBuilder: logicalAttemptId invalid: ${value}`);
  }
  return String(value);
}

function normalizeStepId(eventType: EventType, stepId?: string): string {
  if (!isStepEventType(eventType)) return 'RUN';

  if (!stepId) {
    throw new Error(`IdempotencyKeyBuilder: stepId required for ${eventType}`);
  }
  return stepId;
}
