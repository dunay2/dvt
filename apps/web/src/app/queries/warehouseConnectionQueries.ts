/** Own shared scoped connection metadata queries; commands and credentials stay behind their ports. */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useSyncExternalStore } from 'react';

import type { SessionContextPort, WorkspaceScope } from '../ports/sessionContext';
import type { IWarehouseSourceImportPort, WarehouseConnection } from '../ports/workspace';
import { useSessionContext } from '../services/AppServicesContext';
import { queryKeys } from './queryKeys';

export type WarehouseConnectionCatalogScope = Readonly<
  Pick<WorkspaceScope, 'tenantId' | 'projectId' | 'environmentId'>
>;
type ConnectionListPort = Pick<IWarehouseSourceImportPort, 'listWarehouseConnections'>;

function sameScope(left: WarehouseConnectionCatalogScope, right: WarehouseConnectionCatalogScope) {
  return (
    left.tenantId === right.tenantId &&
    left.projectId === right.projectId &&
    left.environmentId === right.environmentId
  );
}

function connectionKey(scope: WarehouseConnectionCatalogScope) {
  return queryKeys.workspace.warehouseConnections(
    scope.tenantId,
    scope.projectId,
    scope.environmentId
  );
}

export function createWarehouseConnectionsQueryOptions(
  port: ConnectionListPort | undefined,
  session: SessionContextPort,
  scope: WarehouseConnectionCatalogScope
) {
  return {
    queryKey: connectionKey(scope),
    retry: false,
    queryFn: async (): Promise<readonly WarehouseConnection[]> => {
      // The existing port resolves its HTTP scope synchronously at invocation.
      if (!sameScope(scope, session.getWorkspaceScope()))
        throw new Error('Warehouse connection query scope changed.');
      if (port == null) throw new Error('Warehouse connection query port is unavailable.');
      return port.listWarehouseConnections();
    },
  };
}

export function useWarehouseConnectionsQuery(
  port: ConnectionListPort | undefined,
  options: Readonly<{ enabled?: boolean }> = {}
) {
  const session = useSessionContext();
  const scope = useSyncExternalStore(
    session.subscribeWorkspaceScope,
    session.getWorkspaceScopeSnapshot,
    session.getWorkspaceScopeSnapshot
  );
  return useQuery({
    ...createWarehouseConnectionsQueryOptions(port, session, scope),
    enabled: port != null && (options.enabled ?? true),
  });
}

/** Apply real command receipts to their captured scope, never the later ambient selection. */
export function useWarehouseConnectionCatalogCache() {
  const session = useSessionContext();
  const queryClient = useQueryClient();
  return useMemo(
    () => ({
      captureScope(): WarehouseConnectionCatalogScope {
        const { tenantId, projectId, environmentId } = session.getWorkspaceScope();
        return { tenantId, projectId, environmentId };
      },
      isCurrentScope(scope: WarehouseConnectionCatalogScope): boolean {
        return sameScope(scope, session.getWorkspaceScope());
      },
      async acceptReceipt(
        scope: WarehouseConnectionCatalogScope,
        connection: WarehouseConnection
      ): Promise<void> {
        const queryKey = connectionKey(scope);
        await queryClient.cancelQueries({ queryKey, exact: true });
        queryClient.setQueryData<readonly WarehouseConnection[]>(queryKey, (current) =>
          current == null
            ? undefined
            : [...current.filter((item) => item.id !== connection.id), connection].sort(
                (left, right) => left.name.localeCompare(right.name)
              )
        );
        await queryClient.invalidateQueries({ queryKey, exact: true });
      },
    }),
    [session, queryClient]
  );
}
