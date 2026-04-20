import type {
  DesignGraphDraft,
} from '@dvt/contracts';
import { vi } from 'vitest';

import {
  buildCanvasHarnessDraftReadResult,
  projectCanvasHarnessRemoteDraftRecord,
  resolveCanvasHarnessDraftSave,
} from './useCanvasController.test.draftAuthoring';
import type {
  CanvasHarnessMocks,
  CanvasHarnessState,
  MockFn,
} from './useCanvasController.test.types';
import type { PlanViewModel } from '../../types/plans';
import type { WorkspaceGraphDraftAuthoringSaveResult } from '../../ports/workspaceGraphDraftAuthoring';
import type { WorkspaceGraphDraftRecord } from '../../ports/workspace';

type MutableStoreState = CanvasHarnessState['store'] & {
  selectedNodes: string[];
  setSelectedNodes: MockFn;
  inspectorNodeId: string | null;
  setInspectorNode: MockFn;
  currentPlan: PlanViewModel | null;
  setCurrentPlan: MockFn;
};

function resolveCurrentGraphDraftQueryData(state: CanvasHarnessState): WorkspaceGraphDraftRecord | null {
  if (state.graphDraftQueryData !== undefined) {
    return state.graphDraftQueryData;
  }

  return projectCanvasHarnessRemoteDraftRecord(state.remoteDraftRecord);
}

export function configureCanvasHarnessStoreStateMocks(state: CanvasHarnessState): void {
  const storeState = state.store as MutableStoreState;

  storeState.setSelectedNodes.mockImplementation((nodeIds: string[]) => {
    storeState.selectedNodes = nodeIds;
  });
  storeState.setInspectorNode.mockImplementation((nodeId: string | null) => {
    storeState.inspectorNodeId = nodeId;
  });
  storeState.setCurrentPlan.mockImplementation((plan: PlanViewModel | null) => {
    storeState.currentPlan = plan;
    state.currentPlan = plan;
  });
}

export function configureCanvasHarnessDraftTransportMocks(state: CanvasHarnessState): void {
  (state.services.workspaceService.getGraphSnapshot as MockFn).mockImplementation(async () => ({
    nodes: [...state.graphData.nodes],
    edges: [...state.graphData.edges],
  }));

  (state.services.workspaceGraphDraftAuthoringPort.readGraphDraft as MockFn).mockImplementation(
    async () =>
      state.remoteDraftRecord == null
        ? ({ kind: 'not_found' } as const)
        : buildCanvasHarnessDraftReadResult(state.remoteDraftRecord)
  );

  (state.services.workspaceGraphDraftAuthoringPort.saveGraphDraft as MockFn).mockImplementation(
    async ({
      draft,
      expectedRevision,
    }: {
      draft: DesignGraphDraft;
      expectedRevision: string | null;
    }): Promise<WorkspaceGraphDraftAuthoringSaveResult> => {
      const resolution = resolveCanvasHarnessDraftSave({
        currentRecord: state.remoteDraftRecord,
        draft,
        expectedRevision,
        sessionContext: state.services.sessionContext,
      });
      state.remoteDraftRecord = resolution.nextRecord;
      state.graphDraftQueryData = projectCanvasHarnessRemoteDraftRecord(state.remoteDraftRecord);
      return resolution.result;
    }
  );
}

export function configureCanvasHarnessQueryClientMocks(
  state: CanvasHarnessState,
  mocks: CanvasHarnessMocks
): void {
  mocks.useQuery.mockImplementation((queryConfig?: { queryKey?: readonly string[] }) => {
    const queryKey = queryConfig?.queryKey ?? [];
    if (queryKey[1] === 'graph-draft') {
      return { data: resolveCurrentGraphDraftQueryData(state), isPending: false, isError: false };
    }

    return { data: state.graphData, isPending: false, isError: false };
  });

  mocks.useQueryClient.mockReturnValue(state.queryClient);

  state.queryClient.setQueryData.mockImplementation(
    (
      queryKey: readonly unknown[],
      value:
        | WorkspaceGraphDraftRecord
        | null
        | { nodes: Array<{ id: string }>; edges: Array<{ id: string }> }
    ) => {
      if (queryKey[1] === 'graph-draft') {
        state.graphDraftQueryData = value as WorkspaceGraphDraftRecord | null;
      }

      if (queryKey[1] === 'graph') {
        state.graphData = value as { nodes: Array<{ id: string }>; edges: Array<{ id: string }> };
      }
    }
  );

  state.queryClient.fetchQuery.mockImplementation(
    async ({
      queryKey,
      queryFn,
    }: {
      queryKey?: readonly unknown[];
      queryFn?: () => Promise<unknown>;
    }) => {
      const resolvedValue = queryFn ? await queryFn() : undefined;

      if (queryKey?.[1] === 'graph-draft') {
        state.graphDraftQueryData = resolvedValue as WorkspaceGraphDraftRecord | null;
        return state.graphDraftQueryData;
      }

      if (queryKey?.[1] === 'graph') {
        state.graphData = resolvedValue as {
          nodes: Array<{ id: string }>;
          edges: Array<{ id: string }>;
        };
      }

      return resolvedValue;
    }
  );
}

export function configureCanvasHarnessLayoutMocks(state: CanvasHarnessState): void {
  state.store.setCanvasNodePositions.mockImplementation(
    (workspaceLayoutKey: string, positions: Record<string, { x: number; y: number }>) => {
      const canvasLayouts = state.store.canvasLayouts as Record<
        string,
        { nodePositions?: Record<string, { x: number; y: number }>; viewport?: unknown }
      >;
      state.store.canvasLayouts = {
        ...canvasLayouts,
        [workspaceLayoutKey]: {
          ...canvasLayouts[workspaceLayoutKey],
          nodePositions: positions,
        },
      };
    }
  );

  state.store.setCanvasViewport.mockImplementation(
    (workspaceLayoutKey: string, viewport: { x: number; y: number; zoom: number }) => {
      const canvasLayouts = state.store.canvasLayouts as Record<
        string,
        { nodePositions?: Record<string, { x: number; y: number }>; viewport?: unknown }
      >;
      state.store.canvasLayouts = {
        ...canvasLayouts,
        [workspaceLayoutKey]: {
          ...canvasLayouts[workspaceLayoutKey],
          viewport,
        },
      };
    }
  );
}
