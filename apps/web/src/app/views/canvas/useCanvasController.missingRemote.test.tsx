import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  buildRemoteDraftRecord,
  clearHarnessRemoteDraftRecord,
  createHarnessWithDraft,
  setHarnessRemoteDraftRecord,
  type CanvasControllerHarness,
  setCanvasLayoutNodePositions,
  WORKSPACE_LAYOUT_KEY,
  waitForAutosaveDebounce,
} from './useCanvasController.draftLifecycle.test.support';
import { setupCanvasControllerHarness } from './useCanvasController.test.harness';

describe('useCanvasController missing remote recovery', () => {
  let harness: CanvasControllerHarness;

  beforeEach(async () => {
    harness = setupCanvasControllerHarness();
    await harness.renderProbe();
  });

  afterEach(() => {
    harness.cleanup();
  });

  async function replaceHarnessWithDraft(record: ReturnType<typeof buildRemoteDraftRecord>): Promise<void> {
    harness.cleanup();
    harness = await createHarnessWithDraft(record);
  }

  it('enters missing_remote when a previously loaded draft disappears and blocks autosave', async () => {
    await replaceHarnessWithDraft(
      buildRemoteDraftRecord({
        nodeIds: ['node_1'],
        nodePositions: {
          node_1: { x: 0, y: 0 },
        },
        edges: [],
      })
    );

    clearHarnessRemoteDraftRecord(harness);
    await harness.renderProbe();

    setCanvasLayoutNodePositions(harness, {
      node_1: { x: 24, y: 24 },
    });

    await harness.renderProbe();
    await waitForAutosaveDebounce();

    expect(harness.getLatestResult()?.hasMissingRemoteDraft).toBe(true);
    expect(harness.getLatestResult()?.nodesWithImpact.map((node) => node.id)).toEqual(['node_1']);
    expect(harness.state.services.workspaceGraphDraftAuthoringPort.saveGraphDraft).not.toHaveBeenCalled();
  });

  it('adopts the current workspace snapshot after missing_remote and exits the blocked state', async () => {
    await replaceHarnessWithDraft(
      buildRemoteDraftRecord({
        nodeIds: ['node_1'],
        nodePositions: {
          node_1: { x: 0, y: 0 },
        },
        edges: [],
      })
    );

    clearHarnessRemoteDraftRecord(harness);
    await harness.renderProbe();

    await act(async () => {
      harness.getLatestResult()?.adoptCurrentWorkspaceSnapshot();
    });
    await harness.renderProbe();

    expect(harness.getLatestResult()?.hasMissingRemoteDraft).toBe(false);
    expect(harness.getLatestResult()?.nodesWithImpact.map((node) => node.id)).toEqual([
      'node_1',
      'node_2',
    ]);
  });

  it('reloads the remote draft after entering missing_remote when the persisted draft reappears', async () => {
    await replaceHarnessWithDraft(
      buildRemoteDraftRecord({
        nodeIds: ['node_1'],
        nodePositions: {
          node_1: { x: 0, y: 0 },
        },
        edges: [],
      })
    );

    clearHarnessRemoteDraftRecord(harness);
    await harness.renderProbe();

    setHarnessRemoteDraftRecord(
      harness,
      buildRemoteDraftRecord(
        {
          nodeIds: ['node_2'],
          nodePositions: {
            node_2: { x: 220, y: 120 },
          },
          edges: [],
        },
        'rev-restored',
        '2026-04-17T00:00:02Z'
      )
    );

    await act(async () => {
      harness.getLatestResult()?.reloadLatestDraft();
      await Promise.resolve();
    });
    await harness.renderProbe();

    expect(harness.getLatestResult()?.hasMissingRemoteDraft).toBe(false);
    expect(harness.getLatestResult()?.nodesWithImpact.map((node) => node.id)).toEqual(['node_2']);
    expect(harness.state.queryClient.setQueryData).toHaveBeenCalledWith(
      ['workspace', 'graph-draft', WORKSPACE_LAYOUT_KEY],
      expect.objectContaining({
        record: expect.objectContaining({
          revision: 'rev-restored',
        }),
      })
    );
  });
});
