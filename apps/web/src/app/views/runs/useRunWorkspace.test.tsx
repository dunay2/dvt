// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { IRunsPort, RunSummaryItem, RunSnapshot } from '../../ports/runs';
import type { SessionContextPort, WorkspaceScope } from '../../ports/sessionContext';
import { AppServicesProvider } from '../../services/AppServicesContext';
import { makeMockRunRef, makeRunContext } from '../../testing/contractTestUtils';
import { useRunWorkspace } from './useRunWorkspace';

function HookHost({ runId }: Readonly<{ runId?: string }>): React.JSX.Element {
  const workspace = useRunWorkspace(runId);

  return (
    <div>
      <div data-testid="runs-loading">{String(workspace.isLoadingRuns)}</div>
      <div data-testid="workspace-loading">{String(workspace.isLoadingWorkspace)}</div>
      <div data-testid="runs">{workspace.runs.map((run) => run.runId).join(',')}</div>
      <div data-testid="workspace-environment">
        {workspace.workspace?.snapshot.environment ?? ''}
      </div>
    </div>
  );
}

function createReactiveSessionContext(initialScope: WorkspaceScope): {
  sessionContext: SessionContextPort;
  setWorkspaceScope: (update: Partial<WorkspaceScope>) => void;
} {
  let workspaceScope = initialScope;
  const listeners = new Set<() => void>();

  return {
    sessionContext: {
      getWorkspaceScope: () => workspaceScope,
      getWorkspaceScopeSnapshot: () => workspaceScope,
      subscribeWorkspaceScope: (onStoreChange) => {
        listeners.add(onStoreChange);
        return () => {
          listeners.delete(onStoreChange);
        };
      },
      buildRunContext: (runId) =>
        makeRunContext(runId, {
          tenantId: workspaceScope.tenantId,
          projectId: workspaceScope.projectId,
          environmentId: workspaceScope.environmentId,
          targetAdapter: workspaceScope.targetAdapter,
        }),
    },
    setWorkspaceScope: (update) => {
      workspaceScope = {
        ...workspaceScope,
        ...update,
      };
      listeners.forEach((listener) => listener());
    },
  };
}

function buildRunSummary(environmentId: string): RunSummaryItem {
  return {
    runId: `run-${environmentId}`,
    status: 'completed',
    environment: environmentId,
    startedAt: '2026-04-07T00:00:00Z',
  };
}

function buildRunSnapshot(runId: string, environmentId: string): RunSnapshot {
  return {
    runId,
    status: 'completed',
    environment: environmentId,
    startedAt: '2026-04-07T00:00:00Z',
  };
}

function buildRunsService(sessionContext: SessionContextPort): IRunsPort {
  return {
    listRunSummaries: vi.fn(async () => {
      const { environmentId } = sessionContext.getWorkspaceScope();
      return [buildRunSummary(environmentId)];
    }),
    getRunSnapshot: vi.fn(async (runId) => {
      const { environmentId } = sessionContext.getWorkspaceScope();
      return buildRunSnapshot(runId, environmentId);
    }),
    startRun: vi.fn(async (input) =>
      makeMockRunRef({
        runId: input.context.runId,
        tenantId: input.context.tenantId,
        workflowId: `wf_${input.context.runId}`,
      })
    ),
    listRunEvents: vi.fn(async () => ({
      events: [],
    })),
  };
}

describe('useRunWorkspace', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  afterEach(() => {
    const mountedRoot = root;
    if (mountedRoot) {
      act(() => {
        mountedRoot.unmount();
      });
    }
    container?.remove();
    root = null;
    container = null;
  });

  async function waitFor(predicate: () => boolean): Promise<void> {
    for (let attempt = 0; attempt < 30; attempt += 1) {
      if (predicate()) {
        return;
      }

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
    }

    throw new Error('Timed out waiting for useRunWorkspace to settle');
  }

  it('re-subscribes queries when the workspace scope changes', async () => {
    const { sessionContext, setWorkspaceScope } = createReactiveSessionContext({
      tenantId: 'tenant-a',
      projectId: 'project-a',
      environmentId: 'env-a',
      targetAdapter: 'mock',
    });
    const runsService = buildRunsService(sessionContext);

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    (
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT?: boolean;
      }
    ).IS_REACT_ACT_ENVIRONMENT = true;

    expect(root).not.toBeNull();

    await act(async () => {
      root!.render(
        <QueryClientProvider
          client={
            new QueryClient({
              defaultOptions: {
                queries: {
                  retry: false,
                },
              },
            })
          }
        >
          <AppServicesProvider
            overrides={{
              mode: 'mock',
              runsService,
              sessionContext,
            }}
          >
            <HookHost runId="run-detail" />
          </AppServicesProvider>
        </QueryClientProvider>
      );
    });

    await waitFor(
      () =>
        container?.querySelector('[data-testid="runs"]')?.textContent === 'run-env-a' &&
        container?.querySelector('[data-testid="workspace-environment"]')?.textContent === 'env-a'
    );

    expect(runsService.listRunSummaries).toHaveBeenCalledTimes(1);
    expect(runsService.getRunSnapshot).toHaveBeenCalledTimes(1);

    await act(async () => {
      setWorkspaceScope({
        tenantId: 'tenant-b',
        projectId: 'project-b',
        environmentId: 'env-b',
      });
    });

    await waitFor(
      () =>
        container?.querySelector('[data-testid="runs"]')?.textContent === 'run-env-b' &&
        container?.querySelector('[data-testid="workspace-environment"]')?.textContent === 'env-b'
    );

    expect(runsService.listRunSummaries).toHaveBeenCalledTimes(2);
    expect(runsService.getRunSnapshot).toHaveBeenCalledTimes(2);
  });
});
