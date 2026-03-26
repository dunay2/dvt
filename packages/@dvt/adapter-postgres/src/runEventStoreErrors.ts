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
  INVALID_EVENT_SCHEMA: 'INVALID_EVENT_SCHEMA',
  INVALID_LIST_EVENTS_LIMIT: 'INVALID_LIST_EVENTS_LIMIT',
  INVALID_RUN_SEQUENCE_VALUE: 'INVALID_RUN_SEQUENCE_VALUE',
} as const;

export const RUN_EVENT_STORE_ERROR_NAME = {
  BASE: 'RunEventStoreError',
  BOUNDARY: 'RunEventStoreBoundaryError',
  INVALID_EVENT_ENVELOPE: 'InvalidRunEventEnvelopeError',
  INVALID_EVENT_TENANT: 'InvalidRunEventTenantError',
  INVALID_EVENT_SCHEMA: 'InvalidRunEventSchemaError',
  INVALID_LIST_EVENTS_LIMIT: 'InvalidListEventsLimitError',
  INVALID_RUN_SEQUENCE_VALUE: 'InvalidRunSequenceValueError',
} as const;

type RunEventStoreErrorCode =
  (typeof RUN_EVENT_STORE_ERROR_CODE)[keyof typeof RUN_EVENT_STORE_ERROR_CODE];

export const RUN_EVENT_STORE_MESSAGE_KEY = {
  INVALID_EVENT_ENVELOPE: 'adapter.postgres.run_event.invalid_event_envelope',
  INVALID_EVENT_TENANT: 'adapter.postgres.run_event.invalid_event_tenant',
  INVALID_EVENT_SCHEMA: 'adapter.postgres.run_event.invalid_event_schema',
  INVALID_LIST_EVENTS_LIMIT: 'adapter.postgres.run_event.invalid_list_events_limit',
  INVALID_RUN_SEQUENCE_VALUE: 'adapter.postgres.run_event.invalid_run_sequence_value',
} as const;

type RunEventStoreMessageKey =
  (typeof RUN_EVENT_STORE_MESSAGE_KEY)[keyof typeof RUN_EVENT_STORE_MESSAGE_KEY];

interface RunEventStoreMessageParamMap {
  INVALID_EVENT_ENVELOPE: { runId: RunId; index: number; envelopeRunId: string };
  INVALID_EVENT_TENANT: { runId: RunId; index: number; tenantId: string; envelopeTenantId: string };
  INVALID_EVENT_SCHEMA: { runId: RunId; index: number };
  INVALID_LIST_EVENTS_LIMIT: { runId: string; limit: number };
  INVALID_RUN_SEQUENCE_VALUE: { runId: RunId; maxRunSeq: unknown };
}

type RunEventStoreMessageParams<C extends RunEventStoreErrorCode = RunEventStoreErrorCode> =
  Readonly<RunEventStoreMessageParamMap[C]>;

type AnyRunEventStoreMessageParams = RunEventStoreMessageParams<RunEventStoreErrorCode>;

export abstract class RunEventStoreError extends Error {
  readonly code: RunEventStoreErrorCode;
  readonly messageKey: RunEventStoreMessageKey;
  readonly messageParams: AnyRunEventStoreMessageParams;
  readonly cause: unknown = undefined;

  constructor(
    code: RunEventStoreErrorCode,
    name: string,
    messageKey: RunEventStoreMessageKey,
    messageParams: AnyRunEventStoreMessageParams,
    cause?: unknown
  ) {
    super(messageKey);
    this.name = name;
    this.code = code;
    this.messageKey = messageKey;
    this.messageParams = messageParams;
    this.cause = cause;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

abstract class RunEventStoreBoundaryError extends RunEventStoreError {
  readonly runId: RunId;
  readonly index: number;

  constructor(
    code: RunEventStoreErrorCode,
    name: string,
    runId: RunId,
    index: number,
    messageKey: RunEventStoreMessageKey,
    messageParams: AnyRunEventStoreMessageParams,
    cause?: unknown
  ) {
    super(code, name, messageKey, messageParams, cause);
    this.runId = runId;
    this.index = index;
  }
}

export class InvalidRunEventEnvelopeError extends RunEventStoreBoundaryError {
  constructor(runId: RunId, index: number, envelopeRunId: string) {
    super(
      RUN_EVENT_STORE_ERROR_CODE.INVALID_EVENT_ENVELOPE,
      RUN_EVENT_STORE_ERROR_NAME.INVALID_EVENT_ENVELOPE,
      runId,
      index,
      RUN_EVENT_STORE_MESSAGE_KEY.INVALID_EVENT_ENVELOPE,
      { runId, index, envelopeRunId }
    );
  }
}

export class InvalidRunEventTenantError extends RunEventStoreBoundaryError {
  constructor(runId: RunId, index: number, tenantId: string, envelopeTenantId: string) {
    super(
      RUN_EVENT_STORE_ERROR_CODE.INVALID_EVENT_TENANT,
      RUN_EVENT_STORE_ERROR_NAME.INVALID_EVENT_TENANT,
      runId,
      index,
      RUN_EVENT_STORE_MESSAGE_KEY.INVALID_EVENT_TENANT,
      { runId, index, tenantId, envelopeTenantId }
    );
  }
}

export class InvalidRunEventSchemaError extends RunEventStoreBoundaryError {
  constructor(runId: RunId, index: number, cause?: unknown) {
    super(
      RUN_EVENT_STORE_ERROR_CODE.INVALID_EVENT_SCHEMA,
      RUN_EVENT_STORE_ERROR_NAME.INVALID_EVENT_SCHEMA,
      runId,
      index,
      RUN_EVENT_STORE_MESSAGE_KEY.INVALID_EVENT_SCHEMA,
      { runId, index },
      cause
    );
  }
}

export class InvalidListEventsLimitError extends RunEventStoreError {
  readonly runId: string;
  readonly limit: number;

  constructor(runId: string, limit: number) {
    super(
      RUN_EVENT_STORE_ERROR_CODE.INVALID_LIST_EVENTS_LIMIT,
      RUN_EVENT_STORE_ERROR_NAME.INVALID_LIST_EVENTS_LIMIT,
      RUN_EVENT_STORE_MESSAGE_KEY.INVALID_LIST_EVENTS_LIMIT,
      { runId, limit }
    );
    this.runId = runId;
    this.limit = limit;
  }
}

export class InvalidRunSequenceValueError extends RunEventStoreError {
  readonly runId: RunId;
  readonly maxRunSeq: unknown;

  constructor(runId: RunId, maxRunSeq: unknown) {
    super(
      RUN_EVENT_STORE_ERROR_CODE.INVALID_RUN_SEQUENCE_VALUE,
      RUN_EVENT_STORE_ERROR_NAME.INVALID_RUN_SEQUENCE_VALUE,
      RUN_EVENT_STORE_MESSAGE_KEY.INVALID_RUN_SEQUENCE_VALUE,
      { runId, maxRunSeq }
    );
    this.runId = runId;
    this.maxRunSeq = maxRunSeq;
  }
}
