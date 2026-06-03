import { vi } from 'vitest';

import type { ApiClient } from '../api/createApiClient';

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

export function httpErrorResponse(args: {
  type:
    | 'bad_request'
    | 'unauthorized'
    | 'forbidden'
    | 'not_found'
    | 'conflict'
    | 'unprocessable'
    | 'internal_server_error';
  reason: string;
  status: number;
  details?: Readonly<Record<string, unknown>>;
}): Response {
  return jsonResponse(
    {
      error: {
        type: args.type,
        reason: args.reason,
        ...(args.details === undefined ? {} : { details: args.details }),
      },
    },
    args.status
  );
}

type ApiWorkspacePortHarnessOptions = {
  requestRaw?: ApiClient['requestRaw'];
  getJson?: ApiClient['getJson'];
  postJson?: ApiClient['postJson'];
};

export function createApiClientHarness(options: ApiWorkspacePortHarnessOptions = {}) {
  const requestRawImpl: ApiClient['requestRaw'] =
    options.requestRaw ??
    (async () => {
      throw new Error('not used in this test');
    });
  const getJsonImpl: ApiClient['getJson'] =
    options.getJson ??
    (async () => {
      throw new Error('not used in this test');
    });
  const postJsonImpl: ApiClient['postJson'] =
    options.postJson ??
    (async () => {
      throw new Error('not used in this test');
    });
  const requestRaw = vi.fn(requestRawImpl);
  const getJson = vi.fn(getJsonImpl);
  const postJson = vi.fn(postJsonImpl);

  return {
    requestRaw,
    getJson,
    postJson,
    apiClient: {
      baseUrl: '',
      requestRaw: requestRaw as ApiClient['requestRaw'],
      getJson: getJson as ApiClient['getJson'],
      postJson: postJson as ApiClient['postJson'],
    } satisfies ApiClient,
  };
}
