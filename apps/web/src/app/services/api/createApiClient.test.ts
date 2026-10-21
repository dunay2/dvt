// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useSessionStore } from '../../stores/sessionStore';
import { ApiError, createApiClient, resolveApiBaseUrl } from './createApiClient';

function encodeJwtSegment(payload: unknown): string {
  return btoa(JSON.stringify(payload)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function buildJwtWithExpiration(exp: number): string {
  return [
    encodeJwtSegment({ alg: 'RS256', typ: 'JWT' }),
    encodeJwtSegment({ exp }),
    'signature',
  ].join('.');
}

function readRequestUrl(input: RequestInfo | URL): string {
  if (input instanceof Request) {
    return input.url;
  }

  if (input instanceof URL) {
    return input.href;
  }

  return input;
}

describe('createApiClient', () => {
  const originalSessionState = useSessionStore.getState();

  beforeEach(() => {
    useSessionStore.setState({
      tenantId: 'tenant-test',
      projectId: 'project-test',
      environmentId: 'env-test',
      targetAdapter: 'temporal',
      availableTargetAdapters: ['temporal'],
      availableWorkspaces: [
        {
          tenantId: 'tenant-test',
          projectId: 'project-test',
          environmentId: 'env-test',
        },
      ],
      workspaceScopeSelectionStatus: 'selected',
      workspaceScopeSelectionRejectionReason: undefined,
      rejectedWorkspaceScope: undefined,
    });
  });

  afterEach(() => {
    useSessionStore.setState({
      tenantId: originalSessionState.tenantId,
      projectId: originalSessionState.projectId,
      environmentId: originalSessionState.environmentId,
      targetAdapter: originalSessionState.targetAdapter,
      availableTargetAdapters: originalSessionState.availableTargetAdapters,
      availableWorkspaces: originalSessionState.availableWorkspaces,
      workspaceScopeSelectionStatus: originalSessionState.workspaceScopeSelectionStatus,
      workspaceScopeSelectionRejectionReason:
        originalSessionState.workspaceScopeSelectionRejectionReason,
      rejectedWorkspaceScope: originalSessionState.rejectedWorkspaceScope,
    });
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('adds Authorization when a governed bearer token is configured', async () => {
    vi.stubEnv('VITE_API_BEARER_TOKEN', 'dev-bearer-token');
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);
    const apiClient = createApiClient('http://api.example');

    await apiClient.requestRaw('/workspace/graph/draft', { method: 'GET' });

    expect(fetchMock).toHaveBeenCalledWith('http://api.example/workspace/graph/draft', {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: 'Bearer dev-bearer-token',
        'X-Environment-Id': 'env-test',
        'X-Project-Id': 'project-test',
        'X-Target-Adapter': 'temporal',
        'X-Tenant-Id': 'tenant-test',
      },
      body: undefined,
    });
  });

  it('omits Authorization when no bearer token is configured', async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);
    const apiClient = createApiClient('http://api.example');

    await apiClient.requestRaw('/workspace/graph/draft', { method: 'GET' });

    expect(fetchMock).toHaveBeenCalledWith('http://api.example/workspace/graph/draft', {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'X-Environment-Id': 'env-test',
        'X-Project-Id': 'project-test',
        'X-Target-Adapter': 'temporal',
        'X-Tenant-Id': 'tenant-test',
      },
      body: undefined,
    });
  });

  it('omits an expired configured bearer token when no refresh endpoint is configured', async () => {
    vi.stubEnv('VITE_API_BEARER_TOKEN', buildJwtWithExpiration(1));
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);
    const apiClient = createApiClient('http://api.example');

    await apiClient.requestRaw('/workspace/graph/draft', { method: 'GET' });

    expect(fetchMock).toHaveBeenCalledWith('http://api.example/workspace/graph/draft', {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'X-Environment-Id': 'env-test',
        'X-Project-Id': 'project-test',
        'X-Target-Adapter': 'temporal',
        'X-Tenant-Id': 'tenant-test',
      },
      body: undefined,
    });
  });

  it('refreshes an expired configured bearer token before sending a protected request', async () => {
    const refreshUrl = 'http://auth.example/__dvt/local-protected-runtime/token';
    vi.stubEnv('VITE_API_BEARER_TOKEN', buildJwtWithExpiration(1));
    vi.stubEnv('VITE_API_BEARER_TOKEN_REFRESH_URL', refreshUrl);
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (readRequestUrl(input) === refreshUrl) {
        return new Response(JSON.stringify({ bearerToken: 'fresh-dev-bearer-token' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }

      return new Response(null, { status: 204 });
    });
    vi.stubGlobal('fetch', fetchMock);
    const apiClient = createApiClient('http://api.example');

    await apiClient.requestRaw('/workspace/graph/draft', { method: 'GET' });

    expect(fetchMock).toHaveBeenNthCalledWith(1, refreshUrl, {
      method: 'POST',
      headers: { Accept: 'application/json' },
    });
    expect(fetchMock).toHaveBeenNthCalledWith(2, 'http://api.example/workspace/graph/draft', {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: 'Bearer fresh-dev-bearer-token',
        'X-Environment-Id': 'env-test',
        'X-Project-Id': 'project-test',
        'X-Target-Adapter': 'temporal',
        'X-Tenant-Id': 'tenant-test',
      },
      body: undefined,
    });
  });

  it('refreshes the bearer token and retries once when the API rejects the first request', async () => {
    const refreshUrl = 'http://auth.example/__dvt/local-protected-runtime/token';
    const configuredToken = buildJwtWithExpiration(Math.floor(Date.now() / 1000) + 3600);
    vi.stubEnv('VITE_API_BEARER_TOKEN', configuredToken);
    vi.stubEnv('VITE_API_BEARER_TOKEN_REFRESH_URL', refreshUrl);
    let apiRequestCount = 0;
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (readRequestUrl(input) === refreshUrl) {
        return new Response(JSON.stringify({ bearerToken: 'fresh-dev-bearer-token' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }

      apiRequestCount += 1;
      return new Response(null, { status: apiRequestCount === 1 ? 401 : 204 });
    });
    vi.stubGlobal('fetch', fetchMock);
    const apiClient = createApiClient('http://api.example');

    await apiClient.requestRaw('/workspace/graph/draft', { method: 'GET' });

    expect(fetchMock).toHaveBeenNthCalledWith(1, 'http://api.example/workspace/graph/draft', {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${configuredToken}`,
        'X-Environment-Id': 'env-test',
        'X-Project-Id': 'project-test',
        'X-Target-Adapter': 'temporal',
        'X-Tenant-Id': 'tenant-test',
      },
      body: undefined,
    });
    expect(fetchMock).toHaveBeenNthCalledWith(2, refreshUrl, {
      method: 'POST',
      headers: { Accept: 'application/json' },
    });
    expect(fetchMock).toHaveBeenNthCalledWith(3, 'http://api.example/workspace/graph/draft', {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: 'Bearer fresh-dev-bearer-token',
        'X-Environment-Id': 'env-test',
        'X-Project-Id': 'project-test',
        'X-Target-Adapter': 'temporal',
        'X-Tenant-Id': 'tenant-test',
      },
      body: undefined,
    });
  });

  it('caches a refreshed bearer token after an API rejection for later requests', async () => {
    const refreshUrl = 'http://auth.example/__dvt/local-protected-runtime/token';
    const configuredToken = buildJwtWithExpiration(Math.floor(Date.now() / 1000) + 7200);
    vi.stubEnv('VITE_API_BEARER_TOKEN', configuredToken);
    vi.stubEnv('VITE_API_BEARER_TOKEN_REFRESH_URL', refreshUrl);
    let refreshRequestCount = 0;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (readRequestUrl(input) === refreshUrl) {
        refreshRequestCount += 1;
        return new Response(JSON.stringify({ bearerToken: 'fresh-dev-bearer-token' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }

      const authorization = (init?.headers as Record<string, string> | undefined)?.Authorization;
      return new Response(null, {
        status: authorization === 'Bearer fresh-dev-bearer-token' ? 204 : 401,
      });
    });
    vi.stubGlobal('fetch', fetchMock);
    const apiClient = createApiClient('http://api.example');

    await apiClient.requestRaw('/workspace/graph/draft', { method: 'GET' });
    await apiClient.requestRaw('/workspace/graph/draft', { method: 'GET' });

    expect(refreshRequestCount).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock).toHaveBeenNthCalledWith(4, 'http://api.example/workspace/graph/draft', {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: 'Bearer fresh-dev-bearer-token',
        'X-Environment-Id': 'env-test',
        'X-Project-Id': 'project-test',
        'X-Target-Adapter': 'temporal',
        'X-Tenant-Id': 'tenant-test',
      },
      body: undefined,
    });
  });

  it('rejects unreadable successful JSON with its received HTTP status and original cause', async () => {
    const response = new Response('{private invalid body', {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
    const fetchMock = vi.fn(async () => response);
    vi.stubGlobal('fetch', fetchMock);

    const error = await createApiClient('http://api.example')
      .getJson('/session')
      .catch((cause: unknown) => cause);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      endpoint: '/session',
      statusCode: 200,
      category: 'response',
      responseBody: null,
      cause: expect.any(SyntaxError),
    });
    expect((error as ApiError).message).not.toContain('private');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['application/json', new TypeError('Private stream failure')],
    ['application/json', new DOMException('Private stream abort', 'AbortError')],
    ['text/plain', new TypeError('Private text stream failure')],
  ])(
    'preserves a %s response stream failure without dispatching another request',
    async (contentType, cause) => {
      const response = new Response(
        new ReadableStream({
          start(controller) {
            controller.error(cause);
          },
        }),
        {
          status: 200,
          headers: { 'content-type': contentType },
        }
      );
      const fetchMock = vi.fn(async () => response);
      vi.stubGlobal('fetch', fetchMock);

      const error = await createApiClient('http://api.example')
        .getJson('/session')
        .catch((failure: unknown) => failure);

      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({
        endpoint: '/session',
        statusCode: 200,
        category: 'response',
        responseBody: null,
      });
      expect((error as ApiError).cause).toBe(cause);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    }
  );

  it.each([
    [401, 'unauthorized'],
    [403, 'forbidden'],
    [500, 'server'],
  ])('retains HTTP %s when its error envelope cannot be decoded', async (status, category) => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response('{invalid', {
            status,
            headers: { 'content-type': 'application/json' },
          })
      )
    );

    const error = await createApiClient('http://api.example')
      .getJson('/session')
      .catch((failure: unknown) => failure);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      endpoint: '/session',
      statusCode: status,
      category,
      responseBody: null,
      cause: expect.any(SyntaxError),
    });
  });

  it.each([
    ['null', 'application/json', 200, null],
    ['{"value":1}', 'application/json', 200, { value: 1 }],
    ['', 'text/plain', 200, null],
    ['plain response', 'text/plain', 200, 'plain response'],
    [null, 'application/json', 204, undefined],
  ])(
    'retains decoded %s with content type %s and status %s',
    async (body, contentType, status, expected) => {
      vi.stubGlobal(
        'fetch',
        vi.fn(
          async () =>
            new Response(body, {
              status,
              headers: { 'content-type': contentType },
            })
        )
      );

      await expect(createApiClient('http://api.example').getJson('/session')).resolves.toEqual(
        expected
      );
    }
  );

  it('leaves a raw response body with its caller', async () => {
    const response = new Response('{not decoded by requestRaw', {
      headers: { 'content-type': 'application/json' },
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => response)
    );

    await expect(createApiClient('http://api.example').requestRaw('/session')).resolves.toBe(
      response
    );
    expect(response.bodyUsed).toBe(false);
  });

  it('keeps a dispatch rejection distinct from a received response failure', async () => {
    const cause = new TypeError('Failed to fetch');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw cause;
      })
    );

    const error = await createApiClient('http://api.example')
      .getJson('/session')
      .catch((failure: unknown) => failure);

    expect(error).toMatchObject({
      endpoint: '/session',
      statusCode: null,
      category: 'network',
      cause,
    });
  });

  it('returns an empty inferred base URL outside browser runtime', () => {
    vi.stubGlobal('window', undefined);

    expect(resolveApiBaseUrl()).toBe('');
  });

  it('maps the local Vite dev port to the API port when inferring the base URL', () => {
    vi.stubGlobal('window', {
      location: {
        protocol: 'http:',
        hostname: 'localhost',
        port: '5173',
        origin: 'http://localhost:5173',
      },
    });

    expect(resolveApiBaseUrl()).toBe('http://localhost:3000');
  });
});
