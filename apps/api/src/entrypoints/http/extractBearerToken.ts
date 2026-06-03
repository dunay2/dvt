export function extractBearerToken(authorizationHeader: string | undefined): string | undefined {
  if (authorizationHeader === undefined) return undefined;

  const scheme = 'bearer';
  if (authorizationHeader.slice(0, scheme.length).toLowerCase() !== scheme) return undefined;

  const separator = authorizationHeader.charAt(scheme.length);
  if (separator !== ' ' && separator !== '\t') return undefined;

  let tokenStart = scheme.length + 1;
  while (
    authorizationHeader.charAt(tokenStart) === ' ' ||
    authorizationHeader.charAt(tokenStart) === '\t'
  ) {
    tokenStart += 1;
  }

  const token = authorizationHeader.slice(tokenStart).trim();
  return token && token.length > 0 ? token : undefined;
}
