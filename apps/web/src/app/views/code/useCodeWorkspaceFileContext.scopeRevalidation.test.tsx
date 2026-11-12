// @vitest-environment jsdom
/** Withhold stale file evidence and isolate graph queries across granted workspace changes. */
import { type DbtProjectGraphProjection } from '@dvt/contracts';
import { QueryClient } from '@tanstack/react-query';
import { act } from 'react';
import { within } from '@testing-library/dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAppServicesTestOverrides } from '../../../testing/appServicesTestDoubles';
import { waitForReactQuery, withTestQueryClient } from '../../../testing/reactQueryHarness';
import { AppServicesProvider } from '../../services/AppServicesContext';
import { useCodeWorkspaceFileContext } from './useCodeWorkspaceFileContext';
import { queryKeys } from '../../queries/queryKeys';
import type { SessionContextPort, WorkspaceScope } from '../../ports/sessionContext';
import type { FileContent } from '../../ports/workspace';
import { resolveCodeInlineReferenceCopy } from './codeViewCopy';
import { contextFixture } from './codeWorkspaceFileContext.test-support';
import { createCodeContextHarness } from './useCodeWorkspaceFileContext.test-harness';

describe('Code file and workspace revalidation', () => {
  let h: ReturnType<typeof createCodeContextHarness>;
  beforeEach(() => {
    localStorage.clear();
    h = createCodeContextHarness();
  });
  afterEach(async () => {
    await h.cleanup();
  });

  it('withholds cached authority and definition while the file read is being revalidated', async () => {
    const inlineCopy = resolveCodeInlineReferenceCopy('en-US');
    await h.renderEntry();
    await h.analyzeReferences();
    await h.waitFor(() => h.container.querySelectorAll('[data-reference]').length === 2);
    const viewer = h.container.querySelector('[data-testid="code-file-viewer"]');
    const original = h.scenario.fixture.file.content;
    await act(async () => within(h.container).getByRole('button', { name: 'clientes' }).click());
    await h.waitFor(
      () =>
        h.container.querySelector('section[aria-label="clientes"] code')?.textContent === 'select 1'
    );

    let finishGraph!: (projection: DbtProjectGraphProjection) => void;
    let finishFile!: (file: FileContent) => void;
    const pendingGraph = new Promise<DbtProjectGraphProjection>((resolve) => {
      finishGraph = resolve;
    });
    h.scenario.fileRead = new Promise<FileContent>((resolve) => {
      finishFile = resolve;
    });
    h.graph.mockImplementationOnce(() => pendingGraph);
    const mixed: FileContent = {
      ...h.scenario.fixture.file,
      authoringAuthority: { kind: 'unresolved', reason: 'mixed_authority', canvasId: null },
    };
    let graphRefresh: Promise<void> | undefined;
    let fileRefresh: Promise<void> | undefined;
    try {
      await act(async () => {
        graphRefresh = h.client.refetchQueries({
          queryKey: queryKeys.workspace.dbtProjectGraphRoot(),
        });
      });
      await h.waitFor(() => h.graph.mock.calls.length === 2);
      await h.waitFor(() => h.container.querySelectorAll('[data-reference]').length === 0);
      expect(h.container.textContent).toContain(inlineCopy.contextCheckingMessage);
      await act(async () => {
        fileRefresh = h.client.refetchQueries({
          queryKey: ['workspace', 'file-content'],
          predicate: (q) => q.queryKey.at(-1) === h.scenario.fixture.file.path,
        });
      });
      await act(async () => {
        finishGraph(h.scenario.fixture.project);
        await graphRefresh;
      });
      await h.waitFor(() => !h.container.textContent?.includes(inlineCopy.contextCheckingMessage));
      expect(h.container.querySelectorAll('[data-reference]')).toHaveLength(0);
      expect(h.container.querySelector('section[aria-label="clientes"]')).toBeNull();
      expect(h.graph).toHaveBeenCalledTimes(2);
      expect(h.container.querySelector('[data-testid="code-file-viewer"]')).toBe(viewer);
      expect(viewer?.textContent).toBe(original);
      expect(h.container.querySelector('textarea')).toBeNull();
      expect(h.save).not.toHaveBeenCalled();
      await act(async () => {
        finishFile(mixed);
        await fileRefresh;
      });
      await h.waitFor(
        () => h.container.textContent?.includes(inlineCopy.unavailableMessage) === true
      );
      expect(h.container.querySelectorAll('[data-reference]')).toHaveLength(0);
      expect(h.graph).toHaveBeenCalledTimes(2);
    } finally {
      await act(async () => {
        finishGraph(h.scenario.fixture.project);
        finishFile(mixed);
        await Promise.all([graphRefresh, fileRefresh]);
      });
    }
  });

  it('uses a separate graph query after a granted workspace change', async () => {
    const fixture = contextFixture();
    let scope: WorkspaceScope = {
      tenantId: 'tenant-a',
      projectId: 'project-a',
      environmentId: 'dev',
      targetAdapter: 'temporal',
    };
    const subscribers = new Set<() => void>();
    const sessionContext: SessionContextPort = {
      getWorkspaceScope: () => scope,
      getWorkspaceScopeSnapshot: () => scope,
      subscribeWorkspaceScope: (fn) => {
        subscribers.add(fn);
        return () => {
          subscribers.delete(fn);
        };
      },
      buildRunContext: () => {
        throw new Error('Run is outside inspection.');
      },
    };
    const getProjectGraph = vi.fn(async () => fixture.project);
    function Probe(): null {
      useCodeWorkspaceFileContext({ file: fixture.file, project: undefined, allowed: true });
      return null;
    }
    const cache = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 60_000 } },
    });
    const mounted = await withTestQueryClient(
      <AppServicesProvider
        overrides={{
          ...createAppServicesTestOverrides(),
          sessionContext,
          dbtProjectGraphQueryPort: { getProjectGraph },
        }}
      >
        <Probe />
      </AppServicesProvider>,
      cache
    );
    try {
      await waitForReactQuery(() => getProjectGraph.mock.calls.length === 1);
      await act(async () => {
        scope = { ...scope, projectId: 'project-b' };
        subscribers.forEach((fn) => fn());
      });
      await waitForReactQuery(() => getProjectGraph.mock.calls.length === 2);
      expect(
        mounted.queryClient
          .getQueryCache()
          .getAll()
          .map((q) => q.queryKey)
      ).toEqual(
        expect.arrayContaining([
          queryKeys.workspace.dbtProjectGraph(
            'tenant-a',
            'project-a',
            'dev',
            fixture.project.authorityBinding.canvasId,
            'inline_code_demo',
            fixture.file.contentSha256
          ),
          queryKeys.workspace.dbtProjectGraph(
            'tenant-a',
            'project-b',
            'dev',
            fixture.project.authorityBinding.canvasId,
            'inline_code_demo',
            fixture.file.contentSha256
          ),
        ])
      );
    } finally {
      await mounted.cleanup();
    }
  });
});
