import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildDraftSaveSavedResponse } from '../../services/workspace/workspaceGraphDraftProtocol.test.fixtures';
import {
  buildRemoteDraftRecord,
  createHarnessWithDraft,
  createRenderedHarness,
  createUnrenderedHarness,
  setHarnessRemoteDraftRecord,
} from './useCanvasController.draftLifecycle.test.support';
import { setupCanvasControllerHarness } from './useCanvasController.test.harness';

describe('useCanvasController canvas document contract', () => {
  let harness: ReturnType<typeof setupCanvasControllerHarness>;

  beforeEach(async () => {
    harness = await createHarnessWithDraft(
      buildRemoteDraftRecord({
        nodeIds: ['node_1', 'node_2'],
        nodePositions: {
          node_1: { x: 0, y: 0 },
          node_2: { x: 100, y: 0 },
        },
        edges: [{ sourceId: 'node_1', targetId: 'node_2' }],
      })
    );
  });

  afterEach(() => {
    harness.cleanup();
  });

  it('selects graph strategy from the active canvas document kind', async () => {
    setHarnessRemoteDraftRecord(
      harness,
      buildRemoteDraftRecord({
        canvas: {
          kind: 'dbt',
          title: 'dbt graph',
        },
        nodeIds: ['node_1', 'node_2'],
        nodePositions: {
          node_1: { x: 0, y: 0 },
          node_2: { x: 100, y: 0 },
        },
        edges: [{ sourceId: 'node_1', targetId: 'node_2' }],
      })
    );

    await harness.renderProbe();
    await harness.renderProbe();

    expect(harness.mocks.findCanvasRuntimeRegistration).toHaveBeenCalledWith('dbt', undefined);
    expect(harness.getLatestResult()?.canvasAuthoringMode).toBe('dbt');
    expect(harness.getLatestResult()?.canEditInspectorNode).toBe(true);
    expect(harness.getLatestResult()?.userPermissions).toEqual(
      expect.objectContaining({
        canEditEdges: true,
        canPlan: false,
        canRun: false,
      })
    );
    expect(harness.mocks.useCanvasGraphHandlers).toHaveBeenLastCalledWith(
      expect.objectContaining({
        graphStrategy: expect.objectContaining({
          id: 'dbt',
        }),
      })
    );
  });

  it('keeps first-canvas creation available while graph mutation waits for a typed document', async () => {
    harness.cleanup();
    harness = await createRenderedHarness();

    expect(harness.getLatestResult()?.canvasDocument).toBeNull();
    expect(harness.getLatestResult()?.canCreateCanvasDocument).toBe(true);
    expect(harness.getLatestResult()?.userPermissions).toEqual(
      expect.objectContaining({
        canEditEdges: false,
      })
    );
    expect(harness.mocks.useCanvasGraphHandlers).toHaveBeenLastCalledWith(
      expect.objectContaining({
        canEditEdges: false,
      })
    );
  });

  it('promotes a saved first canvas from the session baseline before the draft query publishes it', async () => {
    harness.cleanup();
    harness = await createRenderedHarness();
    harness.state.queryClient.setQueryData = vi.fn();
    harness.state.services.workspaceGraphDraftAuthoringPort.saveGraphDraft = vi.fn(async () =>
      buildDraftSaveSavedResponse(
        {
          tenantId: 'tenant-a',
          projectId: 'project-a',
          environmentId: 'dev',
        },
        { revision: 'rev-created-canvas' }
      )
    );

    await act(async () => {
      await harness.getLatestResult()?.handleCreateCanvasDocument({
        kind: 'transformation',
        title: 'Transformation canvas',
      });
    });
    await harness.renderProbe();

    expect(
      harness.state.services.workspaceGraphDraftAuthoringPort.saveGraphDraft
    ).toHaveBeenCalled();
    expect(harness.getLatestResult()?.canvasDocument).toEqual({
      kind: 'transformation',
      title: 'Transformation canvas',
    });
    expect(harness.getLatestResult()?.activeCanvasId).toBe('transformation-canvas');
    expect(harness.getLatestResult()?.canvasDocuments).toEqual([
      {
        id: 'transformation-canvas',
        kind: 'transformation',
        title: 'Transformation canvas',
      },
    ]);
    expect(harness.getLatestResult()?.canCreateCanvasDocument).toBe(false);
  });

  it('keeps first-canvas creation available from draft persistence when graph edits are denied', async () => {
    harness.cleanup();
    harness = createUnrenderedHarness();
    const storeState = harness.state.store as unknown as {
      userPermissions: {
        canEditEdges: boolean;
        canPersistGraphDraft: boolean;
      };
    };
    storeState.userPermissions = {
      ...storeState.userPermissions,
      canEditEdges: false,
      canPersistGraphDraft: true,
    };

    await harness.renderProbe();

    expect(harness.getLatestResult()?.canvasDocument).toBeNull();
    expect(harness.getLatestResult()?.canCreateCanvasDocument).toBe(true);
    expect(harness.getLatestResult()?.userPermissions).toEqual(
      expect.objectContaining({
        canEditEdges: false,
      })
    );
    expect(harness.mocks.useCanvasGraphHandlers).toHaveBeenLastCalledWith(
      expect.objectContaining({
        canEditEdges: false,
      })
    );
  });

  it('routes unsupported canvas kinds through the runtime policy fail-closed posture', async () => {
    setHarnessRemoteDraftRecord(
      harness,
      buildRemoteDraftRecord({
        canvas: {
          kind: 'retired-canvas-kind',
          title: 'retired graph',
        },
        nodeIds: ['node_1'],
        nodePositions: {
          node_1: { x: 0, y: 0 },
        },
        edges: [],
      })
    );

    await harness.renderProbe();
    await harness.renderProbe();

    expect(harness.getLatestResult()?.canEditInspectorNode).toBe(false);
    expect(harness.getLatestResult()?.canOpenSourceImport).toBe(false);
    expect(harness.getLatestResult()?.userPermissions).toEqual(
      expect.objectContaining({
        canEditEdges: false,
        canPlan: false,
        canRun: false,
      })
    );
    expect(harness.mocks.useCanvasGraphHandlers).toHaveBeenLastCalledWith(
      expect.objectContaining({
        graphStrategy: null,
        canEditEdges: false,
      })
    );
    expect(harness.mocks.useCanvasExecutionActions).toHaveBeenLastCalledWith(
      expect.objectContaining({
        executionStrategy: null,
        canPlan: false,
        canRun: false,
      })
    );
  });
});
