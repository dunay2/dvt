import {
  OutboxRateLimitExceededError,
  RunAlreadyExistsError,
  RunMetadataNotFoundError,
  SignalNotImplementedError,
} from '@dvt/engine';
import { describe, it, expect } from 'vitest';

import {
  mapRuntimeDomainError,
  mapStartRunFacadeResult,
} from '../../../src/entrypoints/http/authErrorMapper.js';

describe('mapStartRunFacadeResult', () => {
  it('unauthenticated -> 401', () => {
    const result = mapStartRunFacadeResult({ kind: 'unauthenticated', code: 'MISSING_TOKEN' });
    expect(result.status).toBe(401);
    expect(result.body).toEqual({ error: 'UNAUTHORIZED', code: 'MISSING_TOKEN' });
  });

  it('unauthorized -> 403', () => {
    const result = mapStartRunFacadeResult({ kind: 'unauthorized', reason: 'TENANT_NOT_GRANTED' });
    expect(result.status).toBe(403);
    expect(result.body).toEqual({ error: 'FORBIDDEN', code: 'TENANT_NOT_GRANTED' });
  });

  it('adapter_not_configured -> 422', () => {
    const result = mapStartRunFacadeResult({
      kind: 'adapter_not_configured',
      adapter: 'temporal',
    });
    expect(result.status).toBe(422);
    expect(result.body).toEqual({
      error: 'ADAPTER_NOT_CONFIGURED',
      adapter: 'temporal',
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
      error: 'TOO_MANY_REQUESTS',
      code: 'TENANT_BACKPRESSURE',
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
      error: 'SERVICE_UNAVAILABLE',
      code: 'BACKPRESSURE_SNAPSHOT_UNAVAILABLE',
    });
  });

  it('plan_rejected -> 422 with structured rejection payload', () => {
    const result = mapStartRunFacadeResult({
      kind: 'plan_rejected',
      accepted: false,
      code: 'MISSING_CAPABILITY',
      reason: 'Missing adapter capability: workflow.pause',
      cause: 'workflow.pause',
    });
    expect(result.status).toBe(422);
    expect(result.body).toEqual({
      error: 'PLAN_REJECTED',
      code: 'MISSING_CAPABILITY',
      reason: 'Missing adapter capability: workflow.pause',
      cause: 'workflow.pause',
    });
  });
});

describe('mapRuntimeDomainError', () => {
  it('maps run metadata not found to 404', () => {
    const result = mapRuntimeDomainError(new RunMetadataNotFoundError('run-1'));
    expect(result).toEqual({ status: 404, body: { error: 'NOT_FOUND', code: 'RUN_NOT_FOUND' } });
  });

  it('maps unsupported phase-2 signals to 422', () => {
    const result = mapRuntimeDomainError(new SignalNotImplementedError('RETRY_RUN'));
    expect(result).toEqual({
      status: 422,
      body: { error: 'UNPROCESSABLE_ENTITY', code: 'SIGNAL_NOT_IMPLEMENTED' },
    });
  });

  it('maps duplicate engine errors to 409 conflict', () => {
    const result = mapRuntimeDomainError(new RunAlreadyExistsError('run-dup'));
    expect(result).toEqual({
      status: 409,
      body: { error: 'CONFLICT', code: 'RUN_ALREADY_EXISTS' },
    });
  });

  it('maps outbox rate limit errors to 429', () => {
    const result = mapRuntimeDomainError(new OutboxRateLimitExceededError('tenant-a'));
    expect(result).toEqual({
      status: 429,
      body: { error: 'TOO_MANY_REQUESTS', code: 'OUTBOX_RATE_LIMIT_EXCEEDED' },
    });
  });
});
