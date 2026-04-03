/**
 * @file packages/@dvt/contracts/src/errorContract.ts
 * @baseline ADR-0005: Contract Formalization Tooling
 * @baseline ADR-0006: Contract Tooling Governance
 * @baseline ADR-0018: Shared Kernel Ownership Governance
 * @decision Shared-kernel contract errors expose stable code/messageKey/messageParams metadata
 * @consequence Consumers branch on structured fields instead of parsing Error.message text
 * @version 1.0.0
 * @date 2026-04-03
 */

export const CONTRACTS_ERROR_CODE = {
  AUTHZ_DENIED: 'AUTHZ_DENIED',
  INTENT_NOT_FOUND: 'INTENT_NOT_FOUND',
  INTENT_INVALID_TRANSITION: 'INTENT_INVALID_TRANSITION',
  INTENT_ACTIVE_CONFLICT: 'INTENT_ACTIVE_CONFLICT',
  INTENT_DISPATCH_CONFLICT: 'INTENT_DISPATCH_CONFLICT',
  STORE_NOT_READY: 'STORE_NOT_READY',
  ARTIFACT_NOT_FOUND: 'ARTIFACT_NOT_FOUND',
  ARTIFACT_INTEGRITY_ERROR: 'ARTIFACT_INTEGRITY_ERROR',
  ARTIFACT_UPLOAD_FAILED: 'ARTIFACT_UPLOAD_FAILED',
  ARTIFACT_TENANT_MISMATCH: 'ARTIFACT_TENANT_MISMATCH',
  ARTIFACT_SIZE_EXCEEDED: 'ARTIFACT_SIZE_EXCEEDED',
  CONTRACT_VALIDATION_FAILED: 'CONTRACT_VALIDATION_FAILED',
  UNSUPPORTED_PLANNER_POLICY: 'UNSUPPORTED_PLANNER_POLICY',
} as const;

export type ContractsErrorCode = (typeof CONTRACTS_ERROR_CODE)[keyof typeof CONTRACTS_ERROR_CODE];

export const CONTRACTS_ERROR_MESSAGE_KEY = {
  AUTHZ_DENIED: 'contracts.error.authz_denied',
  INTENT_NOT_FOUND: 'contracts.error.intent_not_found',
  INTENT_INVALID_TRANSITION: 'contracts.error.intent_invalid_transition',
  INTENT_ACTIVE_CONFLICT: 'contracts.error.intent_active_conflict',
  INTENT_DISPATCH_CONFLICT: 'contracts.error.intent_dispatch_conflict',
  STORE_NOT_READY: 'contracts.error.store_not_ready',
  ARTIFACT_NOT_FOUND: 'contracts.error.artifact_not_found',
  ARTIFACT_INTEGRITY_DIGEST_MISMATCH: 'contracts.error.artifact_integrity_digest_mismatch',
  ARTIFACT_INTEGRITY_SIZE_MISMATCH: 'contracts.error.artifact_integrity_size_mismatch',
  ARTIFACT_UPLOAD_FAILED: 'contracts.error.artifact_upload_failed',
  ARTIFACT_TENANT_MISMATCH: 'contracts.error.artifact_tenant_mismatch',
  ARTIFACT_SIZE_EXCEEDED: 'contracts.error.artifact_size_exceeded',
  CONTRACT_VALIDATION_FAILED: 'contracts.validation.failed',
  UNSUPPORTED_PLANNER_POLICY: 'contracts.error.unsupported_planner_policy',
} as const;

export type ContractsErrorMessageKeyName = keyof typeof CONTRACTS_ERROR_MESSAGE_KEY;
export type ContractsErrorMessageKey =
  (typeof CONTRACTS_ERROR_MESSAGE_KEY)[ContractsErrorMessageKeyName];

interface ContractsErrorMessageParamMap {
  AUTHZ_DENIED: Record<string, never>;
  INTENT_NOT_FOUND: { intentId: string };
  INTENT_INVALID_TRANSITION: { intentId: string; from: string; to: string };
  INTENT_ACTIVE_CONFLICT: { tenantId: string; runId: string };
  INTENT_DISPATCH_CONFLICT: { intentId: string };
  STORE_NOT_READY: Record<string, never>;
  ARTIFACT_NOT_FOUND: { tenantId: string; sha256: string };
  ARTIFACT_INTEGRITY_DIGEST_MISMATCH: {
    expectedSha256: string;
    actualSha256: string;
  };
  ARTIFACT_INTEGRITY_SIZE_MISMATCH: {
    expectedBytes: number;
    actualBytes: number;
  };
  ARTIFACT_UPLOAD_FAILED: { reason: string };
  ARTIFACT_TENANT_MISMATCH: {
    expectedTenantId: string;
    actualTenantId: string;
  };
  ARTIFACT_SIZE_EXCEEDED: {
    sizeBytes: number;
    maxBytes: number;
  };
  CONTRACT_VALIDATION_FAILED: Record<string, never>;
  UNSUPPORTED_PLANNER_POLICY: {
    adapterId?: string;
    policyType: string;
    policyKind: string;
    reason: string;
  };
}

export type ContractsErrorMessageParams<
  K extends ContractsErrorMessageKeyName = ContractsErrorMessageKeyName,
> = Readonly<ContractsErrorMessageParamMap[K]>;

