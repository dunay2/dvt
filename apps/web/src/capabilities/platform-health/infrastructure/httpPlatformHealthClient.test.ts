import { describe, expect, it, vi } from 'vitest';

import {
  createHttpPlatformHealthClient,
  PlatformHealthInfrastructureError,
} from './httpPlatformHealthClient';
import {
  createApiClientStub,
  createDbReadyDto,
  createHealthzDto,
  createReadyzDto,
  createVersionDto,
  jsonResponse,
  textResponse,
} from '../testing/platformHealthHttpHarness';

function mockEndpointResponse(endpoint: string): Response {
  switch (endpoint) {
    case '/healthz':
      return jsonResponse(createHealthzDto());
    case '/readyz':
      return jsonResponse(createReadyzDto());
    case '/version':
      return jsonResponse(createVersionDto());
    case '/db/ready':
      return jsonResponse(createDbReadyDto());
    default:
      throw new Error(`Unexpected endpoint: ${endpoint}`);
  }
}

describe('createHttpPlatformHealthClient', () => {
  describe('transport contract', () => {
    it('uses GET requests with session headers for every probe', async () => {
      const requestRaw = vi.fn(
        async (endpoint: string, init?: { method?: string; includeSessionHeaders?: boolean }) => {
          expect(init).toEqual({
            method: 'GET',
            includeSessionHeaders: true,
          });

          return mockEndpointResponse(endpoint);
        }
      );

      const client = createHttpPlatformHealthClient(createApiClientStub(requestRaw));

      await client.loadSnapshot();

      expect(requestRaw).toHaveBeenNthCalledWith(1, '/healthz', {
        method: 'GET',
        includeSessionHeaders: true,
      });
      expect(requestRaw).toHaveBeenNthCalledWith(2, '/readyz', {
        method: 'GET',
        includeSessionHeaders: true,
      });
      expect(requestRaw).toHaveBeenNthCalledWith(3, '/version', {
        method: 'GET',
        includeSessionHeaders: true,
      });
      expect(requestRaw).toHaveBeenNthCalledWith(4, '/db/ready', {
        method: 'GET',
        includeSessionHeaders: true,
      });
    });
  });

  describe('loadSnapshot', () => {
    it('loads a full healthy snapshot from the backend endpoints', async () => {
      const requestRaw = vi.fn(async (endpoint: string) => mockEndpointResponse(endpoint));

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
      const requestRaw = vi.fn(async (endpoint: string) => {
        if (endpoint === '/healthz') {
          return jsonResponse({ error: 'boom' }, 500);
        }

        return jsonResponse({});
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
      const requestRaw = vi.fn(async (endpoint: string) => {
        if (endpoint === '/healthz') {
          return textResponse('not-json');
        }

        return jsonResponse({});
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
      const requestRaw = vi.fn(async (endpoint: string) => {
        if (endpoint === '/healthz') {
          return jsonResponse(createHealthzDto());
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
      const requestRaw = vi.fn(async (endpoint: string) => {
        if (endpoint === '/healthz') {
          return jsonResponse(createHealthzDto());
        }

        if (endpoint === '/readyz') {
          throw new Error('socket hang up');
        }

        if (endpoint === '/version') {
          return jsonResponse(createVersionDto());
        }

        return jsonResponse(createDbReadyDto({ ok: false, reason: 'database offline' }), 503);
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
      const requestRaw = vi.fn(async (endpoint: string) => {
        if (endpoint === '/healthz') {
          return jsonResponse(createHealthzDto());
        }

        if (endpoint === '/version') {
          return textResponse('not-json');
        }

        return jsonResponse(createReadyzDto());
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
});
