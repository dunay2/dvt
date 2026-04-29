/** Owned concern: create typed frontend API clients with normalized auth, session headers, and transport errors. */

import { useSessionStore } from '../../stores/sessionStore';
import { canRefreshApiBearerToken, resolveApiBearerTokenForRequest } from './apiAuthConfig';

export type ApiErrorCategory = 'network' | 'unauthorized' | 'forbidden' | 'client' | 'server';

export class ApiError extends Error {
  readonly endpoint: string;
  readonly statusCode: number | null;
  readonly category: ApiErrorCategory;
  readonly responseBody: unknown;

  constructor(params: {
    message: string;
    endpoint: string;
    statusCode: number | null;
    category: ApiErrorCategory;
    responseBody?: unknown;
    cause?: unknown;
  }) {
    super(params.message, { cause: params.cause });
    this.name = 'ApiError';
    this.endpoint = params.endpoint;
    this.statusCode = params.statusCode;
    this.category = params.category;
    this.responseBody = params.responseBody ?? null;
  }
}

export type ApiRequestInit = Omit<RequestInit, 'body' | 'headers'> & {
  body?: BodyInit | null;
  headers?: HeadersInit;
  includeSessionHeaders?: boolean;
  jsonBody?: unknown;
};

export type ApiClient = {
  baseUrl: string;
  requestRaw: (endpoint: string, init?: ApiRequestInit) => Promise<Response>;
  getJson: <TResponse>(
    endpoint: string,
    init?: Omit<ApiRequestInit, 'method'>
  ) => Promise<TResponse>;
  postJson: <TRequest, TResponse>(
    endpoint: string,
    payload: TRequest,
    init?: Omit<ApiRequestInit, 'method' | 'jsonBody'>
  ) => Promise<TResponse>;
};

const apiBaseUrlRuntime = {
  defaultDevWebPort: '5173',
  defaultApiPort: '3000',
  normalize(value: string): string {
    return value.endsWith('/') ? value.slice(0, -1) : value;
  },
  inferLocal(): string {
    if (globalThis.window === undefined) {
      return '';
    }

    const { protocol, hostname, port } = globalThis.window.location;
    const locationPort = port.length > 0 ? `:${port}` : '';
    if (port === apiBaseUrlRuntime.defaultDevWebPort) {
      return `${protocol}//${hostname}:${apiBaseUrlRuntime.defaultApiPort}`;
    }

    return `${protocol}//${hostname}${locationPort}`;
  },
  buildRequestUrl(endpoint: string, normalizedBaseUrl: string): string {
    if (normalizedBaseUrl.length > 0) {
      return `${normalizedBaseUrl}${endpoint}`;
    }

    if (globalThis.window !== undefined) {
      return `${globalThis.window.location.origin}${endpoint}`;
    }

    throw new Error(
      'API base URL is required outside browser runtime. Set VITE_API_BASE_URL explicitly.'
    );
  },
} as const;

export function resolveApiBaseUrl(): string {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL;
  if (typeof configuredBaseUrl === 'string' && configuredBaseUrl.trim().length > 0) {
    return apiBaseUrlRuntime.normalize(configuredBaseUrl.trim());
  }

  return apiBaseUrlRuntime.inferLocal();
}

function categorizeStatus(statusCode: number | null): ApiErrorCategory {
  if (statusCode === null) {
    return 'network';
  }

  if (statusCode === 401) {
    return 'unauthorized';
  }

  if (statusCode === 403) {
    return 'forbidden';
  }

  if (statusCode >= 500) {
    return 'server';
  }

  return 'client';
}

async function parseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  try {
    const textBody = await response.text();
    return textBody.length > 0 ? textBody : null;
  } catch {
    return null;
  }
}

function toApiError(params: {
  endpoint: string;
  statusCode: number | null;
  responseBody?: unknown;
  cause?: unknown;
}): ApiError {
  const category = categorizeStatus(params.statusCode);
  const statusLabel = params.statusCode === null ? 'NETWORK' : String(params.statusCode);

  return new ApiError({
    message: `Request to ${params.endpoint} failed (${statusLabel})`,
    endpoint: params.endpoint,
    statusCode: params.statusCode,
    category,
    responseBody: params.responseBody,
    cause: params.cause,
  });
}

async function buildHeaders(
  customHeaders: HeadersInit | undefined,
  includeSessionHeaders: boolean,
  options: { forceRefreshBearerToken?: boolean } = {}
): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  const bearerToken = await resolveApiBearerTokenForRequest(import.meta.env, {
    forceRefresh: options.forceRefreshBearerToken,
  });

  if (bearerToken) {
    headers.Authorization = `Bearer ${bearerToken}`;
  }

  if (includeSessionHeaders) {
    const { tenantId, projectId } = useSessionStore.getState();
    headers['X-Tenant-Id'] = tenantId;
    headers['X-Project-Id'] = projectId;
  }

  if (!customHeaders) {
    return headers;
  }

  if (customHeaders instanceof Headers) {
    customHeaders.forEach((value, key) => {
      headers[key] = value;
    });
    return headers;
  }

  if (Array.isArray(customHeaders)) {
    for (const [key, value] of customHeaders) {
      headers[key] = value;
    }
    return headers;
  }

  return {
    ...headers,
    ...customHeaders,
  };
}

function canRetryRequestBody(body: BodyInit | null | undefined): boolean {
  return body == null || typeof body === 'string';
}

export function createApiClient(baseUrl = resolveApiBaseUrl()): ApiClient {
  const normalizedBaseUrl = apiBaseUrlRuntime.normalize(baseUrl);

  async function requestRaw(endpoint: string, init: ApiRequestInit = {}): Promise<Response> {
    const { includeSessionHeaders = true, jsonBody, headers: customHeaders, ...requestInit } = init;

    let body: BodyInit | null | undefined = requestInit.body;
    if (jsonBody !== undefined) {
      body = JSON.stringify(jsonBody);
    }

    async function dispatchRequest(forceRefreshBearerToken = false): Promise<Response> {
      const headers = await buildHeaders(customHeaders, includeSessionHeaders, {
        forceRefreshBearerToken,
      });

      if (jsonBody !== undefined) {
        headers['Content-Type'] = 'application/json';
      }

      return await fetch(apiBaseUrlRuntime.buildRequestUrl(endpoint, normalizedBaseUrl), {
        ...requestInit,
        headers,
        body,
      });
    }

    try {
      const response = await dispatchRequest();
      if (response.status !== 401 || !canRefreshApiBearerToken() || !canRetryRequestBody(body)) {
        return response;
      }

      return await dispatchRequest(true);
    } catch (error) {
      throw toApiError({
        endpoint,
        statusCode: null,
        cause: error,
      });
    }
  }

  async function requestJson<TResponse>(
    endpoint: string,
    init: ApiRequestInit
  ): Promise<TResponse> {
    const response = await requestRaw(endpoint, init);

    if (!response.ok) {
      throw toApiError({
        endpoint,
        statusCode: response.status,
        responseBody: await parseBody(response),
      });
    }

    if (response.status === 204) {
      return undefined as TResponse;
    }

    const parsedBody = await parseBody(response);
    return parsedBody as TResponse;
  }

  return {
    baseUrl: normalizedBaseUrl,
    requestRaw,
    getJson: (endpoint, init = {}) =>
      requestJson(endpoint, {
        ...init,
        method: 'GET',
      }),
    postJson: (endpoint, payload, init = {}) =>
      requestJson(endpoint, {
        ...init,
        method: 'POST',
        jsonBody: payload,
      }),
  };
}
