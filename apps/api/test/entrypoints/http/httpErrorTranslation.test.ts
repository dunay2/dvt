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
import { describe, expect, it, vi } from 'vitest';

import {
  START_RUN_BACKPRESSURE_CODE,
  START_RUN_ENGINE_ERROR_CODE,
  START_RUN_ENGINE_ERROR_REASON,
} from '../../../src/application/ports/startRunContract.js';
import { httpErrorTranslation } from '../../../src/entrypoints/http/httpErrorTranslation.js';

type CanonicalErrorResponse = Parameters<typeof expectCanonicalErrorResponse>[0];
type CanonicalErrorExpectation = Parameters<typeof expectCanonicalErrorResponse>[1];

function expectSystemBackpressureFacadeResult(
  result: ReturnType<typeof httpErrorTranslation.startRun.facadeResult>,
  reason: string,
  retryAfterSeconds: number
): void {
  expect(result.status).toBe(503);
  expect(result.headers).toEqual({ 'retry-after': String(retryAfterSeconds) });
  expect(result.body).toEqual({
    error: {
      type: 'service_unavailable',
      reason,
    },
  });
}

function expectCanonicalErrorResponse(
  result: {
    readonly status: number;
    readonly headers?: Readonly<Record<string, string>> | undefined;
    readonly body: unknown;
  },
  expectation: {
    readonly status: number;
    readonly type: string;
    readonly reason: string;
    readonly details?: unknown;
    readonly headers?: Record<string, string>;
  }
): void {
  expect(result.status).toBe(expectation.status);
  expect(result.headers).toEqual(expectation.headers);
  expect(result.body).toEqual({
    error: {
      type: expectation.type,
      reason: expectation.reason,
      ...(expectation.details === undefined ? {} : { details: expectation.details }),
    },
  });
}

function assertTranslatedRuntimeDomainError(
  result: ReturnType<typeof httpErrorTranslation.runtime.domainError>
): asserts result is Exclude<ReturnType<typeof httpErrorTranslation.runtime.domainError>, null> {
  expect(result).not.toBeNull();
}

describe('httpErrorTranslation.respond', () => {
  it('writes headers, status, and body through the facade writer', () => {
    const reply = {
      header: vi.fn(),
      code: vi.fn().mockReturnThis(),
      send: vi.fn(),
    };

    httpErrorTranslation.respond(
      reply as unknown as Parameters<typeof httpErrorTranslation.respond>[0],
      {
        status: 429,
        headers: { 'retry-after': '30' },
        body: {
          error: {
            type: 'rate_limited',
            reason: 'tenant_backpressure',
          },
        },
      }
    );

    expect(reply.header).toHaveBeenCalledWith('retry-after', '30');
    expect(reply.code).toHaveBeenCalledWith(429);
    expect(reply.send).toHaveBeenCalledWith({
      error: {
        type: 'rate_limited',
        reason: 'tenant_backpressure',
      },
    });
  });
});

describe('httpErrorTranslation static envelope helpers', () => {
  const staticEnvelopeCases = [
    {
      description: 'maps rebuild snapshot internal failures to a canonical 500 envelope',
      buildResponse: (): CanonicalErrorResponse =>
        httpErrorTranslation.admin.rebuildSnapshotInternalError(),
      expected: {
        status: 500,
        type: 'internal_server_error',
        reason: 'internal_error',
      } satisfies CanonicalErrorExpectation,
    },
    {
      description: 'maps missing persisted drafts to a canonical 404 envelope',
      buildResponse: (): CanonicalErrorResponse =>
        httpErrorTranslation.workspaceGraphDraft.read.notFound({
          correlationId: 'req-1',
          decisionId: 'dec-1',
        }),
      expected: {
        status: 404,
        type: 'not_found',
        reason: 'workspace_graph_draft_not_found',
        details: {
          correlationId: 'req-1',
          decisionId: 'dec-1',
        },
      } satisfies CanonicalErrorExpectation,
    },
    {
      description: 'maps unsupported schema versions on save to a canonical 422 envelope',
      buildResponse: (): CanonicalErrorResponse =>
        httpErrorTranslation.workspaceGraphDraft.write.unsupportedSchemaVersion(),
      expected: {
        status: 422,
        type: 'unprocessable',
        reason: 'workspace_graph_draft_unsupported_schema_version',
        details: {
          expectedSchemaVersion: 'workspace-graph-draft.v1',
        },
      } satisfies CanonicalErrorExpectation,
    },
    {
      description: 'maps idempotency mismatches on save to a canonical 409 envelope',
      buildResponse: (): CanonicalErrorResponse =>
        httpErrorTranslation.workspaceGraphDraft.write.idempotencyMismatch({
          correlationId: 'req-1',
          decisionId: 'dec-1',
        }),
      expected: {
        status: 409,
        type: 'conflict',
        reason: 'workspace_graph_draft_idempotency_key_reused',
        details: {
          correlationId: 'req-1',
          decisionId: 'dec-1',
        },
      } satisfies CanonicalErrorExpectation,
    },
  ] as const;

  it.each(staticEnvelopeCases)('$description', ({ buildResponse, expected }) => {
    expectCanonicalErrorResponse(buildResponse(), expected);
  });
});

