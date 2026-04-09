/**
 * @file packages/@dvt/contracts/src/errors.ts
 * @baseline ADR-0005: Contract Formalization Tooling
 * @baseline ADR-0006: Contract Tooling Governance
 * @baseline ADR-0018: Shared Kernel Ownership Governance
 * @decision Contract-level error types are centralized for deterministic cross-module semantics
 * @consequence Consumers branch on typed metadata instead of stringly Error.message values
 * @version 1.0.0
 * @date 2026-04-03
 */

import {
  CONTRACTS_ERROR_CODE,
  DvtContractError,
  type ContractsErrorMessageParams,
} from './errorContract.js';

export class AuthorizationError extends DvtContractError<'AUTHZ_DENIED'> {
  readonly code = CONTRACTS_ERROR_CODE.AUTHZ_DENIED;

  constructor(message?: string) {
    super(CONTRACTS_ERROR_CODE.AUTHZ_DENIED, 'AUTHZ_DENIED', {
      ...(message === undefined ? {} : { message }),
    });
    this.name = 'AuthorizationError';
  }
}

export class IntentNotFoundError extends DvtContractError<'INTENT_NOT_FOUND'> {
  readonly code = CONTRACTS_ERROR_CODE.INTENT_NOT_FOUND;

  constructor(readonly intentId: string) {
    const messageParams = { intentId } as const;
    super(CONTRACTS_ERROR_CODE.INTENT_NOT_FOUND, 'INTENT_NOT_FOUND', {
      messageParams,
    });
    this.name = 'IntentNotFoundError';
  }
}

export class IntentInvalidTransitionError extends DvtContractError<'INTENT_INVALID_TRANSITION'> {
  readonly code = CONTRACTS_ERROR_CODE.INTENT_INVALID_TRANSITION;

  constructor(
    readonly intentId: string,
    readonly from: string,
    readonly to: string
  ) {
    const messageParams = { intentId, from, to } as const;
    super(CONTRACTS_ERROR_CODE.INTENT_INVALID_TRANSITION, 'INTENT_INVALID_TRANSITION', {
      messageParams,
    });
    this.name = 'IntentInvalidTransitionError';
  }
}

export class IntentActiveConflictError extends DvtContractError<'INTENT_ACTIVE_CONFLICT'> {
  readonly code = CONTRACTS_ERROR_CODE.INTENT_ACTIVE_CONFLICT;

  constructor(
    readonly tenantId: string,
    readonly runId: string
  ) {
    const messageParams = { tenantId, runId } as const;
    super(CONTRACTS_ERROR_CODE.INTENT_ACTIVE_CONFLICT, 'INTENT_ACTIVE_CONFLICT', {
      messageParams,
    });
    this.name = 'IntentActiveConflictError';
  }
}

export class IntentDispatchConflictError extends DvtContractError<'INTENT_DISPATCH_CONFLICT'> {
  readonly code = CONTRACTS_ERROR_CODE.INTENT_DISPATCH_CONFLICT;

  constructor(readonly intentId: string) {
    const messageParams = { intentId } as const;
    super(CONTRACTS_ERROR_CODE.INTENT_DISPATCH_CONFLICT, 'INTENT_DISPATCH_CONFLICT', {
      messageParams,
    });
    this.name = 'IntentDispatchConflictError';
  }
}

export class StoreNotReadyError extends DvtContractError<'STORE_NOT_READY'> {
  readonly code = CONTRACTS_ERROR_CODE.STORE_NOT_READY;

  constructor(message?: string) {
    super(CONTRACTS_ERROR_CODE.STORE_NOT_READY, 'STORE_NOT_READY', {
      ...(message === undefined ? {} : { message }),
    });
    this.name = 'StoreNotReadyError';
  }
}

export type ArtifactErrorCode =
  | typeof CONTRACTS_ERROR_CODE.ARTIFACT_NOT_FOUND
  | typeof CONTRACTS_ERROR_CODE.ARTIFACT_INTEGRITY_ERROR
  | typeof CONTRACTS_ERROR_CODE.ARTIFACT_UPLOAD_FAILED
  | typeof CONTRACTS_ERROR_CODE.ARTIFACT_TENANT_MISMATCH
  | typeof CONTRACTS_ERROR_CODE.ARTIFACT_SIZE_EXCEEDED;

