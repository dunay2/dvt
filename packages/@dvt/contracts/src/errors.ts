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
  public readonly code = 'AUTHZ_DENIED' as const;

  constructor(message = 'Authorization denied') {
    super(message);
    this.name = 'AuthorizationError';
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}

export class IntentNotFoundError extends Error {
  readonly code = 'INTENT_NOT_FOUND' as const;

  constructor(intentId: string) {
    super(`Start-run intent not found: ${intentId}`);
    this.name = 'IntentNotFoundError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class IntentInvalidTransitionError extends Error {
  readonly code = 'INTENT_INVALID_TRANSITION' as const;

  constructor(intentId: string, from: string, to: string) {
    super(`Cannot transition intent ${intentId} from ${from} to ${to}`);
    this.name = 'IntentInvalidTransitionError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class StoreNotReadyError extends Error {
  readonly code = 'STORE_NOT_READY' as const;

  constructor(message: string) {
    super(message);
    this.name = 'StoreNotReadyError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
