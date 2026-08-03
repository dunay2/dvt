/** Owned concern: persist pending recovery command identities across browser reloads. */

export interface RecoveryCommandIdentity {
  readonly tenantId: string;
  readonly runId: string;
}

export interface RecoveryIdempotencyKeyStore {
  get(identity: RecoveryCommandIdentity): string | undefined;
  set(identity: RecoveryCommandIdentity, idempotencyKey: string): void;
  delete(identity: RecoveryCommandIdentity): void;
}

const STORAGE_PREFIX = 'dvt:run-recovery-idempotency:v1';

function storageKey(identity: RecoveryCommandIdentity): string {
  return `${STORAGE_PREFIX}:${encodeURIComponent(identity.tenantId)}:${encodeURIComponent(identity.runId)}`;
}

export function createBrowserRecoveryIdempotencyKeyStore(
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> = globalThis.localStorage
): RecoveryIdempotencyKeyStore {
  return {
    get: (identity) => storage.getItem(storageKey(identity)) ?? undefined,
    set: (identity, idempotencyKey) => storage.setItem(storageKey(identity), idempotencyKey),
    delete: (identity) => storage.removeItem(storageKey(identity)),
  };
}
