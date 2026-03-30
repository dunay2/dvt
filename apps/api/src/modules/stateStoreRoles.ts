import type {
  IRunSnapshotStalenessQuery,
  IRunStateStoreMaintenance,
  IRunStateStoreRead,
  IRunStateStoreWrite,
} from '@dvt/engine';

type RunSnapshotStalenessReader = Pick<IRunSnapshotStalenessQuery, 'isSnapshotStale'>;

export type StateStoreRoleSource = IRunStateStoreRead &
  IRunStateStoreWrite &
  IRunStateStoreMaintenance &
  RunSnapshotStalenessReader;

export interface StateStoreRoleBindings {
  readonly read: IRunStateStoreRead;
  readonly write: IRunStateStoreWrite;
  readonly maintenance: IRunStateStoreMaintenance;
  readonly staleness: RunSnapshotStalenessReader;
}

const REQUIRED_METHODS = [
  'bootstrapRunTx',
  'appendAndEnqueueTx',
  'getRunMetadataByRunId',
  'listEvents',
  'listRuns',
  'getSnapshot',
  'rebuildSnapshot',
  'isSnapshotStale',
] as const;

function isStateStoreRoleSource(value: unknown): value is StateStoreRoleSource {
  if (value === null || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return REQUIRED_METHODS.every((method) => typeof candidate[method] === 'function');
}

export function bindStateStoreRoles(stateStore: StateStoreRoleSource): StateStoreRoleBindings {
  if (!isStateStoreRoleSource(stateStore)) {
    throw new Error(
      'STATE_STORE_ROLE_SOURCE_INVALID: explicit read/write/maintenance/staleness roles are required'
    );
  }

  return Object.freeze({
    read: stateStore,
    write: stateStore,
    maintenance: stateStore,
    staleness: stateStore,
  });
}
