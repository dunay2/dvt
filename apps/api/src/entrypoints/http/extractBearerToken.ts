export function extractBearerToken(authorizationHeader: string | undefined): string | undefined {
  const match = authorizationHeader?.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();
  return token && token.length > 0 ? token : undefined;
}