export type AnyContractsErrorMessageParams = {
  [K in ContractsErrorMessageKeyName]: ContractsErrorMessageParams<K>;
}[ContractsErrorMessageKeyName];

const EMPTY_MESSAGE_PARAMS = Object.freeze({}) as Readonly<Record<string, never>>;

export class DvtContractError<
  K extends ContractsErrorMessageKeyName = ContractsErrorMessageKeyName,
> extends Error {
  readonly cause: unknown = undefined;
  readonly details: unknown = undefined;
  readonly messageKey: (typeof CONTRACTS_ERROR_MESSAGE_KEY)[K];
  readonly messageParams: ContractsErrorMessageParams<K>;

  constructor(
    readonly code: ContractsErrorCode,
    messageKeyName: K,
    opts?: {
      cause?: unknown;
      details?: unknown;
      message?: string;
      messageParams?: ContractsErrorMessageParams<K>;
    }
  ) {
    const messageKey = CONTRACTS_ERROR_MESSAGE_KEY[messageKeyName];
    const messageParams = (opts?.messageParams ??
      EMPTY_MESSAGE_PARAMS) as ContractsErrorMessageParams<K>;
    super(opts?.message ?? defaultContractsErrorMessage(messageKeyName, messageParams));
    this.name = 'DvtContractError';
    this.cause = opts?.cause;
    this.details = opts?.details;
    this.messageKey = messageKey;
    this.messageParams = messageParams;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      messageKey: this.messageKey,
      messageParams: this.messageParams,
      message: this.message,
      cause:
        this.cause instanceof Error
          ? {
              name: this.cause.name,
              message: this.cause.message,
            }
          : this.cause,
      details: this.details,
    };
  }
}

export function defaultContractsErrorMessage<K extends ContractsErrorMessageKeyName>(
  messageKeyName: K,
  params: ContractsErrorMessageParams<K>
): string {
  switch (messageKeyName) {
    case 'AUTHZ_DENIED':
      return 'Authorization denied';
    case 'INTENT_NOT_FOUND': {
      const p = params as ContractsErrorMessageParams<'INTENT_NOT_FOUND'>;
      return `Intent not found: ${p.intentId}`;
    }
    case 'INTENT_INVALID_TRANSITION': {
      const p = params as ContractsErrorMessageParams<'INTENT_INVALID_TRANSITION'>;
      return `Invalid intent transition for ${p.intentId}: ${p.from} -> ${p.to}`;
    }
    case 'INTENT_ACTIVE_CONFLICT': {
      const p = params as ContractsErrorMessageParams<'INTENT_ACTIVE_CONFLICT'>;
      return `Active intent conflict for tenant ${p.tenantId}, run ${p.runId}`;
    }
    case 'INTENT_DISPATCH_CONFLICT': {
      const p = params as ContractsErrorMessageParams<'INTENT_DISPATCH_CONFLICT'>;
      return `Intent dispatch conflict: ${p.intentId}`;
    }
    case 'STORE_NOT_READY':
      return 'Store not ready';
    case 'ARTIFACT_NOT_FOUND': {
      const p = params as ContractsErrorMessageParams<'ARTIFACT_NOT_FOUND'>;
      return `Artifact not found for tenant ${p.tenantId}: ${p.sha256}`;
    }
    case 'ARTIFACT_INTEGRITY_DIGEST_MISMATCH': {
      const p = params as ContractsErrorMessageParams<'ARTIFACT_INTEGRITY_DIGEST_MISMATCH'>;
      return `Artifact digest mismatch: expected ${p.expectedSha256}, actual ${p.actualSha256}`;
    }
    case 'ARTIFACT_INTEGRITY_SIZE_MISMATCH': {
      const p = params as ContractsErrorMessageParams<'ARTIFACT_INTEGRITY_SIZE_MISMATCH'>;
      return `Artifact size mismatch: expected ${p.expectedBytes}, actual ${p.actualBytes}`;
    }
    case 'ARTIFACT_UPLOAD_FAILED': {
      const p = params as ContractsErrorMessageParams<'ARTIFACT_UPLOAD_FAILED'>;
      return `Artifact storage operation failed: ${p.reason}`;
    }
    case 'ARTIFACT_TENANT_MISMATCH': {
      const p = params as ContractsErrorMessageParams<'ARTIFACT_TENANT_MISMATCH'>;
      return `Artifact tenant mismatch: expected ${p.expectedTenantId}, actual ${p.actualTenantId}`;
    }
    case 'ARTIFACT_SIZE_EXCEEDED': {
      const p = params as ContractsErrorMessageParams<'ARTIFACT_SIZE_EXCEEDED'>;
      return `Artifact size exceeded: ${p.sizeBytes} bytes exceeds ${p.maxBytes} bytes`;
    }
    case 'CONTRACT_VALIDATION_FAILED':
      return 'Validation failed';
    case 'UNSUPPORTED_PLANNER_POLICY': {
      const p = params as ContractsErrorMessageParams<'UNSUPPORTED_PLANNER_POLICY'>;
      const adapter = p.adapterId ?? 'adapter';
      return `Unsupported planner policy for ${adapter}: ${p.policyType}.${p.policyKind} (${p.reason})`;
    }
  }
  return assertNever(messageKeyName);
}

function assertNever(value: never): never {
  throw new Error(`Unhandled contracts error message key: ${String(value)}`);
}
