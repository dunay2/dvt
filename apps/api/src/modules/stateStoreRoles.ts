import type { PostgresStateStoreAdapter } from '@dvt/adapter-postgres';
import type {
  IRunStateStoreMaintenance,
  IRunStateStoreRead,
  IRunStateStoreWrite,
} from '@dvt/engine';

export interface StateStoreRoleBindings {
  readonly read: IRunStateStoreRead;
  readonly write: IRunStateStoreWrite;
  readonly maintenance: IRunStateStoreMaintenance;
}

export function bindStateStoreRoles(stateStore: PostgresStateStoreAdapter): StateStoreRoleBindings {
  return {
    read: stateStore,
    write: stateStore,
    maintenance: stateStore,
  };
}
