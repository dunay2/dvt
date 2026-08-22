/**
 * @file packages/@dvt/engine/src/core/idempotency.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @baseline ADR-0004: Event Sourcing Strategy (Extended)
 * @decision Decision — Idempotency keys are derived from the logical identity of the event and the logical attempt
 * @consequence Prevents duplication of effects and preserves deterministic replay between storage and runtime
 * @version 1.0.0
 * @date 2026-02-21
 */
import { randomUUID } from 'node:crypto';

import type { Provider, SignalRequest } from '@dvt/contracts';
import { sha256HexUtf8 } from '@dvt/crypto';

import type { EventType } from '../contracts/runEvents.js';

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

    return sha256HexUtf8(preimage);
  }

  /**
   * Derives the idempotency key for a signal event.
   *
   * ADR-0008 / ADR-0048:
   * SHA256(runId | 'SIGNAL' | signalType | signalId | logicalAttemptId | planId | planVersion)
   *
   * Invariants:
   * - INV-SIGNAL-003: schemaVersion MUST NOT influence hash
   * - INV-SIGNAL-004: tenantId MUST NOT influence hash (envelope field, not identity field)
   */
  signalKey(
    params: { runId: string; logicalAttemptId: number; planId: string; planVersion: string },
    req: SignalRequest
  ): string {
    const preimage = [
      params.runId,
      'SIGNAL',
      req.type,
      req.signalId,
      String(params.logicalAttemptId),
      params.planId,
      params.planVersion,
    ].join('|');
    return sha256HexUtf8(preimage);
  }

  /**
   * INV-INTENT-011: deterministic identity for start-run intents.
   *
   * Uses a versioned canonical payload to avoid delimiter ambiguity
   * (for example tenantId/runId containing `|`) and allow safe evolution.
   * Inputs are consumed as-is (no case folding or Unicode normalization);
   * callers must provide canonical tenantId/runId values.
   */
  startRunIntentId(
    tenantId: string,
    runId: string,
    logicalAttemptId = 1,
    targetAdapter?: Provider
  ): string {
    const normalizedTenantId = normalizeNonEmptyField(tenantId, 'tenantId');
    const normalizedRunId = normalizeNonEmptyField(runId, 'runId');
    const normalizedLogicalAttemptId = normalizeLogicalAttemptId(logicalAttemptId);
    const canonicalPayload = JSON.stringify({
      kind: 'START_RUN_INTENT',
      version: 2,
      tenantId: normalizedTenantId,
      runId: normalizedRunId,
      logicalAttemptId: normalizedLogicalAttemptId,
      ...(targetAdapter !== undefined ? { targetAdapter } : {}),
    });
    return sha256HexUtf8(canonicalPayload);
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

function normalizeNonEmptyField(value: string, fieldName: string): string {
  if (value.length === 0) {
    throw new Error(`IdempotencyKeyBuilder: ${fieldName} must be non-empty`);
  }
  return value;
}
