import type {
  DbReadyPayload,
  HealthzPayload,
  OptionalEndpointProbe,
  PlatformHealthSnapshot,
  ReadyzPayload,
  VersionPayload,
} from './types';
import { ApiError, createApiClient, resolveApiBaseUrl } from '../api/createApiClient';

const OPTIONAL_ENDPOINT_NOT_ENABLED_STATUS = new Set([403, 404, 405]);

async function readJsonBody<T>(response: Response, endpointLabel: string): Promise<T> {
  try {
    const body = (await response.json()) as T;
    return body;
  } catch {
    throw new Error(`${endpointLabel} returned a non-JSON response`);
  }
}

async function fetchRequiredJson<T>(
  requestRaw: (path: string) => Promise<Response>,
  path: string
): Promise<T> {
  const response = await requestRaw(path);
  if (!response.ok) {
    throw new ApiError({
      message: `${path} returned HTTP ${response.status}`,
      endpoint: path,
      statusCode: response.status,
      category: response.status >= 500 ? 'server' : 'client',
    });
  }

  return readJsonBody<T>(response, path);
}

async function fetchOptionalJson<T>(
  requestRaw: (path: string) => Promise<Response>,
  path: string
): Promise<OptionalEndpointProbe<T>> {
  try {
    const response = await requestRaw(path);

    if (OPTIONAL_ENDPOINT_NOT_ENABLED_STATUS.has(response.status)) {
      return {
        available: false,
        statusCode: response.status,
        data: null,
        error: null,
      };
    }

    const data = await readJsonBody<T>(response, path);
    return {
      available: true,
      statusCode: response.status,
      data,
      error: response.ok ? null : `${path} returned HTTP ${response.status}`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown platform endpoint error';
    return {
      available: true,
      statusCode: null,
      data: null,
      error: message,
    };
  }
}

export function createPlatformClient(apiBaseUrl = resolveApiBaseUrl()) {
  const apiClient = createApiClient(apiBaseUrl);
  const requestRaw = (path: string) =>
    apiClient.requestRaw(path, {
      method: 'GET',
      includeSessionHeaders: true,
    });

  return {
    async getPlatformHealthSnapshot(): Promise<PlatformHealthSnapshot> {
      const healthz = await fetchRequiredJson<HealthzPayload>(requestRaw, '/healthz');
      const [readyz, version, dbReady] = await Promise.all([
        fetchOptionalJson<ReadyzPayload>(requestRaw, '/readyz'),
        fetchOptionalJson<VersionPayload>(requestRaw, '/version'),
        fetchOptionalJson<DbReadyPayload>(requestRaw, '/db/ready'),
      ]);

      return {
        fetchedAt: new Date().toISOString(),
        apiBaseUrl,
        healthz,
        readyz,
        version,
        dbReady,
      };
    },
  };
}
