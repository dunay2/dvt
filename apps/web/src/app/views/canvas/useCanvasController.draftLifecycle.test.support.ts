import { act } from 'react';

import type { WorkspaceGraphDraft, WorkspaceGraphDraftRecord } from '../../ports/workspace';
import { setupCanvasControllerHarness } from './useCanvasController.test.harness';

export const WORKSPACE_LAYOUT_KEY = 'tenant-a::project-a::dev';

export type CanvasControllerHarness = ReturnType<typeof setupCanvasControllerHarness>;

type CanvasLayoutStoreState = {
  canvasLayouts: Record<
    string,
    {
      nodePositions?: Record<string, { x: number; y: number }>;
      viewport?: unknown;
    }
  >;
};

export function buildDraftRecord(
  draft: WorkspaceGraphDraft,
  revision = 'rev-1',
  savedAt = '2026-04-16T00:00:00Z'
): WorkspaceGraphDraftRecord {
  return {
    revision,
    savedAt,
    draft,
  };
}

export async function waitForAutosaveDebounce(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 450));
  });
}

export async function createHarnessWithDraft(
  record: WorkspaceGraphDraftRecord
): Promise<CanvasControllerHarness> {
  const harness = setupCanvasControllerHarness();
  harness.state.graphDraftRecord = record;
  await harness.renderProbe();
  await harness.renderProbe();
  return harness;
}

export function setCanvasLayoutNodePositions(
  harness: CanvasControllerHarness,
  nodePositions: Record<string, { x: number; y: number }>
): void {
  const storeState = harness.state.store as unknown as CanvasLayoutStoreState;
  storeState.canvasLayouts = {
    ...storeState.canvasLayouts,
    [WORKSPACE_LAYOUT_KEY]: {
      ...storeState.canvasLayouts[WORKSPACE_LAYOUT_KEY],
      nodePositions,
    },
  };
}
