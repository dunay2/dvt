import {
  AdapterNotRegisteredError,
  OutboxRateLimitExceededError,
  RunAlreadyExistsError,
  RunMetadataNotFoundError,
  RunNotFoundError,
  SignalNotImplementedError,
} from '@dvt/engine';
import { describe, it, expect } from 'vitest';

import {
  START_RUN_ENGINE_ERROR_CODE,
  START_RUN_ENGINE_ERROR_REASON,
} from '../../../src/application/ports/startRunContract.js';
import {
  mapRuntimeDomainError,
  mapStartRunEngineError,
  mapStartRunFacadeResult,
} from '../../../src/entrypoints/http/httpErrorMapper.js';

describe('mapStartRunFacadeResult', () => {
  it('unauthenticated -> 401', () => {
    const result = mapStartRunFacadeResult({ kind: 'unauthenticated', code: 'MISSING_TOKEN' });
    expect(result.status).toBe(401);
    expect(result.body).toEqual({
      error: {
        type: 'unauthorized',
        reason: 'missing_token',
      },
    });
  });

  it('unauthorized -> 403', () => {
    const result = mapStartRunFacadeResult({ kind: 'unauthorized', reason: 'TENANT_NOT_GRANTED' });
    expect(result.status).toBe(403);
    expect(result.body).toEqual({
      error: {
        type: 'forbidden',
        reason: 'tenant_not_granted',
      },
    });
  });

  it('accepted -> 202 with runId', () => {
    const result = mapStartRunFacadeResult({
      kind: 'accepted',
      runId: 'r-abc',
      accepted: true,
    });
    expect(result.status).toBe(202);
    expect(result.body).toEqual({ runId: 'r-abc', accepted: true });
  });

  it('duplicate -> 202 with duplicate marker', () => {
    const result = mapStartRunFacadeResult({
      kind: 'duplicate',
      runId: 'r-dup',
      accepted: true,
      duplicateOf: 'intent',
    });
    expect(result.status).toBe(202);
    expect(result.body).toEqual({
      runId: 'r-dup',
      accepted: true,
      duplicate: true,
      duplicateOf: 'intent',
    });
  });

  it('tenant_backpressure -> 429 with Retry-After', () => {
    const result = mapStartRunFacadeResult({
      kind: 'tenant_backpressure',
      accepted: false,
      code: 'TENANT_BACKPRESSURE',
      retryAfterSeconds: 30,
    });
    expect(result.status).toBe(429);
    expect(result.headers).toEqual({ 'retry-after': '30' });
    expect(result.body).toEqual({
      error: {
        type: 'rate_limited',
        reason: 'tenant_backpressure',
      },
    });
  });

  it('system_backpressure -> 503 with Retry-After', () => {
    const result = mapStartRunFacadeResult({
      kind: 'system_backpressure',
      accepted: false,
      code: 'BACKPRESSURE_SNAPSHOT_UNAVAILABLE',
      retryAfterSeconds: 45,
    });
    expect(result.status).toBe(503);
    expect(result.headers).toEqual({ 'retry-after': '45' });
    expect(result.body).toEqual({
      error: {
        type: 'service_unavailable',
        reason: 'backpressure_snapshot_unavailable',
      },
    });
  });

  it.each([
    {
      code: 'MISSING_CAPABILITY' as const,
      expectedReason: 'missing_capability',
      reason: 'Missing adapter capability: workflow.pause',
      cause: 'workflow.pause',
    },
    {
      code: 'REJECTED' as const,
      expectedReason: 'plan_rejected',
      reason: 'Adapter-specific rejection',
      cause: 'adapter',
    },
  ])('plan_rejected preserves stable reason for $code', (input) => {
    const result = mapStartRunFacadeResult({
      kind: 'plan_rejected',
      accepted: false,
      code: input.code,
      reason: input.reason,
      cause: input.cause,
    });
    expect(result.status).toBe(422);
    expect(result.body).toEqual({
      error: {
        type: 'unprocessable',
        reason: input.expectedReason,
        details: {
          message: input.reason,
          cause: input.cause,
        },
      },
    });
  });
});

