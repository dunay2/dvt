import { describe, it, expect } from 'vitest';

import {
  mapRuntimeDomainError,
  mapStartRunFacadeResult,
} from '../../../src/entrypoints/http/authErrorMapper.js';
import { RunMetadataNotFoundError, SignalNotImplementedError } from '@dvt/engine';

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
      result: { runId: 'r-abc', accepted: true },
    });
    expect(result.status).toBe(202);
    expect(result.body).toEqual({ runId: 'r-abc', accepted: true });
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
});
