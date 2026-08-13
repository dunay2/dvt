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
  ] as const;

  it.each(staticEnvelopeCases)('$description', ({ buildResponse, expected }) => {
    expectCanonicalErrorResponse(buildResponse(), expected);
  });
});
