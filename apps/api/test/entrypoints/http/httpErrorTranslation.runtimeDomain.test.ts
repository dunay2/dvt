import {
  AdapterNotRegisteredError,
  AuthorizationError,
  OutboxRateLimitExceededError,
  RecoverySourceNotTerminalError,
  RunAlreadyExistsError,
  RunMetadataNotFoundError,
  RunNotFoundError,
  SignalNotImplementedError,
} from '@dvt/engine';
import { describe, expect, it } from 'vitest';

import { httpErrorTranslation } from '../../../src/entrypoints/http/httpErrorTranslation.js';

import {
  assertTranslatedRuntimeDomainError,
  expectCanonicalErrorResponse,
} from './httpErrorTranslation.test.support.js';

describe('httpErrorTranslation runtime domain mapping', () => {
  it.each([
    ['maps run metadata not found to 404', RunMetadataNotFoundError, 'run-1'],
    ['maps typed run not found errors to 404', RunNotFoundError, 'run-2'],
  ])('%s', (_description, ErrorClass, runId) => {
    const result = httpErrorTranslation.runtime.domainError(new ErrorClass(runId));
    assertTranslatedRuntimeDomainError(result);
    expectCanonicalErrorResponse(result, {
      status: 404,
      type: 'not_found',
      reason: 'run_not_found',
      details: { runId },
    });
  });

  const canonicalRuntimeDomainErrorCases = [
    {
      description: 'maps unsupported provider-private commands to 422',
      buildError: () => new SignalNotImplementedError('PROVIDER_PRIVATE_COMMAND'),
      expected: {
        status: 422,
        type: 'unprocessable',
        reason: 'signal_not_implemented',
      },
    },
    {
      description: 'maps adapter registration errors to 422',
      buildError: () => new AdapterNotRegisteredError('temporal'),
      expected: {
        status: 422,
        type: 'unprocessable',
        reason: 'adapter_not_configured',
        details: { adapter: 'temporal' },
      },
    },
    {
      description: 'maps authorization errors to 403 forbidden',
      buildError: () => new AuthorizationError('TENANT_ACCESS_DENIED'),
      expected: {
        status: 403,
        type: 'forbidden',
        reason: 'tenant_access_denied',
      },
    },
    {
      description: 'maps duplicate engine errors to 409 conflict',
      buildError: () => new RunAlreadyExistsError('run-dup'),
      expected: {
        status: 409,
        type: 'conflict',
        reason: 'run_already_exists',
        details: { runId: 'run-dup' },
      },
    },
    {
      description: 'maps non-terminal recovery source errors to 422',
      buildError: () => new RecoverySourceNotTerminalError('run-source', 'RUNNING'),
      expected: {
        status: 422,
        type: 'unprocessable',
        reason: 'source_run_not_terminal',
        details: {
          runId: 'run-source',
          status: 'RUNNING',
        },
      },
    },
    {
      description: 'maps outbox rate limit errors to 429',
      buildError: () => new OutboxRateLimitExceededError('tenant-a'),
      expected: {
        status: 429,
        type: 'rate_limited',
        reason: 'outbox_rate_limit_exceeded',
      },
    },
  ] as const;

  it.each(canonicalRuntimeDomainErrorCases)('$description', ({ buildError, expected }) => {
    const result = httpErrorTranslation.runtime.domainError(buildError());
    assertTranslatedRuntimeDomainError(result);
    expectCanonicalErrorResponse(result, expected);
  });

  it('does not classify arbitrary code-only errors as run conflicts', () => {
    expect(
      httpErrorTranslation.runtime.domainError(
        Object.assign(new Error('intent conflict'), { code: 'INTENT_ACTIVE_CONFLICT' })
      )
    ).toBeNull();
  });
});
