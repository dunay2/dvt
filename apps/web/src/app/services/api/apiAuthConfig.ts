/** Owned concern: resolve explicit API bearer-token posture for frontend clients. */

type EnvSource = Record<string, unknown>;
type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

const TOKEN_EXPIRATION_REFRESH_SKEW_SECONDS = 30;

type CachedApiBearerToken = Readonly<{
  configuredToken: string | undefined;
  refreshUrl: string;
  token: string;
}>;

let cachedApiBearerToken: CachedApiBearerToken | undefined;

function readNonBlankEnv(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalizedValue = value.trim();
  return normalizedValue.length > 0 ? normalizedValue : undefined;
}

function decodeJwtPayload(token: string): Record<string, unknown> | undefined {
  const [, payloadSegment] = token.split('.');
  if (!payloadSegment) {
    return undefined;
  }

  try {
    const normalizedSegment = payloadSegment.replaceAll('-', '+').replaceAll('_', '/');
    const paddedSegment = normalizedSegment.padEnd(
      Math.ceil(normalizedSegment.length / 4) * 4,
      '='
    );
    const payload = JSON.parse(atob(paddedSegment)) as unknown;

    return payload != null && typeof payload === 'object' && !Array.isArray(payload)
      ? (payload as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
}

function resolveJwtExpirationSeconds(token: string): number | undefined {
  const expiration = decodeJwtPayload(token)?.exp;

  return typeof expiration === 'number' ? expiration : undefined;
}

function isExpiredOrExpiring(token: string, nowSeconds = Math.floor(Date.now() / 1000)): boolean {
  const expirationSeconds = resolveJwtExpirationSeconds(token);

  return (
    expirationSeconds !== undefined &&
    expirationSeconds <= nowSeconds + TOKEN_EXPIRATION_REFRESH_SKEW_SECONDS
  );
}

function readBearerTokenRefreshPayload(payload: unknown): string | undefined {
  if (payload == null || typeof payload !== 'object' || Array.isArray(payload)) {
    return undefined;
  }

  return readNonBlankEnv((payload as Record<string, unknown>).bearerToken);
}

function readCachedApiBearerToken(
  configuredToken: string | undefined,
  refreshUrl: string | undefined
): string | undefined {
  if (
    cachedApiBearerToken === undefined ||
    refreshUrl === undefined ||
    cachedApiBearerToken.configuredToken !== configuredToken ||
    cachedApiBearerToken.refreshUrl !== refreshUrl
  ) {
    return undefined;
  }

  if (isExpiredOrExpiring(cachedApiBearerToken.token)) {
    cachedApiBearerToken = undefined;
    return undefined;
  }

  return cachedApiBearerToken.token;
}

function cacheApiBearerToken(
  configuredToken: string | undefined,
  refreshUrl: string,
  token: string
): void {
  cachedApiBearerToken = {
    configuredToken,
    refreshUrl,
    token,
  };
}

export function resolveApiBearerToken(env: EnvSource = import.meta.env): string | undefined {
  return readNonBlankEnv(env.VITE_API_BEARER_TOKEN);
}

export function resolveApiBearerTokenRefreshUrl(
  env: EnvSource = import.meta.env
): string | undefined {
  return readNonBlankEnv(env.VITE_API_BEARER_TOKEN_REFRESH_URL);
}

export function canRefreshApiBearerToken(env: EnvSource = import.meta.env): boolean {
  return resolveApiBearerTokenRefreshUrl(env) !== undefined;
}

async function refreshApiBearerToken(
  refreshUrl: string,
  fetcher: FetchLike
): Promise<string | undefined> {
  const response = await fetcher(refreshUrl, {
    method: 'POST',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    return undefined;
  }

  try {
    const refreshedToken = readBearerTokenRefreshPayload(await response.json());

    return refreshedToken !== undefined && !isExpiredOrExpiring(refreshedToken)
      ? refreshedToken
      : undefined;
  } catch {
    return undefined;
  }
}

export async function resolveApiBearerTokenForRequest(
  env: EnvSource = import.meta.env,
  options: { fetcher?: FetchLike; forceRefresh?: boolean } = {}
): Promise<string | undefined> {
  const configuredToken = resolveApiBearerToken(env);
  const refreshUrl = resolveApiBearerTokenRefreshUrl(env);
  const cachedToken = readCachedApiBearerToken(configuredToken, refreshUrl);

  if (!options.forceRefresh && cachedToken !== undefined) {
    return cachedToken;
  }

  const shouldRefresh =
    options.forceRefresh || configuredToken === undefined || isExpiredOrExpiring(configuredToken);

  if (shouldRefresh && refreshUrl !== undefined && typeof globalThis.fetch === 'function') {
    const refreshedToken = await refreshApiBearerToken(
      refreshUrl,
      options.fetcher ?? globalThis.fetch.bind(globalThis)
    );

    if (refreshedToken !== undefined) {
      cacheApiBearerToken(configuredToken, refreshUrl, refreshedToken);
      return refreshedToken;
    }
  }

  if (configuredToken !== undefined && isExpiredOrExpiring(configuredToken)) {
    return undefined;
  }

  return configuredToken;
}
