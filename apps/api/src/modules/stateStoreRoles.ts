import type {
  IRunStateStoreMaintenance,
  IRunStateStoreRead,
  IRunStateStoreWrite,
} from '@dvt/engine';

export type StateStoreRoleSource = IRunStateStoreRead &
  IRunStateStoreWrite &
  IRunStateStoreMaintenance;

export interface StateStoreRoleBindings {
  readonly read: StateStoreRoleSource;
  readonly write: StateStoreRoleSource;
  readonly maintenance: StateStoreRoleSource;
}

const REQUIRED_METHODS = [
  'bootstrapRunTx',
  'appendAndEnqueueTx',
  'getRunMetadataByRunId',
  'listEvents',
  'listRuns',
  'getSnapshot',
  'rebuildSnapshot',
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
      'STATE_STORE_ROLE_SOURCE_INVALID: explicit read/write/maintenance roles are required'
    );
  }

  return Object.freeze({
    read: stateStore,
    write: stateStore,
    maintenance: stateStore,
  });
}
