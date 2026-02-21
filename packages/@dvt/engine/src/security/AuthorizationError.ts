/**
 * @file packages/@dvt/engine/src/security/AuthorizationError.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @decision Decision — Tenant access rejections are represented with a typed error and stable code
 * @consequence The engine security layer communicates authorization failures consistently
 * @version 1.0.0
 * @date 2026-02-21
 */
export class AuthorizationError extends Error {
  public readonly code = 'AUTHZ_DENIED' as const;

  constructor(message = 'Authorization denied') {
    super(message);
    this.name = 'AuthorizationError';
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}
