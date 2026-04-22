import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useSessionStore } from '../../stores/sessionStore';
import { createApiClient, resolveApiBaseUrl } from './createApiClient';

describe('createApiClient', () => {
  const originalSessionState = useSessionStore.getState();

  beforeEach(() => {
    useSessionStore.setState({
      tenantId: 'tenant-test',
      projectId: 'project-test',
      environmentId: 'env-test',
      targetAdapter: 'temporal',
    });
  });

  afterEach(() => {
    useSessionStore.setState({
      tenantId: originalSessionState.tenantId,
      projectId: originalSessionState.projectId,
      environmentId: originalSessionState.environmentId,
      targetAdapter: originalSessionState.targetAdapter,
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
        'X-Project-Id': 'project-test',
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
        'X-Project-Id': 'project-test',
        'X-Tenant-Id': 'tenant-test',
      },
      body: undefined,
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
