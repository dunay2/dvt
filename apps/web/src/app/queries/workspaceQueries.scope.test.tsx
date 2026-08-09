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
import { useWorkspaceFileContentQuery, useWorkspaceFileTreeQuery } from './workspaceQueries';

const COLLIDING_PATH = 'models/orders.sql';

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
          path: COLLIDING_PATH,
          name: 'orders.sql',
          kind: 'file' as const,
        },
      ]),
      getFileContent: vi.fn(async (path: string) => ({
        path,
        name: 'orders.sql',
        language: 'sql',
        content: `select '${scope.projectId}' as project_id`,
        contentSha256: scope.projectId === 'project-a' ? 'a'.repeat(64) : 'b'.repeat(64),
        lastModified: '2026-08-08T00:00:00.000Z',
      })),
    };
    let observedQuery: ReturnType<typeof useWorkspaceFileTreeQuery> | undefined;
    let observedContentQuery: ReturnType<typeof useWorkspaceFileContentQuery> | undefined;

    function Probe(): null {
      observedQuery = useWorkspaceFileTreeQuery();
      observedContentQuery = useWorkspaceFileContentQuery(COLLIDING_PATH);
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
      await waitForReactQuery(
        () =>
          observedQuery?.data?.[0]?.path === COLLIDING_PATH &&
          observedContentQuery?.data?.content.includes('project-a') === true
      );
      expect(subscribers.size).toBe(2);

      await act(async () => {
        scope = PROJECT_B;
        subscribers.forEach((subscriber) => subscriber());
      });
      await waitForReactQuery(
        () => observedContentQuery?.data?.content.includes('project-b') === true
      );

      await act(async () => {
        scope = PROJECT_A;
        subscribers.forEach((subscriber) => subscriber());
      });
      await waitForReactQuery(
        () => observedContentQuery?.data?.content.includes('project-a') === true
      );

      expect(workspaceFilesQuery.listFiles).toHaveBeenCalledTimes(3);
      expect(
        mounted.queryClient
          .getQueryCache()
          .getAll()
          .map((query) => query.queryKey)
      ).toContainEqual(queryKeys.workspace.fileTree('tenant::project-b::stage'));
      expect(
        mounted.queryClient.getQueryData(queryKeys.workspace.fileTree('tenant::project-a::dev'))
      ).toEqual([expect.objectContaining({ path: COLLIDING_PATH })]);
      expect(
        mounted.queryClient.getQueryData(queryKeys.workspace.fileTree('tenant::project-b::stage'))
      ).toEqual([expect.objectContaining({ path: COLLIDING_PATH })]);
      expect(
        mounted.queryClient.getQueryData(
          queryKeys.workspace.fileContent('tenant::project-a::dev', COLLIDING_PATH)
        )
      ).toEqual(expect.objectContaining({ content: expect.stringContaining('project-a') }));
      expect(
        mounted.queryClient.getQueryData(
          queryKeys.workspace.fileContent('tenant::project-b::stage', COLLIDING_PATH)
        )
      ).toEqual(expect.objectContaining({ content: expect.stringContaining('project-b') }));
    } finally {
      await mounted.cleanup();
    }
  });
});
