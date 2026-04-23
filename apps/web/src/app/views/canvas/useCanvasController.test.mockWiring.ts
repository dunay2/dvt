import type { WorkspaceGraphAuthoringDraft } from '@dvt/contracts';
import { vi } from 'vitest';

import {
  buildCanvasHarnessDraftReadResult,
  projectCanvasHarnessDraftReadModel,
  resolveCanvasHarnessDraftSave,
} from './useCanvasController.test.draftAuthoring';
import type {
  CanvasHarnessState,
  MockFn,
} from './useCanvasController.test.types';
import type { PlanViewModel } from '../../types/plans';
import type { WorkspaceGraphDraftAuthoringSaveResult } from '../../ports/workspaceGraphDraftAuthoring';

type MutableStoreState = CanvasHarnessState['store'] & {
  selectedNodes: string[];
  setSelectedNodes: MockFn;
  inspectorNodeId: string | null;
  setInspectorNode: MockFn;
  currentPlan: PlanViewModel | null;
  setCurrentPlan: MockFn;
};

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
      draft: WorkspaceGraphAuthoringDraft;
      expectedRevision: string | null;
    }): Promise<WorkspaceGraphDraftAuthoringSaveResult> => {
      const resolution = resolveCanvasHarnessDraftSave({
        currentRecord: state.remoteDraftRecord,
        draft,
        expectedRevision,
        sessionContext: state.services.sessionContext,
      });
      state.remoteDraftRecord = resolution.nextRecord;
      state.graphDraftQueryData = projectCanvasHarnessDraftReadModel(state.remoteDraftRecord);
      return resolution.result;
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
