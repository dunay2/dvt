// @vitest-environment jsdom
import { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { QueryClient, type UseQueryResult } from '@tanstack/react-query';

import { createAppServicesTestOverrides } from '../../testing/appServicesTestDoubles';
import { waitForReactQuery, withTestQueryClient } from '../../testing/reactQueryHarness';
import type { SessionContextPort, WorkspaceScope } from '../ports/sessionContext';
import type { WarehouseConnection } from '../ports/workspace';
import { AppServicesProvider } from '../services/AppServicesContext';
import { queryKeys } from './queryKeys';
import {
  createWarehouseConnectionsQueryOptions,
  useWarehouseConnectionCatalogCache,
  useWarehouseConnectionsQuery,
} from './warehouseConnectionQueries';

const connection = (id: string): WarehouseConnection => ({
  id,
  name: id,
  type: 'postgres',
  database: 'warehouse',
});

function sessionHarness(): { port: SessionContextPort; select(projectId: string): void } {
  const base = createAppServicesTestOverrides().sessionContext!;
  let scope: WorkspaceScope = {
    tenantId: 'tenant',
    projectId: 'project-a',
    environmentId: 'dev',
    targetAdapter: 'temporal',
  };
  const listeners = new Set<() => void>();
  const port: SessionContextPort = {
    ...base,
    getWorkspaceScope: () => scope,
    getWorkspaceScopeSnapshot: () => scope,
    subscribeWorkspaceScope: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
  return {
    port,
    select(projectId: string) {
      scope = { ...scope, projectId };
      listeners.forEach((listener) => listener());
    },
  };
}

describe('shared warehouse connection query', () => {
  // The former Wizard and Inspector effects could issue independent requests for one catalog.
  it('shares one in-flight request between observers of the same granted scope', async () => {
    let complete!: (value: WarehouseConnection[]) => void;
    const list = vi.fn(
      () =>
        new Promise<WarehouseConnection[]>((resolve) => {
          complete = resolve;
        })
    );
    const session = sessionHarness();
    const port = { listWarehouseConnections: list };
    const states: UseQueryResult<readonly WarehouseConnection[], Error>[] = [];
    function Probe({ index }: { index: number }): null {
      states[index] = useWarehouseConnectionsQuery(port);
      return null;
    }
    const mounted = await withTestQueryClient(
      <AppServicesProvider
        overrides={{ ...createAppServicesTestOverrides(), sessionContext: session.port }}
      >
        <Probe index={0} />
        <Probe index={1} />
      </AppServicesProvider>
    );
    try {
      expect(list).toHaveBeenCalledTimes(1);
      await act(async () => {
        complete([connection('a')]);
      });
      await waitForReactQuery(() => states.every((state) => state.isSuccess));
      expect(states[0]!.data).toEqual(states[1]!.data);
    } finally {
      await mounted.cleanup();
    }
  });

  it('does not request a disabled or missing port', async () => {
    const list = vi.fn(async () => []);
    function Probe(): null {
      useWarehouseConnectionsQuery(undefined);
      useWarehouseConnectionsQuery({ listWarehouseConnections: list }, { enabled: false });
      return null;
    }
    const mounted = await withTestQueryClient(
      <AppServicesProvider overrides={createAppServicesTestOverrides()}>
        <Probe />
      </AppServicesProvider>
    );
    try {
      expect(list).not.toHaveBeenCalled();
    } finally {
      await mounted.cleanup();
    }
  });

  // An old request must never supply another project's rows, even when it completes last.
  it('isolates a late old-scope result from the new scope observer', async () => {
    let finishA!: (value: WarehouseConnection[]) => void;
    const list = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<WarehouseConnection[]>((resolve) => {
            finishA = resolve;
          })
      )
      .mockResolvedValue([connection('b')]);
    const session = sessionHarness();
    let observed!: UseQueryResult<readonly WarehouseConnection[], Error>;
    function Probe(): null {
      observed = useWarehouseConnectionsQuery({ listWarehouseConnections: list });
      return null;
    }
    const mounted = await withTestQueryClient(
      <AppServicesProvider
        overrides={{ ...createAppServicesTestOverrides(), sessionContext: session.port }}
      >
        <Probe />
      </AppServicesProvider>
    );
    try {
      await act(async () => {
        session.select('project-b');
      });
      await waitForReactQuery(() => observed.data?.[0]?.id === 'b');
      await act(async () => {
        finishA([connection('a')]);
      });
      expect(observed.data).toEqual([connection('b')]);
      expect(list).toHaveBeenCalledTimes(2);
    } finally {
      await mounted.cleanup();
    }
  });

  it('rejects a scheduled query when its captured scope is no longer selected', async () => {
    const session = sessionHarness();
    const list = vi.fn(async () => []);
    const options = createWarehouseConnectionsQueryOptions(
      { listWarehouseConnections: list },
      session.port,
      session.port.getWorkspaceScopeSnapshot()
    );
    session.select('project-b');
    await expect(options.queryFn()).rejects.toThrow(/scope/i);
    expect(list).not.toHaveBeenCalled();
  });

  it('preserves initial failure as error without a fabricated empty catalog', async () => {
    let observed!: UseQueryResult<readonly WarehouseConnection[], Error>;
    const port = { listWarehouseConnections: vi.fn().mockRejectedValue(new Error('denied')) };
    function Probe(): null {
      observed = useWarehouseConnectionsQuery(port);
      return null;
    }
    const mounted = await withTestQueryClient(
      <AppServicesProvider overrides={createAppServicesTestOverrides()}>
        <Probe />
      </AppServicesProvider>
    );
    try {
      await waitForReactQuery(() => observed.isError);
      expect(observed.data).toBeUndefined();
      expect(port.listWarehouseConnections).toHaveBeenCalledTimes(1);
    } finally {
      await mounted.cleanup();
    }
  });

  it('keeps a same-scope successful snapshot alongside an explicit refetch failure', async () => {
    let observed!: UseQueryResult<readonly WarehouseConnection[], Error>;
    const port = {
      listWarehouseConnections: vi
        .fn()
        .mockResolvedValueOnce([connection('a')])
        .mockRejectedValue(new Error('unavailable')),
    };
    function Probe(): null {
      observed = useWarehouseConnectionsQuery(port);
      return null;
    }
    const mounted = await withTestQueryClient(
      <AppServicesProvider overrides={createAppServicesTestOverrides()}>
        <Probe />
      </AppServicesProvider>
    );
    try {
      await waitForReactQuery(() => observed.isSuccess);
      await act(async () => {
        await observed.refetch();
      });
      await waitForReactQuery(() => observed.isRefetchError);
      expect(observed.data).toEqual([connection('a')]);
    } finally {
      await mounted.cleanup();
    }
  });

  // Updating ambient current scope after a command finishes would otherwise poison B's cache.
  it('accepts a command receipt only in its captured key and invalidates that exact key', async () => {
    const session = sessionHarness();
    let cache!: ReturnType<typeof useWarehouseConnectionCatalogCache>;
    function Probe(): null {
      cache = useWarehouseConnectionCatalogCache();
      return null;
    }
    const mounted = await withTestQueryClient(
      <AppServicesProvider
        overrides={{ ...createAppServicesTestOverrides(), sessionContext: session.port }}
      >
        <Probe />
      </AppServicesProvider>,
      new QueryClient({ defaultOptions: { queries: { gcTime: Infinity, retry: false } } })
    );
    try {
      const captured = cache.captureScope();
      const keyA = queryKeys.workspace.warehouseConnections('tenant', 'project-a', 'dev');
      const keyB = queryKeys.workspace.warehouseConnections('tenant', 'project-b', 'dev');
      mounted.queryClient.setQueryData(keyA, [connection('a')]);
      mounted.queryClient.setQueryData(keyB, [connection('b')]);
      const invalidate = vi.spyOn(mounted.queryClient, 'invalidateQueries');
      await act(async () => {
        session.select('project-b');
        await cache.acceptReceipt(captured, { ...connection('a'), name: 'Renamed A' });
      });
      expect(cache.isCurrentScope(captured)).toBe(false);
      expect(mounted.queryClient.getQueryData(keyA)).toEqual([
        { ...connection('a'), name: 'Renamed A' },
      ]);
      expect(mounted.queryClient.getQueryData(keyB)).toEqual([connection('b')]);
      expect(invalidate).toHaveBeenCalledWith({ queryKey: keyA, exact: true });
    } finally {
      await mounted.cleanup();
    }
  });

  it('does not manufacture a complete catalog from one receipt before the first snapshot', async () => {
    let cache!: ReturnType<typeof useWarehouseConnectionCatalogCache>;
    function Probe(): null {
      cache = useWarehouseConnectionCatalogCache();
      return null;
    }
    const mounted = await withTestQueryClient(
      <AppServicesProvider overrides={createAppServicesTestOverrides()}>
        <Probe />
      </AppServicesProvider>
    );
    try {
      const scope = cache.captureScope();
      await cache.acceptReceipt(scope, connection('new'));
      expect(
        mounted.queryClient.getQueryData(
          queryKeys.workspace.warehouseConnections(
            scope.tenantId,
            scope.projectId,
            scope.environmentId
          )
        )
      ).toBeUndefined();
    } finally {
      await mounted.cleanup();
    }
  });
});
