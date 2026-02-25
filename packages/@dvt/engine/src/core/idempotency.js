'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.IdempotencyKeyBuilder = void 0;
/**
 * @file packages/@dvt/engine/src/core/idempotency.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @baseline ADR-0004: Event Sourcing Strategy (Extended)
 * @decision Decision — Idempotency keys are derived from the logical identity of the event and the logical attempt
 * @consequence Prevents duplication of effects and preserves deterministic replay between storage and runtime
 * @version 1.0.0
 * @date 2026-02-21
 */
const node_crypto_1 = require('node:crypto');
const sha256_js_1 = require('../utils/sha256.js');
/**
 * Idempotency keys MUST derive from logicalAttemptId (not engineAttemptId).
 * This builder is deterministic and stable.
 */
class IdempotencyKeyBuilder {
  runEventKey(e) {
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
    return (0, sha256_js_1.sha256Hex)(preimage);
  }
  /**
   * Derives the idempotency key for a signal event.
   *
   * ADR-0008: SHA256(runId | 'SIGNAL' | signalType | signalId | logicalAttemptId | planId | planVersion [| stepId])
   *
   * Invariants:
   * - INV-SIGNAL-003: schemaVersion MUST NOT influence hash
   * - INV-SIGNAL-004: tenantId MUST NOT influence hash (envelope field, not identity field)
   */
  signalKey(params, req) {
    const preimage = [
      params.runId,
      'SIGNAL',
      req.type,
      req.signalId,
      String(params.logicalAttemptId),
      params.planId,
      params.planVersion,
      ...(req.stepId ? [req.stepId] : []),
    ].join('|');
    return (0, sha256_js_1.sha256Hex)(preimage);
  }
  eventId() {
    return (0, node_crypto_1.randomUUID)();
  }
}
exports.IdempotencyKeyBuilder = IdempotencyKeyBuilder;
function isStepEventType(t) {
  return t === 'StepStarted' || t === 'StepCompleted' || t === 'StepFailed' || t === 'StepSkipped';
}
function normalizeLogicalAttemptId(value) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`IdempotencyKeyBuilder: logicalAttemptId invalid: ${value}`);
  }
  return String(value);
}
function normalizeStepId(eventType, stepId) {
  if (!isStepEventType(eventType)) return 'RUN';
  if (!stepId) {
    throw new Error(`IdempotencyKeyBuilder: stepId required for ${eventType}`);
  }
  return stepId;
}
//# sourceMappingURL=idempotency.js.map
