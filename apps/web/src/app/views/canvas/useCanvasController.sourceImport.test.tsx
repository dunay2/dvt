import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Node } from '@xyflow/react';
import { Box } from 'lucide-react';
import type { ImportSourcesResult } from '../../ports/workspace';
import { buildGraphDraftSourceImportResult } from '../../../testing/sourceImportTestFixtures';
import { buildProtectedDraftRecord } from '../../services/workspace/workspaceGraphDraftAuthoring.test.fixtures';
import type { NodeKindRegistration } from '../../plugins/nodeTypeContracts';
import type { CanonicalNode } from '../../types/canonical';
import type { CanvasDraftSession } from './canvasDraftSession';
import { canvasGraphLifecycle } from './canvasGraphLifecycle';
import {
  buildRemoteDraftRecord,
  clearHarnessRemoteDraftRecord,
  createHarnessWithDraft,
  setHarnessRemoteDraftRecord,
  waitForAutosaveDebounce,
} from './useCanvasController.draftLifecycle.test.support';
import { setupCanvasControllerHarness } from './useCanvasController.test.harness';

describe('useCanvasController source import contract', () => {
  let harness: ReturnType<typeof setupCanvasControllerHarness>;
  const importedWarehouseSourceNode: CanonicalNode = {
    id: 'src_local_postgres_dvt_public_source_1',
    name: 'src_local_postgres_dvt_public_source_1',
    pluginId: 'dvt.warehouse-source',
    kind: 'dvt:source',
    role: 'input',
    status: 'idle',
    tags: ['source', 'public'],
    metadata: {
      config: {
        database: 'dvt',
        schema: 'public',
        table: 'source_1',
      },
    },
  };
  const localDbtModelNode: CanonicalNode = {
    id: 'dbt-model-1',
    name: 'Model 1',
    pluginId: 'dvt',
    kind: 'dvt:transform',
    role: 'transform',
    status: 'idle',
    tags: ['authoring'],
    path: 'models/model_1.sql',
    metadata: {
      config: {
        sql: 'select * from {{ source("public", "source_1") }}',
      },
    },
  };
  const dbtModelRegistration: NodeKindRegistration = {
    pluginId: 'dvt',
    kind: 'dvt:transform',
    label: 'Model',
    role: 'transform',
    icon: Box,
    borderClass: 'border-blue-500',
    minimapColor: '#3b82f6',
    allowsIncoming: true,
    allowsOutgoing: true,
    supportsColumns: true,
  };

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

  it('invalidates the protected draft query and prepares focus without changing selection', async () => {
    const storeState = harness.state.store as Record<string, unknown>;
    storeState.inspectorPanelVisible = false;
    await harness.renderProbe();
    const saveGraphDraft = harness.state.services.workspaceGraphDraftAuthoringPort.saveGraphDraft;

    await act(async () => {
      harness.getLatestResult()?.handleSourceImportComplete(
        buildGraphDraftSourceImportResult({
          sourcesCreated: 2,
          objectsImported: 2,
          yamlFiles: ['models/sources/src_erp.yml'],
          importedNodeIds: ['src_erp_orders', 'src_erp_customers'],
          options: {
            includeColumns: true,
            addTests: false,
            addFreshness: false,
          },
        })
      );
    });

    expect(harness.state.store.setCurrentPlan).toHaveBeenCalledWith(null);
    expect(harness.state.store.setSelectedNodes).not.toHaveBeenCalled();
    expect(harness.state.store.setInspectorNode).toHaveBeenCalledWith('src_erp_orders');
    expect(harness.state.store.showInspectorPanel).not.toHaveBeenCalled();
    expect(harness.state.queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['workspace', 'graph-draft', 'tenant-a::project-a::dev'],
    });
    expect(harness.getLatestResult()?.importedNodeFocusIds).toEqual([
      'src_erp_orders',
      'src_erp_customers',
    ]);
    expect(saveGraphDraft).not.toHaveBeenCalled();

    await waitForAutosaveDebounce();

    expect(saveGraphDraft).not.toHaveBeenCalled();

    await act(async () => {
      harness.getLatestResult()?.handleImportedNodeFocusComplete();
    });

    expect(harness.getLatestResult()?.importedNodeFocusIds).toEqual([]);
  });

  it('persists imported source nodes near the canvas context-menu anchor', async () => {
    await harness.renderProbe();
    harness.state.store.setCanvasNodePositions.mockClear();
    const saveGraphDraft = harness.state.services.workspaceGraphDraftAuthoringPort.saveGraphDraft;

    await act(async () => {
      const complete = harness.getLatestResult()?.handleSourceImportComplete as
        | ((
            result: ImportSourcesResult,
            context: { canvasPosition: { x: number; y: number } }
          ) => void)
        | undefined;

      complete?.(
        buildGraphDraftSourceImportResult({
          sourcesCreated: 2,
          objectsImported: 2,
          yamlFiles: ['models/sources/src_erp.yml'],
          importedNodeIds: ['src_erp_orders', 'src_erp_customers'],
          options: {
            includeColumns: true,
            addTests: false,
            addFreshness: false,
          },
        }),
        { canvasPosition: { x: 420, y: 260 } }
      );
    });

    expect(harness.state.store.setCanvasNodePositions).toHaveBeenCalledWith(
      'tenant-a::project-a::dev',
      expect.objectContaining({
        node_1: { x: 0, y: 0 },
        node_2: { x: 100, y: 0 },
        src_erp_orders: { x: 420, y: 260 },
        src_erp_customers: { x: 660, y: 260 },
      })
    );
    expect(saveGraphDraft).not.toHaveBeenCalled();

    await waitForAutosaveDebounce();

    expect(saveGraphDraft).not.toHaveBeenCalled();
  });

  it('ignores source import completion once the canvas is blocked by missing_remote', async () => {
    setHarnessRemoteDraftRecord(
      harness,
      buildRemoteDraftRecord(
        {
          nodeIds: ['node_1'],
          nodePositions: {
            node_1: { x: 0, y: 0 },
          },
          edges: [],
        },
        'rev-1',
        '2026-04-16T00:00:00Z'
      )
    );

    await harness.renderProbe();
    await harness.renderProbe();

    clearHarnessRemoteDraftRecord(harness);
    await harness.renderProbe();

    const storeActions = harness.state.store as typeof harness.state.store & {
      setCurrentPlan: ReturnType<typeof vi.fn>;
      setSelectedNodes: ReturnType<typeof vi.fn>;
      setInspectorNode: ReturnType<typeof vi.fn>;
      showInspectorPanel: ReturnType<typeof vi.fn>;
    };

    storeActions.setCurrentPlan.mockClear();
    storeActions.setSelectedNodes.mockClear();
    storeActions.setInspectorNode.mockClear();
    storeActions.showInspectorPanel.mockClear();
    harness.state.queryClient.invalidateQueries.mockClear();

    await act(async () => {
      harness.getLatestResult()?.handleSourceImportComplete(
        buildGraphDraftSourceImportResult({
          importedNodeIds: ['node_3'],
        })
      );
    });

    expect(harness.getLatestResult()?.hasMissingRemoteDraft).toBe(true);
    expect(storeActions.setCurrentPlan).not.toHaveBeenCalled();
    expect(storeActions.setSelectedNodes).not.toHaveBeenCalled();
    expect(storeActions.setInspectorNode).not.toHaveBeenCalled();
    expect(storeActions.showInspectorPanel).not.toHaveBeenCalled();
    expect(harness.state.queryClient.invalidateQueries).not.toHaveBeenCalled();
    expect(harness.getLatestResult()?.importedNodeFocusIds).toEqual([]);
  });

  it('autosaves locally authored model edges after adopting an imported source revision', async () => {
    harness.cleanup();
    harness = setupCanvasControllerHarness();
    const importedRecord = buildProtectedDraftRecord(
      {
        tenantId: 'tenant-a',
        projectId: 'project-a',
        environmentId: 'dev',
      },
      {
        revision: 'rev-imported',
        updatedAt: '2026-04-16T00:00:00Z',
        draft: {
          canvas: { kind: 'dbt', title: 'dbt canvas' },
          nodeIds: [importedWarehouseSourceNode.id],
          nodePositions: {
            [importedWarehouseSourceNode.id]: { x: 160, y: 120 },
          },
          nodes: [importedWarehouseSourceNode],
          edges: [],
        },
      }
    );
    setHarnessRemoteDraftRecord(harness, importedRecord);
    harness.state.canonicalNodes = [importedWarehouseSourceNode];
    harness.state.canonicalEdges = [];
    harness.state.graphData = {
      nodes: [{ id: importedWarehouseSourceNode.id }],
      edges: [],
    };
    harness.mocks.useCanvasGraphHandlers.mockImplementation((params) => ({
      ...harness.state.graphHandlersResult,
      handleCreateAuthoringNode: vi.fn(() => {
        params.setNodes((existingNodes: Node[]) => [
          ...existingNodes,
          {
            id: localDbtModelNode.id,
            type: 'dbtNode',
            position: { x: 420, y: 120 },
            data: {
              name: localDbtModelNode.name,
              pluginKind: localDbtModelNode.kind,
              role: localDbtModelNode.role,
              status: localDbtModelNode.status,
            },
          },
        ]);
        params.setDraftSession((currentSession: CanvasDraftSession) =>
          canvasGraphLifecycle.node.admitExplicit(currentSession, localDbtModelNode)
        );
      }),
      onConnect: vi.fn(() => {
        params.setEdges([
          {
            id: `edge-${importedWarehouseSourceNode.id}-${localDbtModelNode.id}`,
            source: importedWarehouseSourceNode.id,
            target: localDbtModelNode.id,
            type: 'lineage',
          },
        ]);
        params.setDraftSession((currentSession: CanvasDraftSession) =>
          canvasGraphLifecycle.edge.replaceVisible(currentSession, [
            {
              id: `edge-${importedWarehouseSourceNode.id}-${localDbtModelNode.id}`,
              source: importedWarehouseSourceNode.id,
              target: localDbtModelNode.id,
              type: 'lineage',
            },
          ])
        );
      }),
    }));

    await harness.renderProbe();
    await harness.renderProbe();

    await act(async () => {
      harness.getLatestResult()?.handleSourceImportComplete(
        buildGraphDraftSourceImportResult({
          yamlFiles: ['models/sources/src_public.yml'],
          importedNodeIds: [importedWarehouseSourceNode.id],
          draftRevision: 'rev-imported',
        })
      );
    });

    await act(async () => {
      harness.getLatestResult()?.handleCreateAuthoringNode(dbtModelRegistration);
      harness.getLatestResult()?.onConnect({
        source: importedWarehouseSourceNode.id,
        target: localDbtModelNode.id,
        sourceHandle: null,
        targetHandle: null,
      });
    });
    await harness.renderProbe();
    await waitForAutosaveDebounce();
    await harness.renderProbe();

    expect(
      harness.state.services.workspaceGraphDraftAuthoringPort.saveGraphDraft
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedRevision: 'rev-imported',
        draft: expect.objectContaining({
          nodeIds: [importedWarehouseSourceNode.id, localDbtModelNode.id],
          edges: [
            expect.objectContaining({
              sourceId: importedWarehouseSourceNode.id,
              targetId: localDbtModelNode.id,
            }),
          ],
        }),
      })
    );
  });
});
