import { describe, expect, it, vi } from 'vitest';

import type { ApiClient } from '../../../app/services/api/createApiClient';
import { createHttpPlatformHealthClient, PlatformHealthInfrastructureError } from './httpPlatformHealthClient';

function createApiClientStub(
  requestRaw: ApiClient['requestRaw'],
  baseUrl = 'http://localhost:3000'
): ApiClient {
  return {
    baseUrl,
    requestRaw,
    getJson: vi.fn(),
    postJson: vi.fn(),
  };
}

function mockEndpointResponse(endpoint: string): Response {
  if (endpoint === '/healthz') {
    return new Response(
      JSON.stringify({
        ok: true,
        status: 'healthy',
        components: {
          intentReconciler: {
            status: 'healthy',
          },
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }
  if (endpoint === '/readyz') {
    return new Response(JSON.stringify({ ok: true, status: 'ready' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (endpoint === '/version') {
    return new Response(JSON.stringify({ name: 'dvt-api', version: '1.2.3' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (endpoint === '/db/ready') {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  throw new Error(`Unexpected endpoint: ${endpoint}`);
}

describe('createHttpPlatformHealthClient', () => {
  it('loads a full healthy snapshot from the backend endpoints', async () => {
    const requestRaw = vi.fn<ApiClient['requestRaw']>(async (endpoint) => {
      return mockEndpointResponse(endpoint);
    });

    const client = createHttpPlatformHealthClient(createApiClientStub(requestRaw));
    const snapshot = await client.loadSnapshot();

    expect(snapshot.apiBaseUrl).toBe('http://localhost:3000');
    expect(snapshot.healthz.data.status).toBe('healthy');
    expect(snapshot.readyz.availability).toBe('available');
    expect(snapshot.readyz.data?.status).toBe('ready');
    expect(snapshot.version.data?.version).toBe('1.2.3');
    expect(snapshot.dbReady.data?.ok).toBe(true);
  });

  it('fails when the required /healthz endpoint returns a server error', async () => {
    const requestRaw = vi.fn<ApiClient['requestRaw']>(async (endpoint) => {
      if (endpoint === '/healthz') {
        return new Response(JSON.stringify({ error: 'boom' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
    });

    const client = createHttpPlatformHealthClient(createApiClientStub(requestRaw));

    await expect(client.loadSnapshot()).rejects.toMatchObject({
      name: 'PlatformHealthInfrastructureError',
      endpoint: '/healthz',
      kind: 'http',
      statusCode: 500,
    } satisfies Partial<PlatformHealthInfrastructureError>);
  });

  it('fails when the required /healthz endpoint returns invalid JSON', async () => {
    const requestRaw = vi.fn<ApiClient['requestRaw']>(async (endpoint) => {
      if (endpoint === '/healthz') {
        return new Response('not-json', {
          status: 200,
          headers: { 'Content-Type': 'text/plain' },
        });
      }

      return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
    });

    const client = createHttpPlatformHealthClient(createApiClientStub(requestRaw));

    await expect(client.loadSnapshot()).rejects.toMatchObject({
      name: 'PlatformHealthInfrastructureError',
      endpoint: '/healthz',
      kind: 'invalid_json',
      statusCode: 200,
    } satisfies Partial<PlatformHealthInfrastructureError>);
  });

  it('treats optional endpoints returning 404 as not enabled', async () => {
    const requestRaw = vi.fn<ApiClient['requestRaw']>(async (endpoint) => {
      if (endpoint === '/healthz') {
        return new Response(
          JSON.stringify({
            ok: true,
            status: 'healthy',
            components: {
              intentReconciler: {
                status: 'healthy',
              },
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response('', { status: 404 });
    });

    const client = createHttpPlatformHealthClient(createApiClientStub(requestRaw));
    const snapshot = await client.loadSnapshot();

    expect(snapshot.readyz.availability).toBe('not_enabled');
    expect(snapshot.version.availability).toBe('not_enabled');
    expect(snapshot.dbReady.availability).toBe('not_enabled');
  });

  it('captures optional endpoint failures without failing the full snapshot', async () => {
    const requestRaw = vi.fn<ApiClient['requestRaw']>(async (endpoint) => {
      if (endpoint === '/healthz') {
        return new Response(
          JSON.stringify({
            ok: true,
            status: 'healthy',
            components: {
              intentReconciler: {
                status: 'healthy',
              },
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (endpoint === '/readyz') {
        throw new Error('socket hang up');
      }

      if (endpoint === '/version') {
        return new Response(JSON.stringify({ name: 'dvt-api', version: '1.2.3' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ ok: false, reason: 'database offline' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const client = createHttpPlatformHealthClient(createApiClientStub(requestRaw));
    const snapshot = await client.loadSnapshot();

    expect(snapshot.readyz.error).toMatchObject({
      kind: 'network',
    });
    expect(snapshot.version.data?.version).toBe('1.2.3');
    expect(snapshot.dbReady.data).toEqual({
      ok: false,
      reason: 'database offline',
    });
    expect(snapshot.dbReady.error).toMatchObject({
      kind: 'http',
      statusCode: 503,
      message: '/db/ready returned HTTP 503',
    });
  });

  it('preserves status code when an optional endpoint returns invalid JSON', async () => {
    const requestRaw = vi.fn<ApiClient['requestRaw']>(async (endpoint) => {
      if (endpoint === '/healthz') {
        return new Response(
          JSON.stringify({
            ok: true,
            status: 'healthy',
            components: {
              intentReconciler: {
                status: 'healthy',
              },
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (endpoint === '/version') {
        return new Response('not-json', {
          status: 200,
          headers: { 'Content-Type': 'text/plain' },
        });
      }

      return new Response(JSON.stringify({ ok: true, status: 'ready' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const client = createHttpPlatformHealthClient(createApiClientStub(requestRaw));
    const snapshot = await client.loadSnapshot();

    expect(snapshot.version.statusCode).toBe(200);
    expect(snapshot.version.data).toBeNull();
    expect(snapshot.version.error).toMatchObject({
      kind: 'invalid_json',
      statusCode: 200,
      message: '/version returned a non-JSON response',
    });
  });
});
