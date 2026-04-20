import { afterEach, describe, expect, it } from 'vitest';

import { buildDraftSaveConflictResponse } from '../../services/workspace/workspaceGraphDraft.test.fixtures';
import {
  buildDraftRecord,
  createTransformationAuthoringHarness,
  type CanvasControllerHarness,
  waitForAutosaveDebounce,
} from './useCanvasController.draftLifecycle.test.support';

describe('useCanvasController draft lifecycle conflict state', () => {
  let harness: CanvasControllerHarness | null = null;

  afterEach(() => {
    harness?.cleanup();
    harness = null;
  });

  it('surfaces stale draft state when saveGraphDraft returns a CAS conflict', async () => {
    harness = await createTransformationAuthoringHarness();
    harness.state.graphDraftRecord = buildDraftRecord(
      {
        nodeIds: ['node_1', 'node_2', 'node_3'],
        nodePositions: {
          node_1: { x: 0, y: 0 },
          node_2: { x: 100, y: 0 },
          node_3: { x: 200, y: 0 },
        },
        edges: [
          { sourceId: 'node_1', targetId: 'node_2' },
          { sourceId: 'node_2', targetId: 'node_3' },
        ],
      },
      'rev-conflict'
    );
    harness.state.services.workspaceGraphDraftAuthoringPort.saveGraphDraft = async () =>
      buildDraftSaveConflictResponse(
        {
          tenantId: 'tenant-a',
          projectId: 'project-a',
          environmentId: 'dev',
        },
        { currentRevision: 'rev-conflict' }
      );

    await harness.renderProbe();
    await waitForAutosaveDebounce();

    expect(harness.getLatestResult()?.hasStaleDraftVersion).toBe(true);
    expect(harness.getLatestResult()?.draftConflictRevision).toBe('rev-conflict');
  });

  it('treats a CAS conflict as a blocked runtime state for editing and execution', async () => {
    harness = await createTransformationAuthoringHarness();
    harness.state.graphDraftRecord = buildDraftRecord(
      {
        nodeIds: ['node_1', 'node_2', 'node_3'],
        nodePositions: {
          node_1: { x: 0, y: 0 },
          node_2: { x: 100, y: 0 },
          node_3: { x: 200, y: 0 },
        },
        edges: [
          { sourceId: 'node_1', targetId: 'node_2' },
          { sourceId: 'node_2', targetId: 'node_3' },
        ],
      },
      'rev-conflict'
    );
    harness.state.services.workspaceGraphDraftAuthoringPort.saveGraphDraft = async () =>
      buildDraftSaveConflictResponse(
        {
          tenantId: 'tenant-a',
          projectId: 'project-a',
          environmentId: 'dev',
        },
        { currentRevision: 'rev-conflict' }
      );

    await harness.renderProbe();
    await waitForAutosaveDebounce();

    const latestExecutionCall = harness.mocks.useCanvasExecutionActions.mock.calls.at(-1)?.[0] as
      | { canPlan?: boolean; canRun?: boolean }
      | undefined;

    expect(harness.getLatestResult()?.hasStaleDraftVersion).toBe(true);
    expect(harness.getLatestResult()?.canStartRun).toBe(false);
    expect(harness.mocks.useCanvasGraphHandlers).toHaveBeenLastCalledWith(
      expect.objectContaining({
        canEditEdges: false,
      })
    );
    expect(latestExecutionCall?.canPlan).toBe(false);
    expect(latestExecutionCall?.canRun).toBe(false);
  });
});
