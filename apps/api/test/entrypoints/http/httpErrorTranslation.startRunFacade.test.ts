import {
  START_RUN_BACKPRESSURE_CODE,
  type StartRunAcceptedResult,
  type StartRunDuplicateResult,
} from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import { httpErrorTranslation } from '../../../src/entrypoints/http/httpErrorTranslation.js';

import {
  expectCanonicalErrorResponse,
  expectSystemBackpressureFacadeResult,
} from './httpErrorTranslation.test.support.js';

describe('httpErrorTranslation start-run facade results', () => {
  const canonicalFacadeErrorCases = [
    {
      description: 'unauthenticated -> 401',
      input: {
        kind: 'unauthenticated' as const,
        code: 'MISSING_TOKEN' as const,
      },
      expected: {
        status: 401,
        type: 'unauthorized',
        reason: 'missing_token',
      },
    },
    {
      description: 'unauthorized -> 403',
      input: {
        kind: 'unauthorized' as const,
        reason: 'TENANT_NOT_GRANTED' as const,
      },
      expected: {
        status: 403,
        type: 'forbidden',
        reason: 'tenant_not_granted',
      },
    },
    {
      description: 'tenant_backpressure -> 429 with Retry-After',
      input: {
        kind: 'tenant_backpressure' as const,
        accepted: false,
        code: 'TENANT_BACKPRESSURE' as const,
        retryAfterSeconds: 30,
      },
      expected: {
        status: 429,
        type: 'rate_limited',
        reason: 'tenant_backpressure',
        headers: { 'retry-after': '30' },
      },
    },
  ] as const;

  const executionCapacitySystemBackpressureCases = [
    {
      code: START_RUN_BACKPRESSURE_CODE.capacitySignalUnavailable,
      expectedReason: 'capacity_signal_unavailable',
      retryAfterSeconds: 30,
    },
    {
      code: START_RUN_BACKPRESSURE_CODE.executionCapacityExhausted,
      expectedReason: 'execution_capacity_exhausted',
      retryAfterSeconds: 12,
    },
    {
      code: START_RUN_BACKPRESSURE_CODE.executorUnavailable,
      expectedReason: 'executor_unavailable',
      retryAfterSeconds: 10,
    },
  ] as const;

  const successFacadeCases: readonly [
    {
      readonly description: 'accepted -> 202 with runId';
      readonly input: StartRunAcceptedResult;
      readonly expected: {
        readonly status: 202;
        readonly body: { readonly runId: 'r-abc'; readonly accepted: true };
      };
    },
    {
      readonly description: 'duplicate -> 202 with duplicate marker';
      readonly input: StartRunDuplicateResult;
      readonly expected: {
        readonly status: 202;
        readonly body: {
          readonly runId: 'r-dup';
          readonly accepted: true;
          readonly duplicate: true;
          readonly duplicateOf: 'intent';
        };
      };
    },
  ] = [
    {
      description: 'accepted -> 202 with runId',
      input: {
        kind: 'accepted',
        runId: 'r-abc',
        accepted: true,
      },
      expected: {
        status: 202,
        body: { runId: 'r-abc', accepted: true },
      },
    },
    {
      description: 'duplicate -> 202 with duplicate marker',
      input: {
        kind: 'duplicate',
        runId: 'r-dup',
        accepted: true,
        duplicateOf: 'intent',
      },
      expected: {
        status: 202,
        body: {
          runId: 'r-dup',
          accepted: true,
          duplicate: true,
          duplicateOf: 'intent',
        },
      },
    },
  ];

  it.each(canonicalFacadeErrorCases)('$description', ({ input, expected }) => {
    expectCanonicalErrorResponse(httpErrorTranslation.startRun.facadeResult(input), expected);
  });

  it.each(successFacadeCases)('$description', ({ input, expected }) => {
    expect(httpErrorTranslation.startRun.facadeResult(input)).toEqual(expected);
  });

  it('system_backpressure -> 503 with Retry-After', () => {
    const result = httpErrorTranslation.startRun.facadeResult({
      kind: 'system_backpressure',
      accepted: false,
      code: 'BACKPRESSURE_SNAPSHOT_UNAVAILABLE',
      retryAfterSeconds: 45,
    });
    expectSystemBackpressureFacadeResult(result, 'backpressure_snapshot_unavailable', 45);
  });

  it.each(executionCapacitySystemBackpressureCases)(
    'execution-capacity system_backpressure preserves reason for code=%s',
    ({ code, expectedReason, retryAfterSeconds }) => {
      const result = httpErrorTranslation.startRun.facadeResult({
        kind: 'system_backpressure',
        accepted: false,
        code,
        retryAfterSeconds,
      });
      expectSystemBackpressureFacadeResult(result, expectedReason, retryAfterSeconds);
    }
  );

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
  ])('plan_rejected preserves stable reason for $code', ({ code, expectedReason, reason, cause }) => {
    expectCanonicalErrorResponse(
      httpErrorTranslation.startRun.facadeResult({
        kind: 'plan_rejected',
        accepted: false,
        code,
        reason,
        cause,
      }),
      {
        status: 422,
        type: 'unprocessable',
        reason: expectedReason,
        details: {
          message: reason,
          cause,
        },
      }
    );
  });
});
