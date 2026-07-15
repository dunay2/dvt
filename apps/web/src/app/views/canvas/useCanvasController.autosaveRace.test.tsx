import React, { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildGraphDraftSourceImportResult } from '../../../testing/sourceImportTestFixtures';
import type { WorkspaceGraphDraftAuthoringSaveResult } from '../../ports/workspaceGraphDraftAuthoring';
import { buildDraftSaveSavedResponse } from '../../services/workspace/workspaceGraphDraftProtocol.test.fixtures';
import type { CanvasDraftSession } from './canvasDraftSession';
import {
  applyTransformationAuthoringFixture,
  buildRemoteDraftRecord,
  clearHarnessRemoteDraftRecord,
  setHarnessRemoteDraftRecord,
  TRANSFORMATION_AUTHORING_CANONICAL_NODES,
  waitForAutosaveDebounce,
  type CanvasControllerHarness,
} from './useCanvasController.draftLifecycle.test.support';
import { projectCanvasHarnessDraftReadModel } from './useCanvasController.test.draftAuthoring';
import { setupCanvasControllerHarness } from './useCanvasController.test.harness';

describe('useCanvasController autosave race guards', () => {
  let harness: CanvasControllerHarness | null = null;

  afterEach(() => {
    harness?.cleanup();
    harness = null;
  });

  it('does not reopen editing when an in-flight autosave fails after the draft disappears remotely', async () => {
    harness = createDraftCompletionHarness();
    let rejectSave: ((reason?: unknown) => void) | null = null;
    harness.state.services.workspaceGraphDraftAuthoringPort.saveGraphDraft = vi.fn(
      async () =>
        await new Promise<never>((_, reject) => {
          rejectSave = reject;
        })
    );

    await triggerGovernedAutosave(harness);

    expect(
      harness.state.services.workspaceGraphDraftAuthoringPort.saveGraphDraft
    ).toHaveBeenCalledTimes(1);

    clearHarnessRemoteDraftRecord(harness);
    await harness.renderProbe();

    await act(async () => {
      rejectSave?.(new Error('network down'));
      await Promise.resolve();
    });
    await harness.renderProbe();

    expect(harness.getLatestResult()?.hasMissingRemoteDraft).toBe(true);
    expect(harness.getLatestResult()?.draftSaveStatus).toBe('idle');
    expect(
      harness.state.services.workspaceGraphDraftAuthoringPort.saveGraphDraft
    ).toHaveBeenCalledTimes(1);
  });

  it('ignores a late successful autosave after the draft disappears remotely', async () => {
    harness = createDraftCompletionHarness();
    let resolveSave: ((value: WorkspaceGraphDraftAuthoringSaveResult) => void) | null = null;
    harness.state.services.workspaceGraphDraftAuthoringPort.saveGraphDraft = vi.fn(
      async () =>
        await new Promise<WorkspaceGraphDraftAuthoringSaveResult>((resolve) => {
          resolveSave = resolve;
        })
    );

    await triggerGovernedAutosave(harness);

    expect(
      harness.state.services.workspaceGraphDraftAuthoringPort.saveGraphDraft
    ).toHaveBeenCalledTimes(1);

    clearHarnessRemoteDraftRecord(harness);
    await harness.renderProbe();
    harness.state.queryClient.setQueryData.mockClear();

    await act(async () => {
      resolveSave?.({
        ...buildDraftSaveSavedResponse(
          {
            tenantId: 'tenant-a',
            projectId: 'project-a',
            environmentId: 'dev',
          },
          { revision: 'rev-stale' }
        ),
      });
      await Promise.resolve();
    });
    await harness.renderProbe();

    expect(harness.getLatestResult()?.hasMissingRemoteDraft).toBe(true);
    expect(harness.getLatestResult()?.draftSaveStatus).toBe('idle');
    expect(harness.state.queryClient.setQueryData).not.toHaveBeenCalledWith(
      ['workspace', 'graph-draft', 'tenant-a::project-a::dev'],
      expect.objectContaining({
        revision: 'rev-stale',
      })
    );
  });

  it('ignores a late successful autosave after a source import adopts a newer draft revision', async () => {
    const targetHarness = createDraftCompletionHarness();
    harness = targetHarness;
    let resolveSave: ((value: WorkspaceGraphDraftAuthoringSaveResult) => void) | null = null;
    targetHarness.state.services.workspaceGraphDraftAuthoringPort.saveGraphDraft = vi.fn(
      async () =>
        await new Promise<WorkspaceGraphDraftAuthoringSaveResult>((resolve) => {
          resolveSave = resolve;
        })
    );

    await triggerGovernedAutosave(targetHarness);

    expect(
      targetHarness.state.services.workspaceGraphDraftAuthoringPort.saveGraphDraft
    ).toHaveBeenCalledTimes(1);

    await act(async () => {
      targetHarness.getLatestResult()?.handleSourceImportComplete(
        buildGraphDraftSourceImportResult({
          draftRevision: 'rev-imported',
        })
      );
      await Promise.resolve();
    });
    targetHarness.state.queryClient.setQueryData.mockClear();

    await act(async () => {
      resolveSave?.({
        ...buildDraftSaveSavedResponse(
          {
            tenantId: 'tenant-a',
            projectId: 'project-a',
            environmentId: 'dev',
          },
          { revision: 'rev-stale' }
        ),
      });
      await Promise.resolve();
    });
    await targetHarness.renderProbe();

    expect(targetHarness.state.queryClient.setQueryData).not.toHaveBeenCalledWith(
      ['workspace', 'graph-draft', 'tenant-a::project-a::dev'],
      expect.objectContaining({
        revision: 'rev-stale',
      })
    );
    expect(targetHarness.getLatestResult()?.importedNodeFocusIds).toEqual(['src_erp_orders']);
  });

  function createDraftCompletionHarness(): CanvasControllerHarness {
    const nextHarness = setupCanvasControllerHarness();
    configureDropToCompleteGovernedDraft(nextHarness);
    setHarnessRemoteDraftRecord(
      nextHarness,
      buildRemoteDraftRecord({
        nodeIds: ['node_1', 'node_2'],
        nodePositions: {
          node_1: { x: 0, y: 0 },
          node_2: { x: 120, y: 0 },
        },
        edges: [{ sourceId: 'node_1', targetId: 'node_2' }],
      })
    );

    return nextHarness;
  }

  function configureDropToCompleteGovernedDraft(targetHarness: CanvasControllerHarness): void {
    const droppedCanonicalNode =
      TRANSFORMATION_AUTHORING_CANONICAL_NODES.find((node) => node.id === 'node_3') ??
      (() => {
        throw new Error('EXPECTED_NODE_3_CANONICAL_NODE');
      })();

    applyTransformationAuthoringFixture(targetHarness, ['node_1', 'node_2']);
    targetHarness.mocks.useCanvasGraphHandlers.mockImplementation((params) => ({
      ...targetHarness.state.graphHandlersResult,
      handleDrop: vi.fn(() => {
        targetHarness.state.graphDraftQueryData = projectCanvasHarnessDraftReadModel(
          buildRemoteDraftRecord(
            {
              nodeIds: ['node_1', 'node_2', 'node_3'],
              nodePositions: {
                node_1: { x: 0, y: 0 },
                node_2: { x: 120, y: 0 },
                node_3: { x: 240, y: 0 },
              },
              edges: [
                { sourceId: 'node_1', targetId: 'node_2' },
                { sourceId: 'node_2', targetId: 'node_3' },
              ],
            },
            'rev-local-semantic',
            '2026-04-18T00:00:02Z'
          )
        );
        params.setNodes((existingNodes: Array<Record<string, unknown>>) => [
          ...existingNodes,
          {
            id: 'node_3',
            type: 'dbtNode',
            position: { x: 240, y: 0 },
            data: {
              name: 'orders_sink',
              pluginKind: 'dvt:sink',
              showColumns: false,
              overlayDecoration: null,
            },
          },
        ]);
        params.setDraftSession((currentSession: CanvasDraftSession) => ({
          ...currentSession,
          workingSet: {
            ...currentSession.workingSet,
            visibleNodeIds: [...currentSession.workingSet.visibleNodeIds, 'node_3'],
            visibleEdges: [
              ...currentSession.workingSet.visibleEdges,
              { sourceId: 'node_2', targetId: 'node_3' },
            ],
          },
          localNodeCatalog:
            currentSession.localNodeCatalog == null
              ? { node_3: droppedCanonicalNode }
              : {
                  ...currentSession.localNodeCatalog,
                  node_3: droppedCanonicalNode,
                },
        }));
        targetHarness.state.graphData = {
          nodes: [{ id: 'node_1' }, { id: 'node_2' }, { id: 'node_3' }],
          edges: [{ id: 'edge_1' }, { id: 'edge_2' }],
        };
      }),
    }));
  }

  async function triggerGovernedAutosave(targetHarness: CanvasControllerHarness): Promise<void> {
    await targetHarness.renderProbe();
    await act(async () => {
      targetHarness.getLatestResult()?.handleDrop({} as React.DragEvent<HTMLDivElement>);
    });
    await targetHarness.renderProbe();
    await waitForAutosaveDebounce();
    await targetHarness.renderProbe();
  }
});
