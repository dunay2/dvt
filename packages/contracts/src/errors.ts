export class AuthorizationError extends Error {
  public readonly code = 'AUTHZ_DENIED' as const;

  constructor(message = 'Authorization denied') {
    super(message);
    this.name = 'AuthorizationError';
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}
