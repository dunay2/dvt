import { useSessionStore } from '../../stores/sessionStore';

const DEFAULT_DEV_WEB_PORT = '5173';
const DEFAULT_API_PORT = '3000';

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
  getJson: <TResponse>(endpoint: string, init?: Omit<ApiRequestInit, 'method'>) => Promise<TResponse>;
  postJson: <TRequest, TResponse>(
    endpoint: string,
    payload: TRequest,
    init?: Omit<ApiRequestInit, 'method' | 'jsonBody'>
  ) => Promise<TResponse>;
};

function normalizeBaseUrl(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

function inferLocalApiBaseUrl(): string {
  if (typeof window === 'undefined') {
    return `http://localhost:${DEFAULT_API_PORT}`;
  }

  const { protocol, hostname, port } = window.location;
  if (port === DEFAULT_DEV_WEB_PORT) {
    return `${protocol}//${hostname}:${DEFAULT_API_PORT}`;
  }

  return `${protocol}//${hostname}${port ? `:${port}` : ''}`;
}

export function resolveApiBaseUrl(): string {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL;
  if (typeof configuredBaseUrl === 'string' && configuredBaseUrl.trim().length > 0) {
    return normalizeBaseUrl(configuredBaseUrl.trim());
  }

  return inferLocalApiBaseUrl();
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

function buildHeaders(
  customHeaders: HeadersInit | undefined,
  includeSessionHeaders: boolean
): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

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

export function createApiClient(baseUrl = resolveApiBaseUrl()): ApiClient {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);

  async function requestRaw(endpoint: string, init: ApiRequestInit = {}): Promise<Response> {
    const {
      includeSessionHeaders = true,
      jsonBody,
      headers: customHeaders,
      ...requestInit
    } = init;
    const headers = buildHeaders(customHeaders, includeSessionHeaders);

    let body: BodyInit | null | undefined = requestInit.body;
    if (jsonBody !== undefined) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(jsonBody);
    }

    try {
      return await fetch(`${normalizedBaseUrl}${endpoint}`, {
        ...requestInit,
        headers,
        body,
      });
    } catch (error) {
      throw toApiError({
        endpoint,
        statusCode: null,
        cause: error,
      });
    }
  }

  async function requestJson<TResponse>(endpoint: string, init: ApiRequestInit): Promise<TResponse> {
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
