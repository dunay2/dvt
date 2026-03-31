import type { ApiClient } from '../../../app/services/api/createApiClient';
import {
  ApiError,
  createApiClient,
  resolveApiBaseUrl,
} from '../../../app/services/api/createApiClient';
import { resolveDataSource } from '../../../app/services/config/dataSource';
import type {
  DbReadyDto,
  HealthzDto,
  ReadyzDto,
  VersionDto,
} from '../contracts/platformHealthDtos';
import type {
  OptionalEndpointProbe,
  PlatformDatabaseReadiness,
  PlatformEndpointFailure,
  PlatformEndpointFailureKind,
  PlatformHealthInfo,
  PlatformHealthSnapshot,
  PlatformReadinessInfo,
  PlatformVersionInfo,
  RequiredEndpointProbe,
} from '../domain/platformHealthTypes';

const OPTIONAL_ENDPOINT_NOT_ENABLED_STATUS = new Set([403, 404, 405]);

export class PlatformHealthInfrastructureError extends Error {
  readonly endpoint: string;
  readonly kind: PlatformEndpointFailureKind;
  readonly statusCode: number | null;

  constructor(params: {
    endpoint: string;
    kind: PlatformEndpointFailureKind;
    statusCode: number | null;
    message: string;
    cause?: unknown;
  }) {
    super(params.message, { cause: params.cause });
    this.name = 'PlatformHealthInfrastructureError';
    this.endpoint = params.endpoint;
    this.kind = params.kind;
    this.statusCode = params.statusCode;
  }
}

function now(): number {
  return performance.now();
}

function buildLatency(startedAt: number): number {
  return Math.round(now() - startedAt);
}

function resolveErrorStatusCode(error: unknown): number | null {
  if (error instanceof PlatformHealthInfrastructureError) {
    return error.statusCode;
  }

  if (error instanceof ApiError) {
    return error.statusCode;
  }

  return null;
}

function toProbeFailure(
  endpoint: string,
  error: unknown,
  statusCode: number | null = null
): PlatformEndpointFailure {
  if (error instanceof PlatformHealthInfrastructureError) {
    return {
      kind: error.kind,
      message: error.message,
      statusCode: error.statusCode,
    };
  }

  if (error instanceof ApiError) {
    return {
      kind: error.statusCode === null ? 'network' : 'http',
      message: error.message,
      statusCode: error.statusCode,
    };
  }

  return {
    kind: statusCode === null ? 'network' : 'http',
    message: error instanceof Error ? error.message : `Unknown platform error at ${endpoint}`,
    statusCode,
  };
}

async function readJsonBody<T>(response: Response, endpoint: string): Promise<T> {
  try {
    return (await response.json()) as T;
  } catch (error) {
    throw new PlatformHealthInfrastructureError({
      endpoint,
      kind: 'invalid_json',
      statusCode: response.status,
      message: `${endpoint} returned a non-JSON response`,
      cause: error,
    });
  }
}

function mapHealthzDto(dto: HealthzDto): PlatformHealthInfo {
  return dto;
}

function mapReadyzDto(dto: ReadyzDto): PlatformReadinessInfo {
  return dto;
}

function mapVersionDto(dto: VersionDto): PlatformVersionInfo {
  return dto;
}

function mapDbReadyDto(dto: DbReadyDto): PlatformDatabaseReadiness {
  return {
    ok: dto.ok,
    reason: dto.reason ?? null,
  };
}

function handleRequestError(error: unknown, endpoint: string): never {
  throw new PlatformHealthInfrastructureError({
    endpoint,
    kind: error instanceof ApiError && error.statusCode !== null ? 'http' : 'network',
    statusCode: error instanceof ApiError ? error.statusCode : null,
    message: error instanceof Error ? error.message : `Request to ${endpoint} failed`,
    cause: error,
  });
}

function validateResponseOk(response: Response, endpoint: string): void {
  if (!response.ok) {
    throw new PlatformHealthInfrastructureError({
      endpoint,
      kind: 'http',
      statusCode: response.status,
      message: `${endpoint} returned HTTP ${response.status}`,
    });
  }
}

async function fetchRequiredProbe<TDto, TData>(
  requestRaw: (path: string) => Promise<Response>,
  endpoint: string,
  mapDto: (dto: TDto) => TData
): Promise<RequiredEndpointProbe<TData>> {
  const startedAt = now();
  let response: Response;
  try {
    response = await requestRaw(endpoint);
  } catch (error) {
    handleRequestError(error, endpoint);
  }
  validateResponseOk(response, endpoint);
  const dto = await readJsonBody<TDto>(response, endpoint);
  return {
    endpoint,
    availability: 'available',
    statusCode: response.status,
    latencyMs: buildLatency(startedAt),
    data: mapDto(dto),
    error: null,
  };
}

async function fetchOptionalProbe<TDto, TData>(
  requestRaw: (path: string) => Promise<Response>,
  endpoint: string,
  mapDto: (dto: TDto) => TData
): Promise<OptionalEndpointProbe<TData>> {
  const startedAt = now();
  try {
    const response = await requestRaw(endpoint);

    if (OPTIONAL_ENDPOINT_NOT_ENABLED_STATUS.has(response.status)) {
      return {
        endpoint,
        availability: 'not_enabled',
        statusCode: response.status,
        latencyMs: buildLatency(startedAt),
        data: null,
        error: null,
      };
    }

    const dto = await readJsonBody<TDto>(response, endpoint);

    return {
      endpoint,
      availability: 'available',
      statusCode: response.status,
      latencyMs: buildLatency(startedAt),
      data: mapDto(dto),
      error: response.ok
        ? null
        : {
            kind: 'http',
            message: `${endpoint} returned HTTP ${response.status}`,
            statusCode: response.status,
          },
    };
  } catch (error) {
    return {
      endpoint,
      availability: 'available',
      statusCode: resolveErrorStatusCode(error),
      latencyMs: buildLatency(startedAt),
      data: null,
      error: toProbeFailure(endpoint, error, resolveErrorStatusCode(error)),
    };
  }
}

export type HttpPlatformHealthClient = {
  loadSnapshot(): Promise<PlatformHealthSnapshot>;
};

export function createHttpPlatformHealthClient(
  apiClient: ApiClient = createApiClient(resolveApiBaseUrl())
): HttpPlatformHealthClient {
  const requestRaw = (path: string) =>
    apiClient.requestRaw(path, {
      method: 'GET',
      includeSessionHeaders: true,
    });

  return {
    async loadSnapshot(): Promise<PlatformHealthSnapshot> {
      const healthz = await fetchRequiredProbe<HealthzDto, PlatformHealthInfo>(
        requestRaw,
        '/healthz',
        mapHealthzDto
      );
      const [readyz, version, dbReady] = await Promise.all([
        fetchOptionalProbe<ReadyzDto, PlatformReadinessInfo>(requestRaw, '/readyz', mapReadyzDto),
        fetchOptionalProbe<VersionDto, PlatformVersionInfo>(requestRaw, '/version', mapVersionDto),
        fetchOptionalProbe<DbReadyDto, PlatformDatabaseReadiness>(
          requestRaw,
          '/db/ready',
          mapDbReadyDto
        ),
      ]);

      return {
        fetchedAt: new Date().toISOString(),
        apiBaseUrl: apiClient.baseUrl,
        dataSourceMode: resolveDataSource(),
        healthz,
        readyz,
        version,
        dbReady,
      };
    },
  };
}
