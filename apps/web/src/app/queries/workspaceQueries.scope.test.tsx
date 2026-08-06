// @vitest-environment jsdom

/** Owned concern: prove workspace query caches isolate server-granted project scopes. */
import { act } from 'react';
import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import { createAppServicesTestOverrides } from '../../testing/appServicesTestDoubles';
import { waitForReactQuery, withTestQueryClient } from '../../testing/reactQueryHarness';
import type { SessionContextPort, WorkspaceScope } from '../ports/sessionContext';
import type { IWorkspaceFilesQueryPort } from '../ports/workspace';
import { AppServicesProvider } from '../services/AppServicesContext';
import { queryKeys } from './queryKeys';
import { useWorkspaceFileTreeQuery } from './workspaceQueries';

const PROJECT_A: WorkspaceScope = {
  tenantId: 'tenant',
  projectId: 'project-a',
  environmentId: 'dev',
  targetAdapter: 'temporal',
};

const PROJECT_B: WorkspaceScope = {
  tenantId: 'tenant',
  projectId: 'project-b',
  environmentId: 'stage',
  targetAdapter: 'temporal',
};

describe('workspace query scope isolation', () => {
  it('loads and caches independent file trees while switching A to B to A', async () => {
    let scope = PROJECT_A;
    const subscribers = new Set<() => void>();
    const sessionContext: SessionContextPort = {
      getWorkspaceScope: () => scope,
      getWorkspaceScopeSnapshot: () => scope,
      subscribeWorkspaceScope: (subscriber) => {
        subscribers.add(subscriber);
        return () => subscribers.delete(subscriber);
      },
      buildRunContext: () => {
        throw new Error('Run context is outside this query test.');
      },
    };
    const workspaceFilesQuery: IWorkspaceFilesQueryPort = {
      listFiles: vi.fn(async () => [
        {
          path: `${scope.projectId}.sql`,
          name: `${scope.projectId}.sql`,
          kind: 'file' as const,
        },
      ]),
      getFileContent: vi.fn(),
    };
    let observedQuery: ReturnType<typeof useWorkspaceFileTreeQuery> | undefined;

    function Probe(): null {
      observedQuery = useWorkspaceFileTreeQuery();
      return null;
    }

    const mounted = await withTestQueryClient(
      <AppServicesProvider
        overrides={{
          ...createAppServicesTestOverrides(),
          sessionContext,
          workspaceFilesQuery,
        }}
      >
        <Probe />
      </AppServicesProvider>,
      new QueryClient({
        defaultOptions: {
          queries: { gcTime: Infinity, retry: false },
        },
      })
    );

    try {
      await waitForReactQuery(() => observedQuery?.data?.[0]?.path === 'project-a.sql');
      expect(subscribers.size).toBe(1);

      await act(async () => {
        scope = PROJECT_B;
        subscribers.forEach((subscriber) => subscriber());
      });
      await waitForReactQuery(() => observedQuery?.data?.[0]?.path === 'project-b.sql');

      await act(async () => {
        scope = PROJECT_A;
        subscribers.forEach((subscriber) => subscriber());
      });
      await waitForReactQuery(() => observedQuery?.data?.[0]?.path === 'project-a.sql');

      expect(workspaceFilesQuery.listFiles).toHaveBeenCalledTimes(3);
      expect(
        mounted.queryClient
          .getQueryCache()
          .getAll()
          .map((query) => query.queryKey)
      ).toContainEqual(queryKeys.workspace.fileTree('tenant::project-b::stage'));
      expect(
        mounted.queryClient.getQueryData(queryKeys.workspace.fileTree('tenant::project-a::dev'))
      ).toEqual([expect.objectContaining({ path: 'project-a.sql' })]);
      expect(
        mounted.queryClient.getQueryData(queryKeys.workspace.fileTree('tenant::project-b::stage'))
      ).toEqual([expect.objectContaining({ path: 'project-b.sql' })]);
    } finally {
      await mounted.cleanup();
    }
  });
});
