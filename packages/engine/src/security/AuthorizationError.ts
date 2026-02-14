export class AuthorizationError extends Error {
  public readonly code = 'AUTHZ_DENIED' as const;

  public constructor(message = 'Authorization denied') {
    super(message);
    this.name = 'AuthorizationError';
  }
}
