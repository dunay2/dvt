import type { ApiClient, ApiRequestInit } from '../../../app/services/api/createApiClient';
import type {
  DbReadyDto,
  HealthzDto,
  ReadyzDto,
  VersionDto,
} from '../contracts/platformHealthDtos';

export function createApiClientStub(
  requestRaw: ApiClient['requestRaw'],
  baseUrl = 'http://localhost:3000'
): ApiClient {
  return {
    baseUrl,
    requestRaw,
    getJson: async () => {
      throw new Error('Not implemented in platform health tests');
    },
    postJson: async () => {
      throw new Error('Not implemented in platform health tests');
    },
  };
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function textResponse(body: string, status = 200, contentType = 'text/plain'): Response {
  return new Response(body, {
    status,
    headers: { 'Content-Type': contentType },
  });
}

export function createHealthzDto(): HealthzDto {
  return {
    ok: true,
    status: 'healthy',
    components: {
      intentReconciler: {
        status: 'healthy',
      },
    },
  };
}

export function createReadyzDto(): ReadyzDto {
  return {
    ok: true,
    status: 'ready',
  };
}

export function createVersionDto(): VersionDto {
  return {
    name: 'dvt-api',
    version: '1.2.3',
  };
}

export function createDbReadyDto(overrides: Partial<DbReadyDto> = {}): DbReadyDto {
  return {
    ok: true,
    reason: undefined,
    ...overrides,
  };
}

export type RecordedApiRequest = {
  endpoint: string;
  init: ApiRequestInit | undefined;
};

export function createApiRequestRecorder(
  respond: (endpoint: string, init?: ApiRequestInit) => Response | Promise<Response>
): {
  requestRaw: ApiClient['requestRaw'];
  requests: RecordedApiRequest[];
} {
  const requests: RecordedApiRequest[] = [];

  return {
    requestRaw: async (endpoint, init) => {
      requests.push({ endpoint, init });
      return respond(endpoint, init);
    },
    requests,
  };
}
