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
  START_RUN_ENGINE_ERROR_CODE,
  START_RUN_ENGINE_ERROR_REASON,
} from '../../../src/application/ports/startRunContract.js';
import { httpErrorTranslation } from '../../../src/entrypoints/http/httpErrorTranslation.js';

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

describe('httpErrorTranslation admin helpers', () => {
  it('maps rebuild snapshot internal failures to a canonical 500 envelope', () => {
    const result = httpErrorTranslation.admin.rebuildSnapshotInternalError();
    expect(result).toEqual({
      status: 500,
      body: {
        error: {
          type: 'internal_server_error',
          reason: 'internal_error',
        },
      },
    });
  });
});

describe('httpErrorTranslation workspace graph draft helpers', () => {
  it('maps missing persisted drafts to a canonical 404 envelope', () => {
    const result = httpErrorTranslation.workspaceGraphDraft.read.notFound({
      correlationId: 'req-1',
      decisionId: 'dec-1',
    });
    expect(result).toEqual({
      status: 404,
      body: {
        error: {
          type: 'not_found',
          reason: 'workspace_graph_draft_not_found',
          details: {
            correlationId: 'req-1',
            decisionId: 'dec-1',
          },
        },
      },
    });
  });

  it('maps unsupported schema versions on save to a canonical 422 envelope', () => {
    const result = httpErrorTranslation.workspaceGraphDraft.write.unsupportedSchemaVersion();
    expect(result).toEqual({
      status: 422,
      body: {
        error: {
          type: 'unprocessable',
          reason: 'workspace_graph_draft_unsupported_schema_version',
          details: {
            expectedSchemaVersion: 'workspace-graph-draft.v1',
          },
        },
      },
    });
  });

  it('maps idempotency mismatches on save to a canonical 409 envelope', () => {
    const result = httpErrorTranslation.workspaceGraphDraft.write.idempotencyMismatch({
      correlationId: 'req-1',
      decisionId: 'dec-1',
    });
    expect(result).toEqual({
      status: 409,
      body: {
        error: {
          type: 'conflict',
          reason: 'workspace_graph_draft_idempotency_key_reused',
          details: {
            correlationId: 'req-1',
            decisionId: 'dec-1',
          },
        },
      },
    });
  });
});

describe('mapStartRunFacadeResult', () => {
  it('unauthenticated -> 401', () => {
    const result = httpErrorTranslation.startRun.facadeResult({
      kind: 'unauthenticated',
      code: 'MISSING_TOKEN',
    });
    expect(result.status).toBe(401);
    expect(result.body).toEqual({
      error: {
        type: 'unauthorized',
        reason: 'missing_token',
      },
    });
  });

  it('unauthorized -> 403', () => {
    const result = httpErrorTranslation.startRun.facadeResult({
      kind: 'unauthorized',
      reason: 'TENANT_NOT_GRANTED',
    });
    expect(result.status).toBe(403);
    expect(result.body).toEqual({
      error: {
        type: 'forbidden',
        reason: 'tenant_not_granted',
      },
    });
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

  it('tenant_backpressure -> 429 with Retry-After', () => {
    const result = httpErrorTranslation.startRun.facadeResult({
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
    const result = httpErrorTranslation.startRun.facadeResult({
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
    const result = httpErrorTranslation.startRun.facadeResult({
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
    const result = httpErrorTranslation.startRun.engineError({
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
    const result = httpErrorTranslation.startRun.engineError({
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
    const result = httpErrorTranslation.startRun.engineError({
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
    const result = httpErrorTranslation.runtime.domainError(new ErrorClass(runId));
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
    const result = httpErrorTranslation.runtime.domainError(
      new SignalNotImplementedError('PROVIDER_PRIVATE_COMMAND')
    );
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
    const result = httpErrorTranslation.runtime.domainError(
      new AdapterNotRegisteredError('temporal')
    );
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

  it('maps authorization errors to 403 forbidden', () => {
    const result = httpErrorTranslation.runtime.domainError(
      new AuthorizationError('TENANT_ACCESS_DENIED')
    );
    expect(result).toEqual({
      status: 403,
      body: {
        error: {
          type: 'forbidden',
          reason: 'tenant_access_denied',
        },
      },
    });
  });

  it('maps duplicate engine errors to 409 conflict', () => {
    const result = httpErrorTranslation.runtime.domainError(
      new RunAlreadyExistsError('run-dup')
    );
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

  it('maps non-terminal recovery source errors to 422', () => {
    const result = httpErrorTranslation.runtime.domainError(
      new RecoverySourceNotTerminalError('run-source', 'RUNNING')
    );
    expect(result).toEqual({
      status: 422,
      body: {
        error: {
          type: 'unprocessable',
          reason: 'source_run_not_terminal',
          details: {
            runId: 'run-source',
            status: 'RUNNING',
          },
        },
      },
    });
  });

  it('does not classify arbitrary code-only errors as run conflicts', () => {
    const result = httpErrorTranslation.runtime.domainError(
      Object.assign(new Error('intent conflict'), { code: 'INTENT_ACTIVE_CONFLICT' })
    );
    expect(result).toBeNull();
  });

  it('maps outbox rate limit errors to 429', () => {
    const result = httpErrorTranslation.runtime.domainError(
      new OutboxRateLimitExceededError('tenant-a')
    );
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
