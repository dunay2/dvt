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

export class IntentActiveConflictError extends Error {
  readonly code = 'INTENT_ACTIVE_CONFLICT' as const;

  constructor(tenantId: string, runId: string) {
    super(`An active intent already exists for tenant=${tenantId} run=${runId}`);
    this.name = 'IntentActiveConflictError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class IntentDispatchConflictError extends Error {
  readonly code = 'INTENT_DISPATCH_CONFLICT' as const;

  constructor(intentId: string) {
    super(`Intent ${intentId} is already DISPATCHED with a different engineRunRef`);
    this.name = 'IntentDispatchConflictError';
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

// ─── Artifact store errors (G-2: typed error codes, no stringly-typed control flow) ─────

export type ArtifactErrorCode =
  | 'ARTIFACT_NOT_FOUND'
  | 'ARTIFACT_INTEGRITY_ERROR'
  | 'ARTIFACT_UPLOAD_FAILED'
  | 'ARTIFACT_TENANT_MISMATCH'
  | 'ARTIFACT_SIZE_EXCEEDED';

export class ArtifactStoreError extends Error {
  constructor(
    message: string,
    public readonly code: ArtifactErrorCode
  ) {
    super(message);
    this.name = 'ArtifactStoreError';
    Object.setPrototypeOf(this, ArtifactStoreError.prototype);
  }
}
