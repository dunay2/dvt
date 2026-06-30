import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  createTransformationAuthoringHarnessWithDraft,
  setHarnessRemoteDraftRecord,
  type CanvasControllerHarness,
  WORKSPACE_LAYOUT_KEY,
} from './useCanvasController.draftLifecycle.test.support';
import {
  buildDraftConflictResponse,
  buildLocalThreeNodeDraftRecord,
  buildSingleNodeDraftRecord,
  buildTwoNodeDraftRecord,
  configureDroppedNodeHandleDrop,
  triggerDropAutosave,
} from './useCanvasController.reloadConflictRecovery.test.support';
import {
  createReloadRecoveryHarness,
  reloadLatestDraft,
} from './useCanvasController.reloadRecovery.test.support';

describe('useCanvasController reload conflict recovery', () => {
  let harness: CanvasControllerHarness;

  beforeEach(async () => {
    harness = await createReloadRecoveryHarness();
  });

  afterEach(() => {
    harness.cleanup();
  });

  it('does not overwrite the remote draft while reloading after a CAS conflict', async () => {
    let saveAttempts = 0;
    harness.cleanup();
    harness = await createTransformationAuthoringHarnessWithDraft(
      buildTwoNodeDraftRecord({ revision: 'rev-base' }),
      ['node_1', 'node_2']
    );
    harness.state.services.workspaceGraphDraftAuthoringPort.saveGraphDraft = async () => {
      saveAttempts += 1;
      setHarnessRemoteDraftRecord(
        harness,
        buildLocalThreeNodeDraftRecord({ revision: 'rev-remote' })
      );
      return buildDraftConflictResponse({ currentRevision: 'rev-remote' });
    };
    configureDroppedNodeHandleDrop(harness);

    await triggerDropAutosave(harness);

    expect(harness.getLatestResult()?.hasStaleDraftVersion).toBe(true);

    setHarnessRemoteDraftRecord(
      harness,
      buildSingleNodeDraftRecord({ nodeId: 'node_2', revision: 'rev-remote' })
    );
    await reloadLatestDraft(harness);

    expect(saveAttempts).toBe(1);
    expect(harness.state.queryClient.cancelQueries).toHaveBeenCalledWith({
      queryKey: ['workspace', 'graph-draft', WORKSPACE_LAYOUT_KEY],
    });
    expect(harness.state.queryClient.fetchQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['workspace', 'graph-draft', WORKSPACE_LAYOUT_KEY],
      })
    );
    expect(harness.getLatestResult()?.hasStaleDraftVersion).toBe(false);
    expect(harness.getLatestResult()?.nodesWithImpact.map((node) => node.id)).toEqual(['node_2']);
  });
});
