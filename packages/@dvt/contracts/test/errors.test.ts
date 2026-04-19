import { describe, expect, it } from 'vitest';

import {
  ArtifactStoreError,
  AuthorizationError,
  CONTRACTS_ERROR_CODE,
  CONTRACTS_ERROR_MESSAGE_KEY,
  defaultContractsErrorMessage,
  IntentActiveConflictError,
  IntentDispatchConflictError,
  IntentInvalidTransitionError,
  IntentNotFoundError,
  StoreNotReadyError,
} from '../src/index.js';

describe('contracts: structured error contract', () => {
  it('stores stable code, messageKey, and messageParams on authorization and intent errors', () => {
    const authorizationError = new AuthorizationError();
    expect(authorizationError).toBeInstanceOf(Error);
    expect(authorizationError.name).toBe('AuthorizationError');
    expect(authorizationError.code).toBe(CONTRACTS_ERROR_CODE.AUTHZ_DENIED);
    expect(authorizationError.messageKey).toBe(CONTRACTS_ERROR_MESSAGE_KEY.AUTHZ_DENIED);
    expect(authorizationError.messageParams).toEqual({});
    expect(authorizationError.message).toBe('Authorization denied');

    const intentNotFoundError = new IntentNotFoundError('intent-1');
    expect(intentNotFoundError.code).toBe(CONTRACTS_ERROR_CODE.INTENT_NOT_FOUND);
    expect(intentNotFoundError.messageKey).toBe(CONTRACTS_ERROR_MESSAGE_KEY.INTENT_NOT_FOUND);
    expect(intentNotFoundError.messageParams).toEqual({ intentId: 'intent-1' });
    expect(intentNotFoundError.message).toBe('Intent not found: intent-1');

    const invalidTransitionError = new IntentInvalidTransitionError(
      'intent-1',
      'PENDING',
      'DISPATCHED'
    );
    expect(invalidTransitionError.code).toBe(CONTRACTS_ERROR_CODE.INTENT_INVALID_TRANSITION);
    expect(invalidTransitionError.messageKey).toBe(
      CONTRACTS_ERROR_MESSAGE_KEY.INTENT_INVALID_TRANSITION
    );
    expect(invalidTransitionError.messageParams).toEqual({
      intentId: 'intent-1',
      from: 'PENDING',
      to: 'DISPATCHED',
    });
    expect(invalidTransitionError.message).toBe(
      'Invalid intent transition for intent-1: PENDING -> DISPATCHED'
    );

    const activeConflictError = new IntentActiveConflictError('tenant-a', 'run-1');
    expect(activeConflictError.code).toBe(CONTRACTS_ERROR_CODE.INTENT_ACTIVE_CONFLICT);
    expect(activeConflictError.messageKey).toBe(CONTRACTS_ERROR_MESSAGE_KEY.INTENT_ACTIVE_CONFLICT);
    expect(activeConflictError.messageParams).toEqual({ tenantId: 'tenant-a', runId: 'run-1' });
    expect(activeConflictError.message).toBe(
      'Active intent conflict for tenant tenant-a, run run-1'
    );

    const dispatchConflictError = new IntentDispatchConflictError('intent-1');
    expect(dispatchConflictError.code).toBe(CONTRACTS_ERROR_CODE.INTENT_DISPATCH_CONFLICT);
    expect(dispatchConflictError.messageKey).toBe(
      CONTRACTS_ERROR_MESSAGE_KEY.INTENT_DISPATCH_CONFLICT
    );
    expect(dispatchConflictError.messageParams).toEqual({ intentId: 'intent-1' });
    expect(dispatchConflictError.message).toBe('Intent dispatch conflict: intent-1');

    const storeNotReadyError = new StoreNotReadyError();
    expect(storeNotReadyError.code).toBe(CONTRACTS_ERROR_CODE.STORE_NOT_READY);
    expect(storeNotReadyError.messageKey).toBe(CONTRACTS_ERROR_MESSAGE_KEY.STORE_NOT_READY);
    expect(storeNotReadyError.messageParams).toEqual({});
    expect(storeNotReadyError.message).toBe('Store not ready');
  });

  it('renders default contract messages from structured metadata', () => {
    expect(defaultContractsErrorMessage('AUTHZ_DENIED', {})).toBe('Authorization denied');
    expect(defaultContractsErrorMessage('INTENT_NOT_FOUND', { intentId: 'intent-1' })).toBe(
      'Intent not found: intent-1'
    );
  });

  it('uses typed artifact integrity failures instead of stringly messages', () => {
    expect(() =>
      (() => {
        throw ArtifactStoreError.integrityDigestMismatch('expected', 'actual');
      })()
    ).toThrowError(
      expect.objectContaining({
        code: CONTRACTS_ERROR_CODE.ARTIFACT_INTEGRITY_ERROR,
        messageKey: CONTRACTS_ERROR_MESSAGE_KEY.ARTIFACT_INTEGRITY_DIGEST_MISMATCH,
        messageParams: {
          expectedSha256: 'expected',
          actualSha256: 'actual',
        },
        message: 'Artifact digest mismatch: expected expected, actual actual',
      } satisfies Partial<ArtifactStoreError>)
    );

    expect(() =>
      (() => {
        throw ArtifactStoreError.integritySizeMismatch(10, 11);
      })()
    ).toThrowError(
      expect.objectContaining({
        code: CONTRACTS_ERROR_CODE.ARTIFACT_INTEGRITY_ERROR,
        messageKey: CONTRACTS_ERROR_MESSAGE_KEY.ARTIFACT_INTEGRITY_SIZE_MISMATCH,
        messageParams: {
          expectedBytes: 10,
          actualBytes: 11,
        },
        message: 'Artifact size mismatch: expected 10, actual 11',
      } satisfies Partial<ArtifactStoreError>)
    );
  });
});
