import { describe, expect, it } from 'vitest';

import {
  AdapterNotRegisteredError,
  CapabilitiesNotSupportedError,
  ENGINE_ERROR_MESSAGE_KEY,
  InvalidRunEventInputError,
  InvalidRunIdError,
  InvalidSchemaVersionError,
  InvalidStateTransitionError,
  OutboxRateLimitExceededError,
  PlanUriNotAllowedError,
  RunSequenceOverflowError,
  RunAlreadyExistsError,
  RunMetadataNotFoundError,
  RunNotFoundError,
  SignalNotImplementedError,
  TargetAdapterMismatchError,
  TenantAccessDeniedError,
  defaultEngineErrorMessage,
} from '../../src/contracts/errors.js';
import { UnsupportedPlanVersionError } from '../../src/contracts/PlanVersionPolicy.js';

describe('Error i18n contract', () => {
  it('stores message key and params as stable metadata', () => {
    const cases = [
      {
        error: new RunNotFoundError('run-1'),
        key: ENGINE_ERROR_MESSAGE_KEY.RUN_NOT_FOUND,
        params: { runId: 'run-1' },
      },
      {
        error: new RunAlreadyExistsError('run-2'),
        key: ENGINE_ERROR_MESSAGE_KEY.RUN_ALREADY_EXISTS,
        params: { runId: 'run-2' },
      },
      {
        error: new InvalidRunIdError('bad run id'),
        key: ENGINE_ERROR_MESSAGE_KEY.INVALID_RUN_ID,
        params: { runId: 'bad run id' },
      },
      {
        error: new InvalidRunEventInputError({
          reason: 'run_id_mismatch',
          index: 0,
          runId: 'run-a',
        }),
        key: ENGINE_ERROR_MESSAGE_KEY.INVALID_RUN_EVENT_INPUT,
        params: { reason: 'run_id_mismatch', index: 0, runId: 'run-a' },
      },
      {
        error: new RunSequenceOverflowError('run-overflow', Number.MAX_SAFE_INTEGER + 1),
        key: ENGINE_ERROR_MESSAGE_KEY.RUN_SEQUENCE_OVERFLOW,
        params: { runId: 'run-overflow', attemptedRunSeq: Number.MAX_SAFE_INTEGER + 1 },
      },
      {
        error: new RunMetadataNotFoundError('run-3'),
        key: ENGINE_ERROR_MESSAGE_KEY.RUN_METADATA_NOT_FOUND,
        params: { runId: 'run-3' },
      },
      {
        error: new AdapterNotRegisteredError('temporal'),
        key: ENGINE_ERROR_MESSAGE_KEY.ADAPTER_NOT_REGISTERED,
        params: { provider: 'temporal' },
      },
      {
        error: new TenantAccessDeniedError('tenant-1'),
        key: ENGINE_ERROR_MESSAGE_KEY.TENANT_ACCESS_DENIED,
        params: { tenantId: 'tenant-1' },
      },
      {
        error: new CapabilitiesNotSupportedError({
          capabilities: ['query.workflow.state'],
          provider: 'mock',
        }),
        key: ENGINE_ERROR_MESSAGE_KEY.CAPABILITIES_NOT_SUPPORTED,
        params: { capabilities: ['query.workflow.state'], provider: 'mock' },
      },
      {
        error: new TargetAdapterMismatchError({ planRequires: 'temporal', contextHas: 'mock' }),
        key: ENGINE_ERROR_MESSAGE_KEY.TARGET_ADAPTER_MISMATCH,
        params: { planRequires: 'temporal', contextHas: 'mock' },
      },
      {
        error: new SignalNotImplementedError('PAUSE'),
        key: ENGINE_ERROR_MESSAGE_KEY.SIGNAL_NOT_IMPLEMENTED,
        params: { signalType: 'PAUSE' },
      },
      {
        error: new OutboxRateLimitExceededError('tenant-2'),
        key: ENGINE_ERROR_MESSAGE_KEY.OUTBOX_RATE_LIMIT_EXCEEDED,
        params: { tenantId: 'tenant-2' },
      },
      {
        error: new InvalidSchemaVersionError('v9.0'),
        key: ENGINE_ERROR_MESSAGE_KEY.PLAN_SCHEMA_VERSION_UNKNOWN,
        params: { schemaVersion: 'v9.0' },
      },
      {
        error: new PlanUriNotAllowedError('file:///etc/passwd', {
          reason: 'denied_scheme',
          subject: 'file',
        }),
        key: ENGINE_ERROR_MESSAGE_KEY.PLAN_URI_NOT_ALLOWED,
        params: { uri: 'file:///etc/passwd', reason: 'denied_scheme', subject: 'file' },
      },
      {
        error: new InvalidStateTransitionError({
          runId: 'run-4',
          fromStatus: 'COMPLETED',
          eventType: 'RunStarted',
        }),
        key: ENGINE_ERROR_MESSAGE_KEY.INVALID_STATE_TRANSITION,
        params: { runId: 'run-4', fromStatus: 'COMPLETED', eventType: 'RunStarted' },
      },
      {
        error: new UnsupportedPlanVersionError({
          planVersion: '9.0',
          supportedVersions: ['2.3'],
        }),
        key: ENGINE_ERROR_MESSAGE_KEY.UNSUPPORTED_PLAN_VERSION,
        params: { planVersion: '9.0', supportedVersions: ['2.3'] },
      },
    ] as const;

    for (const { error, key, params } of cases) {
      expect(error.messageKey).toBe(key);
      expect(error.message).toBe(key);
      expect(error.messageParams).toEqual(params);
    }
  });

  it('can render localized fallback text outside the domain constructors', () => {
    const rendered = defaultEngineErrorMessage('RUN_NOT_FOUND', { runId: 'run-1' });
    expect(rendered).toBe('Run not found: run-1');
  });
});
