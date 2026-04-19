import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SaveWorkspaceGraphDraftResult } from '../../ports/workspace';
import {
  buildDraftRecord,
  type CanvasControllerHarness,
  setCanvasLayoutNodePositions,
  WORKSPACE_LAYOUT_KEY,
  waitForAutosaveDebounce,
} from './useCanvasController.draftLifecycle.test.support';
import {
  createReloadRecoveryHarness,
  reloadLatestDraft,
  replaceHarnessWithDraft,
} from './useCanvasController.reloadRecovery.test.support';

describe('useCanvasController reload hydration guards', () => {
  let harness: CanvasControllerHarness;

  beforeEach(async () => {
    harness = await createReloadRecoveryHarness();
  });

  afterEach(() => {
    harness.cleanup();
  });

  it('ignores a late successful autosave after reload hydrates a newer remote draft', async () => {
    harness = await replaceHarnessWithDraft(
      harness,
      buildDraftRecord(
        {
          nodeIds: ['node_1', 'node_2'],
          nodePositions: {
            node_1: { x: 0, y: 0 },
            node_2: { x: 120, y: 0 },
          },
          edges: [{ sourceId: 'node_1', targetId: 'node_2' }],
        },
        'rev-1',
        '2026-04-17T00:00:00Z'
      )
    );

    let resolveSave: ((value: SaveWorkspaceGraphDraftResult) => void) | null = null;
    harness.state.services.workspaceService.saveGraphDraft = vi.fn(
      async () =>
        await new Promise<SaveWorkspaceGraphDraftResult>((resolve) => {
          resolveSave = resolve;
        })
    );

    setCanvasLayoutNodePositions(harness, {
      node_1: { x: 48, y: 24 },
      node_2: { x: 148, y: 24 },
    });

    await harness.renderProbe();
    await waitForAutosaveDebounce();

    expect(harness.state.services.workspaceService.saveGraphDraft).toHaveBeenCalledTimes(1);

    harness.state.services.workspaceService.getGraphDraft = vi.fn(async () =>
      buildDraftRecord(
        {
          nodeIds: ['node_2'],
          nodePositions: {
            node_2: { x: 220, y: 120 },
          },
          edges: [],
        },
        'rev-remote',
        '2026-04-17T00:00:01Z'
      )
    );

    await reloadLatestDraft(harness);
    harness.state.queryClient.setQueryData.mockClear();

    await act(async () => {
      resolveSave?.({
        outcome: 'saved',
        record: buildDraftRecord(
          {
            nodeIds: ['node_1', 'node_2'],
            nodePositions: {
              node_1: { x: 48, y: 24 },
              node_2: { x: 148, y: 24 },
            },
            edges: [{ sourceId: 'node_1', targetId: 'node_2' }],
          },
          'rev-stale',
          '2026-04-17T00:00:02Z'
        ),
      });
      await Promise.resolve();
    });
    await harness.renderProbe();

    expect(harness.state.queryClient.setQueryData).not.toHaveBeenCalledWith(
      ['workspace', 'graph-draft', WORKSPACE_LAYOUT_KEY],
      expect.objectContaining({
        revision: 'rev-stale',
      })
    );
    expect(harness.state.services.workspaceService.getGraphDraft).toHaveBeenCalledTimes(1);
    expect(harness.getLatestResult()?.hasMissingRemoteDraft).toBe(false);
    expect(harness.getLatestResult()?.hasStaleDraftVersion).toBe(false);
    expect(harness.getLatestResult()?.draftSaveStatus).toBe('idle');
  });

  it('clears selection and inspector state when reload hydrates a narrower remote draft', async () => {
    harness = await replaceHarnessWithDraft(
      harness,
      buildDraftRecord(
        {
          nodeIds: ['node_1', 'node_2'],
          nodePositions: {
            node_1: { x: 0, y: 0 },
            node_2: { x: 120, y: 0 },
          },
          edges: [{ sourceId: 'node_1', targetId: 'node_2' }],
        },
        'rev-1',
        '2026-04-17T00:00:00Z'
      )
    );

    harness.state.store.selectedNodes = ['node_2'];
    harness.state.store.inspectorNodeId = 'node_2';
    const storeActions = harness.state.store as typeof harness.state.store & {
      setSelectedNodes: ReturnType<typeof vi.fn>;
      setInspectorNode: ReturnType<typeof vi.fn>;
    };
    storeActions.setSelectedNodes.mockClear();
    storeActions.setInspectorNode.mockClear();

    harness.state.services.workspaceService.getGraphDraft = vi.fn(async () =>
      buildDraftRecord(
        {
          nodeIds: ['node_1'],
          nodePositions: {
            node_1: { x: 32, y: 24 },
          },
          edges: [],
        },
        'rev-2',
        '2026-04-17T00:00:01Z'
      )
    );

    await reloadLatestDraft(harness);

    expect(storeActions.setSelectedNodes).toHaveBeenCalledWith([]);
    expect(storeActions.setInspectorNode).toHaveBeenCalledWith(null);
    expect(harness.getLatestResult()?.inspectorNode).toBeNull();
    expect(harness.getLatestResult()?.nodesWithImpact.map((node) => node.id)).toEqual(['node_1']);
  });
});
