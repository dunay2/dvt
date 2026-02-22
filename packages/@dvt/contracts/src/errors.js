/**
 * @file packages/@dvt/contracts/src/errors.ts
 * @baseline ADR-0005: Contract Formalization Tooling
 * @baseline ADR-0006: Contract Tooling Governance
 * @decision Section 2 — Contract-level error types are centralized for deterministic cross-module semantics
 * @consequence Consumers share a canonical authorization error contract across engine and adapters
 * @version 1.0.0
 * @date 2026-02-21
 */
export class AuthorizationError extends Error {
  code = 'AUTHZ_DENIED';
  constructor(message = 'Authorization denied') {
    super(message);
    this.name = 'AuthorizationError';
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}
//# sourceMappingURL=errors.js.map
