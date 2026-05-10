/**
 * Owned concern: normalize HTTP authorization header parsing for protected
 * runtime route handlers.
 */

export function extractBearerToken(header: string | undefined): string | undefined {
  if (!header) {
    return undefined;
  }

  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1];
}
