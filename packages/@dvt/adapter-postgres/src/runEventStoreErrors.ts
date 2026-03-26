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
  INVALID_LIST_EVENTS_LIMIT: 'INVALID_LIST_EVENTS_LIMIT',
} as const;

export const RUN_EVENT_STORE_ERROR_NAME = {
  BOUNDARY: 'RunEventStoreBoundaryError',
  INVALID_EVENT_ENVELOPE: 'InvalidRunEventEnvelopeError',
  INVALID_EVENT_TENANT: 'InvalidRunEventTenantError',
  INVALID_LIST_EVENTS_LIMIT: 'InvalidListEventsLimitError',
} as const;

type RunEventStoreErrorCode =
  (typeof RUN_EVENT_STORE_ERROR_CODE)[keyof typeof RUN_EVENT_STORE_ERROR_CODE];

const runEventStoreErrorMessage = {
  invalidEventEnvelope(runId: RunId, index: number, envelopeRunId: string): string {
    return `Event runId '${envelopeRunId}' does not match target run '${runId}' at index ${index}`;
  },
  invalidEventTenant(index: number, tenantId: string, envelopeTenantId: string): string {
    return `Event tenantId '${envelopeTenantId}' does not match run tenant '${tenantId}' at index ${index}`;
  },
  invalidListEventsLimit(runId: string, limit: number): string {
    return `List events limit must be a non-negative integer for run '${runId}', got '${limit}'`;
  },
} as const;

abstract class RunEventStoreBoundaryError extends Error {
  readonly code: RunEventStoreErrorCode;
  readonly runId: RunId;
  readonly index: number;

  constructor(code: RunEventStoreErrorCode, message: string, runId: RunId, index: number) {
    super(message);
    this.name = RUN_EVENT_STORE_ERROR_NAME.BOUNDARY;
    this.code = code;
    this.runId = runId;
    this.index = index;
  }
}

export class InvalidRunEventEnvelopeError extends RunEventStoreBoundaryError {
  constructor(runId: RunId, index: number, envelopeRunId: string) {
    super(
      RUN_EVENT_STORE_ERROR_CODE.INVALID_EVENT_ENVELOPE,
      runEventStoreErrorMessage.invalidEventEnvelope(runId, index, envelopeRunId),
      runId,
      index
    );
    this.name = RUN_EVENT_STORE_ERROR_NAME.INVALID_EVENT_ENVELOPE;
  }
}

export class InvalidRunEventTenantError extends RunEventStoreBoundaryError {
  constructor(runId: RunId, index: number, tenantId: string, envelopeTenantId: string) {
    super(
      RUN_EVENT_STORE_ERROR_CODE.INVALID_EVENT_TENANT,
      runEventStoreErrorMessage.invalidEventTenant(index, tenantId, envelopeTenantId),
      runId,
      index
    );
    this.name = RUN_EVENT_STORE_ERROR_NAME.INVALID_EVENT_TENANT;
  }
}

export class InvalidListEventsLimitError extends Error {
  readonly code = RUN_EVENT_STORE_ERROR_CODE.INVALID_LIST_EVENTS_LIMIT;
  readonly runId: string;
  readonly limit: number;

  constructor(runId: string, limit: number) {
    super(runEventStoreErrorMessage.invalidListEventsLimit(runId, limit));
    this.name = RUN_EVENT_STORE_ERROR_NAME.INVALID_LIST_EVENTS_LIMIT;
    this.runId = runId;
    this.limit = limit;
  }
}