describe('mapStartRunEngineError', () => {
  it('adapter_not_registered -> 422', () => {
    const result = mapStartRunEngineError({
      kind: 'adapter_not_registered',
      adapter: 'temporal',
    });
    expect(result.status).toBe(422);
    expect(result.body).toEqual({
      error: {
        type: 'unprocessable',
        reason: 'adapter_not_configured',
        details: { adapter: 'temporal' },
      },
    });
  });

  it('command_invalid -> 422 plan_rejected', () => {
    const result = mapStartRunEngineError({
      kind: 'command_invalid',
      code: START_RUN_ENGINE_ERROR_CODE.planRefRequired,
      reason: START_RUN_ENGINE_ERROR_REASON.planRefRequired,
    });
    expect(result.status).toBe(422);
    expect(result.body).toEqual({
      error: {
        type: 'unprocessable',
        reason: 'plan_rejected',
        details: {
          message: START_RUN_ENGINE_ERROR_REASON.planRefRequired,
          cause: 'plan_ref_required',
        },
      },
    });
  });

  it('unsupported_plan_version -> 422 plan_rejected', () => {
    const result = mapStartRunEngineError({
      kind: 'unsupported_plan_version',
      planVersion: '2.7',
      supportedVersions: ['1.0'],
    });
    expect(result.status).toBe(422);
    expect(result.body).toEqual({
      error: {
        type: 'unprocessable',
        reason: 'unsupported_plan_version',
        details: {
          message: 'Unsupported plan version: 2.7',
          supportedVersions: ['1.0'],
        },
      },
    });
  });
});

describe('mapRuntimeDomainError', () => {
  it.each([
    ['maps run metadata not found to 404', RunMetadataNotFoundError, 'run-1'],
    ['maps typed run not found errors to 404', RunNotFoundError, 'run-2'],
  ])('%s', (_desc, ErrorClass, runId) => {
    const result = mapRuntimeDomainError(new ErrorClass(runId));
    expect(result).toEqual({
      status: 404,
      body: {
        error: {
          type: 'not_found',
          reason: 'run_not_found',
          details: { runId },
        },
      },
    });
  });

  it('maps unsupported provider-private commands to 422', () => {
    const result = mapRuntimeDomainError(new SignalNotImplementedError('PROVIDER_PRIVATE_COMMAND'));
    expect(result).toEqual({
      status: 422,
      body: {
        error: {
          type: 'unprocessable',
          reason: 'signal_not_implemented',
        },
      },
    });
  });

  it('maps adapter registration errors to 422', () => {
    const result = mapRuntimeDomainError(new AdapterNotRegisteredError('temporal'));
    expect(result).toEqual({
      status: 422,
      body: {
        error: {
          type: 'unprocessable',
          reason: 'adapter_not_configured',
          details: { adapter: 'temporal' },
        },
      },
    });
  });

  it('maps duplicate engine errors to 409 conflict', () => {
    const result = mapRuntimeDomainError(new RunAlreadyExistsError('run-dup'));
    expect(result).toEqual({
      status: 409,
      body: {
        error: {
          type: 'conflict',
          reason: 'run_already_exists',
          details: { runId: 'run-dup' },
        },
      },
    });
  });

  it('does not classify arbitrary code-only errors as run conflicts', () => {
    const result = mapRuntimeDomainError(
      Object.assign(new Error('intent conflict'), { code: 'INTENT_ACTIVE_CONFLICT' })
    );
    expect(result).toBeNull();
  });

  it('maps outbox rate limit errors to 429', () => {
    const result = mapRuntimeDomainError(new OutboxRateLimitExceededError('tenant-a'));
    expect(result).toEqual({
      status: 429,
      body: {
        error: {
          type: 'rate_limited',
          reason: 'outbox_rate_limit_exceeded',
        },
      },
    });
  });
});