describe('mapStartRunFacadeResult', () => {
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

  it.each(canonicalFacadeErrorCases)('$description', ({ input, expected }) => {
    const result = httpErrorTranslation.startRun.facadeResult(input);
    expectCanonicalErrorResponse(result, expected);
  });

  it('accepted -> 202 with runId', () => {
    const result = httpErrorTranslation.startRun.facadeResult({
      kind: 'accepted',
      runId: 'r-abc',
      accepted: true,
    });
    expect(result.status).toBe(202);
    expect(result.body).toEqual({ runId: 'r-abc', accepted: true });
  });

  it('duplicate -> 202 with duplicate marker', () => {
    const result = httpErrorTranslation.startRun.facadeResult({
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
  ])('plan_rejected preserves stable reason for $code', (input) => {
    const result = httpErrorTranslation.startRun.facadeResult({
      kind: 'plan_rejected',
      accepted: false,
      code: input.code,
      reason: input.reason,
      cause: input.cause,
    });
    expectCanonicalErrorResponse(result, {
      status: 422,
      type: 'unprocessable',
      reason: input.expectedReason,
      details: {
        message: input.reason,
        cause: input.cause,
      },
    });
  });
});

describe('mapStartRunEngineError', () => {
  const engineErrorCases = [
    {
      description: 'adapter_not_registered -> 422',
      input: {
        kind: 'adapter_not_registered' as const,
        adapter: 'temporal',
      },
      expected: {
        status: 422,
        type: 'unprocessable',
        reason: 'adapter_not_configured',
        details: { adapter: 'temporal' },
      } satisfies CanonicalErrorExpectation,
    },
    {
      description: 'command_invalid -> 422 plan_rejected',
      input: {
        kind: 'command_invalid' as const,
        code: START_RUN_ENGINE_ERROR_CODE.planRefRequired,
        reason: START_RUN_ENGINE_ERROR_REASON.planRefRequired,
      },
      expected: {
        status: 422,
        type: 'unprocessable',
        reason: 'plan_rejected',
        details: {
          message: START_RUN_ENGINE_ERROR_REASON.planRefRequired,
          cause: 'plan_ref_required',
        },
      } satisfies CanonicalErrorExpectation,
    },
    {
      description: 'unsupported_plan_version -> 422 plan_rejected',
      input: {
        kind: 'unsupported_plan_version' as const,
        planVersion: '2.7',
        supportedVersions: ['1.0'],
      },
      expected: {
        status: 422,
        type: 'unprocessable',
        reason: 'unsupported_plan_version',
        details: {
          message: 'Unsupported plan version: 2.7',
          supportedVersions: ['1.0'],
        },
      } satisfies CanonicalErrorExpectation,
    },
  ] as const;

  it.each(engineErrorCases)('$description', ({ input, expected }) => {
    const result = httpErrorTranslation.startRun.engineError(input);
    expectCanonicalErrorResponse(result, expected);
  });
});

describe('mapRuntimeDomainError', () => {
  it.each([
    ['maps run metadata not found to 404', RunMetadataNotFoundError, 'run-1'],
    ['maps typed run not found errors to 404', RunNotFoundError, 'run-2'],
  ])('%s', (_desc, ErrorClass, runId) => {
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
    const result = httpErrorTranslation.runtime.domainError(
      Object.assign(new Error('intent conflict'), { code: 'INTENT_ACTIVE_CONFLICT' })
    );
    expect(result).toBeNull();
  });
});
