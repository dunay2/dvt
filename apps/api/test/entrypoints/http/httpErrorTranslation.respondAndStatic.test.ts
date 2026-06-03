import { describe, expect, it, vi } from 'vitest';

import { httpErrorTranslation } from '../../../src/entrypoints/http/httpErrorTranslation.js';

import {
  expectCanonicalErrorResponse,
  type CanonicalErrorExpectation,
  type CanonicalErrorResponse,
} from './httpErrorTranslation.test.support.js';

describe('httpErrorTranslation respond and static envelopes', () => {
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
