import React, { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  buildRemoteDraftRecord,
  createHarnessWithDraft,
  setHarnessRemoteDraftRecord,
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

  it('maps protected draft semantics into canonical explorer state and injects overlay decorations', () => {
    const result = harness.getLatestResult();
    expect(result?.explorerNodes).toEqual([
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
    expect(result?.nodesWithImpact).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'node_1',
          data: expect.objectContaining({ overlayDecoration: { borderColor: '#ef4444' } }),
        }),
      ])
    );
    expect(result?.impactOverlayEnabled).toBe(true);
    expect(harness.mocks.buildNodeDecorations).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'node_1',
          kind: 'dvt:source',
        }),
        expect.objectContaining({
          id: 'node_2',
          kind: 'dvt:sql_transform',
        }),
      ]),
      [{ id: 'impact' }],
      null,
      { overlay: 'ctx' }
    );
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
        summaryCode: 'requires_three_nodes',
      })
    );
    expect(result?.registeredPlugins).toEqual(new Set(['dbt', 'monitoring', 'cost']));
    expect(result?.handlePlan).toBe(harness.state.executionActionsResult.handlePlan);
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

    expect(harness.mocks.findCanvasRuntimeRegistration).toHaveBeenCalledWith(
      'dbt',
      undefined
    );
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
    expect(harness.mocks.useCanvasExecutionActions).toHaveBeenLastCalledWith(
      expect.objectContaining({
        canPlan: false,
        canRun: false,
      })
    );
  });

  it('routes unsupported canvas kinds through the runtime policy fail-closed posture', async () => {
    setHarnessRemoteDraftRecord(
      harness,
      buildRemoteDraftRecord({
        canvas: {
          kind: 'legacy',
          title: 'legacy graph',
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
        canEditEdges: false,
      })
    );
    expect(harness.mocks.useCanvasExecutionActions).toHaveBeenLastCalledWith(
      expect.objectContaining({
        canPlan: false,
        canRun: false,
      })
    );
  });

  it('applies inspector-authored node details back into the authoritative route projection', async () => {
    await act(async () => {
      harness.getLatestResult()?.applyInspectorNodeDraft({
        name: 'orders_source_renamed',
        description: 'Edited through the route-owned inspector',
      });
    });
    await harness.renderProbe();

    expect(harness.getLatestResult()?.inspectorNode).toEqual(
      expect.objectContaining({
        id: 'node_1',
        name: 'orders_source_renamed',
        description: 'Edited through the route-owned inspector',
      })
    );
    expect(harness.getLatestResult()?.explorerNodes[0]).toEqual(
      expect.objectContaining({
        id: 'node_1',
        name: 'orders_source_renamed',
        description: 'Edited through the route-owned inspector',
      })
    );
  });

  it('keeps hide or show panel commands idempotent', async () => {
    harness.state.store.explorerPanelVisible = true;
    harness.state.store.inspectorPanelVisible = false;
    await harness.renderProbe();

    harness.getLatestResult()?.hideExplorerPanel();
    harness.state.store.explorerPanelVisible = false;
    await harness.renderProbe();
    harness.getLatestResult()?.hideExplorerPanel();

    harness.getLatestResult()?.showInspectorPanel();
    harness.state.store.inspectorPanelVisible = true;
    await harness.renderProbe();
    harness.getLatestResult()?.showInspectorPanel();

    expect(harness.state.store.hideExplorerPanel).toHaveBeenCalledTimes(1);
    expect(harness.state.store.showInspectorPanel).toHaveBeenCalledTimes(1);
  });

  it('stops exposing node removal handlers when graph edits are gated', async () => {
    const userPermissions = harness.state.store.userPermissions as {
      canPlan: boolean;
      canRun: boolean;
      canEditEdges: boolean;
      canManagePlugins: boolean;
      canManageRBAC: boolean;
    };
    harness.state.store.userPermissions = {
      ...userPermissions,
      canEditEdges: false,
    };
    await harness.renderProbe();

    const latestBuildNodesCall = harness.mocks.buildNodesWithImpact.mock.calls.at(-1)?.[0] as
      | { handlers?: { onDuplicateNode?: unknown; onRemoveNode?: unknown } }
      | undefined;

    expect(latestBuildNodesCall?.handlers?.onDuplicateNode).toBeUndefined();
    expect(latestBuildNodesCall?.handlers?.onRemoveNode).toBeUndefined();
    expect(harness.mocks.useCanvasGraphHandlers).toHaveBeenCalledWith(
      expect.objectContaining({
        canEditEdges: false,
      })
    );
  });

  it('invalidates the protected draft query and prepares focus when imported sources complete', async () => {
    const storeState = harness.state.store as Record<string, unknown>;
    storeState.inspectorPanelVisible = false;
    await harness.renderProbe();

    await act(async () => {
      harness.getLatestResult()?.handleSourceImportComplete({
        success: true,
        sourcesCreated: 2,
        tablesImported: 2,
        yamlFiles: ['models/sources/src_erp.yml'],
        importedNodeIds: ['src_erp_orders', 'src_erp_customers'],
        grouping: 'schema',
        options: {
          includeColumns: true,
          addTests: false,
          addFreshness: false,
        },
      });
    });

    expect(harness.state.store.setCurrentPlan).toHaveBeenCalledWith(null);
    expect(harness.state.store.setSelectedNodes).toHaveBeenCalledWith([
      'src_erp_orders',
      'src_erp_customers',
    ]);
    expect(harness.state.store.setInspectorNode).toHaveBeenCalledWith('src_erp_orders');
    expect(harness.state.store.showInspectorPanel).toHaveBeenCalledTimes(1);
    expect(harness.state.queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['workspace', 'graph-draft', 'tenant-a::project-a::dev'],
    });
    expect(harness.getLatestResult()?.importedNodeFocusIds).toEqual([
      'src_erp_orders',
      'src_erp_customers',
    ]);

    await act(async () => {
      harness.getLatestResult()?.handleImportedNodeFocusComplete();
    });

    expect(harness.getLatestResult()?.importedNodeFocusIds).toEqual([]);
  });

  it('clears selection and inspector state when a node is removed through onNodesChange', async () => {
    harness.state.store.selectedNodes = ['node_1', 'node_2'];
    harness.state.store.inspectorNodeId = 'node_1';
    await harness.renderProbe();

    await act(async () => {
      harness.getLatestResult()?.onNodesChange([
        {
          id: 'node_1',
          type: 'remove',
        },
      ]);
    });
    await harness.renderProbe();

    expect(harness.state.store.setSelectedNodes).toHaveBeenCalledWith(['node_2']);
    expect(harness.state.store.setInspectorNode).toHaveBeenCalledWith(null);
    expect(harness.getLatestResult()?.inspectorNode).toBeNull();
    expect(harness.getLatestResult()?.nodesWithImpact.map((node) => node.id)).toEqual(['node_2']);
    expect(harness.getLatestResult()?.edges).toEqual([]);
  });
});
