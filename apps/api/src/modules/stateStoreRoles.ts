/**
 * @ownedConcern Own API state-store role binding so runtime roots expose explicit read/write/maintenance faces.
 */
import type {
  IRunSnapshotStalenessQuery,
  IRunStateStoreMaintenance,
  IRunStateStoreRead,
  IRunStateStoreWrite,
} from '@dvt/engine';

export type StateStoreRoleSource = IRunStateStoreRead &
  IRunStateStoreWrite &
  IRunStateStoreMaintenance &
  Pick<IRunSnapshotStalenessQuery, 'isSnapshotStale'>;

const STATE_STORE_ROLE_BINDINGS_BRAND: unique symbol = Symbol('StateStoreRoleBindings');

export interface StateStoreRoleBindings {
  readonly [STATE_STORE_ROLE_BINDINGS_BRAND]: true;
  readonly read: IRunStateStoreRead;
  readonly write: IRunStateStoreWrite;
  readonly maintenance: IRunStateStoreMaintenance;
  readonly snapshotStaleness: Pick<IRunSnapshotStalenessQuery, 'isSnapshotStale'>;
}

const REQUIRED_METHODS = [
  'bootstrapRunTx',
  'appendAndEnqueueTx',
  'saveProviderRef',
  'reserveRetryAttempt',
  'getRunMetadataByRunId',
  'listEvents',
  'listRuns',
  'getSnapshot',
  'rebuildSnapshot',
  'isSnapshotStale',
] as const;

function findMissingStateStoreRoleFunction(
  value: unknown
): (typeof REQUIRED_METHODS)[number] | null {
  if (value === null || typeof value !== 'object') {
    return REQUIRED_METHODS[0];
  }

  const candidate = value as Record<string, unknown>;
  return REQUIRED_METHODS.find((method) => typeof candidate[method] !== 'function') ?? null;
}

export function bindStateStoreRoles(stateStore: StateStoreRoleSource): StateStoreRoleBindings {
  const missingMethod = findMissingStateStoreRoleFunction(stateStore);
  if (missingMethod !== null) {
    throw new Error(`STATE_STORE_ROLE_SOURCE_INVALID: missing function ${missingMethod}`);
  }

  const bindings: StateStoreRoleBindings = {
    [STATE_STORE_ROLE_BINDINGS_BRAND]: true,
    read: stateStore,
    write: stateStore,
    maintenance: stateStore,
    snapshotStaleness: stateStore,
  };

  Object.defineProperty(bindings, STATE_STORE_ROLE_BINDINGS_BRAND, {
    value: true,
    enumerable: false,
  });

  return Object.freeze(bindings);
}