type ArtifactStoreMessageKeyName =
  | 'ARTIFACT_NOT_FOUND'
  | 'ARTIFACT_INTEGRITY_DIGEST_MISMATCH'
  | 'ARTIFACT_INTEGRITY_SIZE_MISMATCH'
  | 'ARTIFACT_UPLOAD_FAILED'
  | 'ARTIFACT_TENANT_MISMATCH'
  | 'ARTIFACT_SIZE_EXCEEDED';

export class ArtifactStoreError<
  K extends ArtifactStoreMessageKeyName = ArtifactStoreMessageKeyName,
> extends DvtContractError<K> {
  readonly code: ArtifactErrorCode;

  private constructor(
    code: ArtifactErrorCode,
    messageKeyName: K,
    messageParams: ContractsErrorMessageParams<K>,
    opts?: {
      cause?: unknown;
      details?: unknown;
      message?: string;
    }
  ) {
    super(code, messageKeyName, {
      messageParams,
      details: opts?.details ?? messageParams,
      cause: opts?.cause,
      ...(opts?.message === undefined ? {} : { message: opts.message }),
    });
    this.code = code;
    this.name = 'ArtifactStoreError';
  }

  static notFound(
    tenantId: string,
    sha256: string,
    cause?: unknown
  ): ArtifactStoreError<'ARTIFACT_NOT_FOUND'> {
    return new ArtifactStoreError(
      CONTRACTS_ERROR_CODE.ARTIFACT_NOT_FOUND,
      'ARTIFACT_NOT_FOUND',
      { tenantId, sha256 },
      { cause }
    );
  }

  static uploadFailed(
    reason: string,
    cause?: unknown
  ): ArtifactStoreError<'ARTIFACT_UPLOAD_FAILED'> {
    return new ArtifactStoreError(
      CONTRACTS_ERROR_CODE.ARTIFACT_UPLOAD_FAILED,
      'ARTIFACT_UPLOAD_FAILED',
      { reason },
      { cause }
    );
  }

  static tenantMismatch(
    expectedTenantId: string,
    actualTenantId: string
  ): ArtifactStoreError<'ARTIFACT_TENANT_MISMATCH'> {
    return new ArtifactStoreError(
      CONTRACTS_ERROR_CODE.ARTIFACT_TENANT_MISMATCH,
      'ARTIFACT_TENANT_MISMATCH',
      { expectedTenantId, actualTenantId }
    );
  }

  static sizeExceeded(
    sizeBytes: number,
    maxBytes: number
  ): ArtifactStoreError<'ARTIFACT_SIZE_EXCEEDED'> {
    return new ArtifactStoreError(
      CONTRACTS_ERROR_CODE.ARTIFACT_SIZE_EXCEEDED,
      'ARTIFACT_SIZE_EXCEEDED',
      { sizeBytes, maxBytes }
    );
  }

  static integrityDigestMismatch(
    expectedSha256: string,
    actualSha256: string
  ): ArtifactStoreError<'ARTIFACT_INTEGRITY_DIGEST_MISMATCH'> {
    return new ArtifactStoreError(
      CONTRACTS_ERROR_CODE.ARTIFACT_INTEGRITY_ERROR,
      'ARTIFACT_INTEGRITY_DIGEST_MISMATCH',
      { expectedSha256, actualSha256 }
    );
  }

  static integritySizeMismatch(
    expectedBytes: number,
    actualBytes: number
  ): ArtifactStoreError<'ARTIFACT_INTEGRITY_SIZE_MISMATCH'> {
    return new ArtifactStoreError(
      CONTRACTS_ERROR_CODE.ARTIFACT_INTEGRITY_ERROR,
      'ARTIFACT_INTEGRITY_SIZE_MISMATCH',
      { expectedBytes, actualBytes }
    );
  }
}
