/**
 * @file packages/@dvt/adapter-postgres/src/runEventStoreErrors.ts
 * @baseline ADR-0004: Event Sourcing Strategy (Extended)
 * @decision Use typed, stable errors for run-event write-boundary violations
 * @consequence Callers assert on error class/code instead of brittle string literals
 * @version 1.0.0
 * @date 2026-03-26
 */
import type { RunId } from './types.js';

export const RUN_EVENT_STORE_ERROR_CODE = {
  INVALID_EVENT_ENVELOPE: 'INVALID_EVENT_ENVELOPE',
  INVALID_EVENT_TENANT: 'INVALID_EVENT_TENANT',
} as const;

type RunEventStoreErrorCode =
  (typeof RUN_EVENT_STORE_ERROR_CODE)[keyof typeof RUN_EVENT_STORE_ERROR_CODE];

abstract class RunEventStoreBoundaryError extends Error {
  readonly code: RunEventStoreErrorCode;
  readonly runId: RunId;
  readonly index: number;

  constructor(code: RunEventStoreErrorCode, message: string, runId: RunId, index: number) {
    super(message);
    this.name = 'RunEventStoreBoundaryError';
    this.code = code;
    this.runId = runId;
    this.index = index;
  }
}

export class InvalidRunEventEnvelopeError extends RunEventStoreBoundaryError {
  constructor(runId: RunId, index: number, envelopeRunId: string) {
    super(
      RUN_EVENT_STORE_ERROR_CODE.INVALID_EVENT_ENVELOPE,
      `Event runId '${envelopeRunId}' does not match target run '${runId}' at index ${index}`,
      runId,
      index
    );
    this.name = 'InvalidRunEventEnvelopeError';
  }
}

export class InvalidRunEventTenantError extends RunEventStoreBoundaryError {
  constructor(runId: RunId, index: number, tenantId: string, envelopeTenantId: string) {
    super(
      RUN_EVENT_STORE_ERROR_CODE.INVALID_EVENT_TENANT,
      `Event tenantId '${envelopeTenantId}' does not match run tenant '${tenantId}' at index ${index}`,
      runId,
      index
    );
    this.name = 'InvalidRunEventTenantError';
  }
}
