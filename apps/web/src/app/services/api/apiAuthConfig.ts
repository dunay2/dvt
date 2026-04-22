/**
 * Owned concern: resolve explicit API bearer-token posture for frontend clients.
 */

type EnvSource = Record<string, unknown>;

function readNonBlankEnv(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalizedValue = value.trim();
  return normalizedValue.length > 0 ? normalizedValue : undefined;
}

export function resolveApiBearerToken(env: EnvSource = import.meta.env): string | undefined {
  return readNonBlankEnv(env.VITE_API_BEARER_TOKEN);
}
