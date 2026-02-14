export class AuthorizationError extends Error {
  readonly code = 'AUTHZ_DENIED' as const;

  constructor(message?: string) {
    super(message ?? 'authorization denied');
    this.name = 'AuthorizationError';
  }
}
