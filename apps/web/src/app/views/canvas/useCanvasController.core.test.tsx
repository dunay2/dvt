import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act } from 'react';

import {
  buildRemoteDraftRecord,
  createHarnessWithDraft,
} from './useCanvasController.draftLifecycle.test.support';
import { setupCanvasControllerHarness } from './useCanvasController.test.harness';

describe('useCanvasController core', () => {
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

  it('maps protected draft semantics into graph state and injects overlay decorations', () => {
    const result = harness.getLatestResult();
    expect(result?.nodesWithImpact).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'node_1',
          data: expect.objectContaining({
            name: 'node_1',
            pluginKind: 'dvt:source',
            overlayDecoration: { borderColor: '#ef4444' },
          }),
        }),
        expect.objectContaining({
          id: 'node_2',
          data: expect.objectContaining({
            name: 'node_2',
            pluginKind: 'dvt:sql_transform',
          }),
        }),
      ])
    );
    expect(result?.inspectorGraphNodes).toEqual([
      expect.objectContaining({
        id: 'node_1',
        name: 'node_1',
        pluginId: 'dvt',
        kind: 'dvt:source',
        role: 'input',
        metadata: {
          config: {
            schema: 'raw',
            table: 'node_1',
            alias: 'node_1',
          },
        },
      }),
      expect.objectContaining({
        id: 'node_2',
        name: 'node_2',
        pluginId: 'dvt',
        kind: 'dvt:sql_transform',
        role: 'transform',
        path: 'models/node_2.sql',
        metadata: {
          config: {
            dialect: 'postgres',
          },
        },
      }),
    ]);
    expect(result?.edges).toEqual([
      { id: 'draft_edge_node_1_node_2', source: 'node_1', target: 'node_2' },
    ]);
    expect(result?.impactOverlayEnabled).toBe(true);

    type DecoratedNode = Readonly<{ id?: string; kind?: string }>;
    const protectedDraftDecorationCall = harness.mocks.buildNodeDecorations.mock.calls.find(
      (call) => {
        const nodes = call[0] as readonly DecoratedNode[];
        return (
          nodes.some((node) => node.id === 'node_1' && node.kind === 'dvt:source') &&
          nodes.some((node) => node.id === 'node_2' && node.kind === 'dvt:sql_transform')
        );
      }
    );
    expect(protectedDraftDecorationCall).toBeDefined();
    expect(protectedDraftDecorationCall?.[1]).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'impact' })])
    );
    expect(protectedDraftDecorationCall?.[2]).toBeNull();
    expect(protectedDraftDecorationCall?.[3]).toEqual({ overlay: 'ctx' });
  });

  it('derives inspector node from protected draft semantics and forwards graph and execution hook results', () => {
    const result = harness.getLatestResult();
    expect(result?.inspectorNode).toEqual(
      expect.objectContaining({
        id: 'node_1',
        name: 'node_1',
        pluginId: 'dvt',
        kind: 'dvt:source',
        role: 'input',
      })
    );
    expect(result?.currentPlan).toEqual(harness.state.currentPlan);
    expect(result?.canvasAuthoringMode).toBe('transformation');
    expect(result?.transformationValidation).toEqual(
      expect.objectContaining({
        valid: false,
        summaryCode: 'requires_executable_path',
      })
    );
    expect(result?.registeredPlugins?.has('dbt')).toBe(true);
    expect(result?.registeredPlugins?.has('monitoring')).toBe(true);
    expect(result?.handlePreviewExecutionPlan).toBe(
      harness.state.executionActionsResult.handlePreviewExecutionPlan
    );
    expect(result?.handleStartRun).toBe(harness.state.executionActionsResult.handleStartRun);
    expect(result?.canStartRun).toBe(false);
    expect(result?.canEditInspectorNode).toBe(true);
    expect(typeof result?.applyInspectorNodeDraft).toBe('function');
    expect(result?.planStatusSummary).toBe('Preview required before running.');
    expect(result?.handleDrop).toBe(harness.state.graphHandlersResult.handleDrop);
    expect(result?.confirmEdgeCreation).toBe(harness.state.graphHandlersResult.confirmEdgeCreation);
    expect(result?.importedNodeFocusIds).toEqual([]);
    expect(harness.mocks.useCanvasExecutionActions).toHaveBeenCalledWith(
      expect.objectContaining({
        plansService: harness.state.services.plansService,
        runsService: harness.state.services.runsService,
        sessionContext: harness.state.services.sessionContext,
        shellFeedback: harness.state.services.shellFeedback,
        onRunStarted: harness.state.navigationActionsResult.handleRunStarted,
      })
    );
  });

  it('returns a safe presentation state when the graph query fails', async () => {
    harness.cleanup();
    harness = setupCanvasControllerHarness();
    await harness.renderProbe();

    harness.setGraphQueryError();
    await harness.renderProbe();

    const result = harness.getLatestResult();
    expect(result).not.toBeNull();
    expect(result?.inspectorGraphNodes).toEqual([]);
    expect(result?.edges).toEqual([]);
    expect(result?.nodesWithImpact).toEqual([]);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 450));
    });

    expect(
      harness.state.services.workspaceGraphDraftAuthoringPort.saveGraphDraft
    ).not.toHaveBeenCalled();
  });

  it('keeps runtime overlay selected when protected draft semantics do not expose cost data', async () => {
    await harness.toggleCostOverlay();
    await harness.renderProbe();
    expect(harness.getLatestResult()?.exclusiveOverlayMode).toBe('runtime');

    harness.removeNodeCostsAndRefreshGraphSnapshot();
    await harness.renderProbe();

    expect(harness.getLatestResult()?.canUseCostOverlay).toBe(false);
    expect(harness.getLatestResult()?.exclusiveOverlayMode).toBe('runtime');
  });
});
