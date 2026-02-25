import type { SignalRequest } from '@dvt/contracts';
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
export declare class IdempotencyKeyBuilder {
  runEventKey(e: EventIdempotencyInput): string;
  /**
   * Derives the idempotency key for a signal event.
   *
   * ADR-0008: SHA256(runId | 'SIGNAL' | signalType | signalId | logicalAttemptId | planId | planVersion [| stepId])
   *
   * Invariants:
   * - INV-SIGNAL-003: schemaVersion MUST NOT influence hash
   * - INV-SIGNAL-004: tenantId MUST NOT influence hash (envelope field, not identity field)
   */
  signalKey(
    params: {
      runId: string;
      logicalAttemptId: number;
      planId: string;
      planVersion: string;
    },
    req: SignalRequest
  ): string;
  eventId(): string;
}
//# sourceMappingURL=idempotency.d.ts.map
