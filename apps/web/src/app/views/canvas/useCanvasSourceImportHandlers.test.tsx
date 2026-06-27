// @vitest-environment jsdom

import React, { act } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useCanvasSourceImportHandlers } from './useCanvasSourceImportHandlers';

type LatestHook = ReturnType<typeof useCanvasSourceImportHandlers> | null;
type SourceImportHookHarness = {
  latest: () => LatestHook;
  render: () => Promise<void>;
  cleanup: () => void;
  spies: {
    invalidateInFlightSaveAttempt: ReturnType<typeof vi.fn>;
    setCurrentPlan: ReturnType<typeof vi.fn>;
    setDraftSession: ReturnType<typeof vi.fn>;
  };
};

function renderHookHost({
  invalidateInFlightSaveAttempt = vi.fn(),
}: {
  invalidateInFlightSaveAttempt?: ReturnType<typeof vi.fn>;
} = {}): SourceImportHookHarness {
  let latest: LatestHook = null;
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root: Root = createRoot(container);
  const setDraftSession = vi.fn();
  const setCurrentPlan = vi.fn();

  function HookHost(): null {
    latest = useCanvasSourceImportHandlers({
      state: {
        graphModel: {
          nodes: [],
          edges: [],
          setNodes: vi.fn(),
          setEdges: vi.fn(),
        },
      },
      effects: {
        setDraftSession,
        setSelectedNodes: vi.fn(),
        setInspectorNode: vi.fn(),
        showInspectorPanel: vi.fn(),
        setCurrentPlan,
        onLayoutComplete: vi.fn(),
        invalidateInFlightSaveAttempt,
      },
      policy: {
        canMutateGraph: true,
        workspaceLayoutKey: 'tenant-a::project-a::dev',
      },
    });
    return null;
  }

  return {
    latest: () => latest,
    render: async () => {
      await act(async () => {
        root.render(
          <QueryClientProvider client={queryClient}>
            <HookHost />
          </QueryClientProvider>
        );
      });
    },
    cleanup: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
      queryClient.clear();
    },
    spies: {
      invalidateInFlightSaveAttempt,
      setCurrentPlan,
      setDraftSession,
    },
  };
}

describe('useCanvasSourceImportHandlers', () => {
  const cleanupCallbacks: Array<() => void> = [];

  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;

  afterEach(() => {
    while (cleanupCallbacks.length > 0) {
      cleanupCallbacks.pop()?.();
    }
  });

  it('invalidates in-flight saves before adopting an imported draft revision', async () => {
    const harness = renderHookHost();
    cleanupCallbacks.push(harness.cleanup);
    await harness.render();

    await act(async () => {
      harness.latest()?.handleSourceImportComplete({
        success: true,
        sourcesCreated: 1,
        tablesImported: 1,
        yamlFiles: ['models/sources/src_erp.yml'],
        importedNodeIds: ['src_erp_orders'],
        grouping: 'schema',
        draftRevision: 'rev-imported',
        options: {
          includeColumns: true,
          addTests: false,
          addFreshness: false,
        },
      });
    });

    expect(harness.spies.invalidateInFlightSaveAttempt).toHaveBeenCalledTimes(1);
    expect(harness.spies.invalidateInFlightSaveAttempt.mock.invocationCallOrder[0]).toBeLessThan(
      harness.spies.setDraftSession.mock.invocationCallOrder[0] ?? Number.POSITIVE_INFINITY
    );
  });
});
