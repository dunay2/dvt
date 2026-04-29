import type { WorkspaceGraphAuthoringNode } from '@dvt/contracts';
import { act, type DragEvent } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildDraftReadOkResponse,
  buildDraftSaveConflictResponse,
} from '../../services/workspace/workspaceGraphDraftProtocol.test.fixtures';
import { buildProtectedDraftRecord } from '../../services/workspace/workspaceGraphDraftAuthoring.test.fixtures';
import type { CanvasDraftSession } from './canvasDraftSession';
import {
  buildRemoteDraftRecord,
  createTransformationAuthoringHarness,
  createTransformationAuthoringHarnessWithDraft,
  setHarnessRemoteDraftRecord,
  TRANSFORMATION_AUTHORING_CANONICAL_NODES,
  type CanvasControllerHarness,
  WORKSPACE_LAYOUT_KEY,
  waitForAutosaveDebounce,
} from './useCanvasController.draftLifecycle.test.support';
import { projectCanvasHarnessDraftReadModel } from './useCanvasController.test.draftAuthoring';
import {
  createReloadRecoveryHarness,
  reloadLatestDraft,
} from './useCanvasController.reloadRecovery.test.support';

const AUTHORING_SCOPE = {
  tenantId: 'tenant-a',
  projectId: 'project-a',
  environmentId: 'dev',
} as const;

type ProtectedDraftNode = WorkspaceGraphAuthoringNode;
type ProtectedDraftReadResult = ReturnType<typeof buildDraftReadOkResponse>;

function requireCanonicalNode(
  nodeId: string
): (typeof TRANSFORMATION_AUTHORING_CANONICAL_NODES)[number] {
  return (
    TRANSFORMATION_AUTHORING_CANONICAL_NODES.find((node) => node.id === nodeId) ??
    (() => {
      throw new Error(`EXPECTED_${nodeId.toUpperCase()}_CANONICAL_NODE`);
    })()
  );
}

function buildLocalThreeNodeDraftRecord(args: {
  revision: string;
  updatedAt?: string;
}): ReturnType<typeof buildRemoteDraftRecord> {
  const { revision, updatedAt = '2026-04-18T00:00:02Z' } = args;

  return buildRemoteDraftRecord(
    {
      nodeIds: ['node_1', 'node_2', 'node_3'],
      nodePositions: {
        node_1: { x: 0, y: 0 },
        node_2: { x: 220, y: 120 },
        node_3: { x: 420, y: 120 },
      },
      edges: [
        { sourceId: 'node_1', targetId: 'node_2' },
        { sourceId: 'node_2', targetId: 'node_3' },
      ],
    },
    revision,
    updatedAt
  );
}

function buildSingleNodeDraftRecord(args: {
  nodeId: string;
  revision: string;
  updatedAt?: string;
}): ReturnType<typeof buildRemoteDraftRecord> {
  const { nodeId, revision, updatedAt = '2026-04-18T00:00:03Z' } = args;

  return buildRemoteDraftRecord(
    {
      nodeIds: [nodeId],
      nodePositions: {
        [nodeId]: { x: 220, y: 120 },
      },
      edges: [],
    },
    revision,
    updatedAt
  );
}

function buildProtectedTableNode(
  args:
    | {
        nodeId: string;
        type: 'source';
        schema: string;
        table: string;
        alias: string;
      }
    | {
        nodeId: string;
        type: 'sink';
        schema: string;
        table: string;
        materialization: 'table';
        writeMode: 'replace';
      }
): ProtectedDraftNode {
  if (args.type === 'source') {
    return {
      id: args.nodeId,
      name: args.alias,
      pluginId: 'dvt',
      kind: 'source',
      role: 'input',
      status: 'idle',
      tags: [],
      metadata: {
        config: {
          schema: args.schema,
          table: args.table,
          alias: args.alias,
        },
      },
    };
  }

  return {
    id: args.nodeId,
    name: args.table,
    pluginId: 'dvt',
    kind: 'sink',
    role: 'output',
    status: 'idle',
    tags: [],
    metadata: {
      config: {
        schema: args.schema,
        table: args.table,
        materialization: args.materialization,
        writeMode: args.writeMode,
      },
    },
  };
}

function buildProtectedTransformNode(args: {
  nodeId: string;
  path: string;
  contentShaSeed: string;
}): ProtectedDraftNode {
  const { nodeId, path, contentShaSeed } = args;

  return {
    id: nodeId,
    name: nodeId,
    pluginId: 'dvt',
    kind: 'sql_transform',
    role: 'transform',
    status: 'idle',
    tags: [],
    path,
    metadata: {
      config: {
        dialect: 'postgres' as const,
      },
      sqlArtifact: {
        repo: 'dunay2/dvt',
        path,
        ref: 'refs/heads/main',
        commitSha: 'remote',
        contentSha256: contentShaSeed.repeat(64),
      },
      entrypoint: path,
    },
  };
}

function buildProtectedDraftReadResult(args: {
  revision: string;
  updatedAt: string;
  nodes: ProtectedDraftNode[];
  edges: Array<{ sourceId: string; targetId: string }>;
}): ProtectedDraftReadResult {
  const { revision, updatedAt, nodes, edges } = args;
  const nodeIds = nodes.map((node) => node.id);

  return buildDraftReadOkResponse(AUTHORING_SCOPE, {
    record: buildProtectedDraftRecord(AUTHORING_SCOPE, {
      revision,
      updatedAt,
      draft: {
        canvas: {
          kind: 'transformation',
          title: 'Main canvas',
        },
        nodeIds,
        nodePositions: Object.fromEntries(
          nodeIds.map((nodeId, index) => [nodeId, { x: index * 220, y: 120 }])
        ),
        nodes,
        edges: edges.map((edge) => ({
          id: `draft_edge_${edge.sourceId}_${edge.targetId}`,
          sourceId: edge.sourceId,
          targetId: edge.targetId,
          relation: 'lineage',
        })),
      },
    }),
  });
}

function configureDroppedNodeHandleDrop(
  harness: CanvasControllerHarness,
  droppedCanonicalNode = requireCanonicalNode('node_3')
): void {
  harness.mocks.useCanvasGraphHandlers.mockImplementation((params) => ({
    ...harness.state.graphHandlersResult,
    handleDrop: vi.fn(() => {
      harness.state.graphDraftQueryData = projectCanvasHarnessDraftReadModel(
        buildLocalThreeNodeDraftRecord({ revision: 'rev-local-semantic' })
      );
      params.setNodes((existingNodes: Array<Record<string, unknown>>) => [
        ...existingNodes,
        {
          id: 'node_3',
          type: 'dbtNode',
          position: { x: 420, y: 120 },
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
    }),
  }));
}

async function triggerDropAutosave(harness: CanvasControllerHarness): Promise<void> {
  await harness.renderProbe();
  await act(async () => {
    harness.getLatestResult()?.handleDrop({} as DragEvent<HTMLDivElement>);
  });
  await harness.renderProbe();
  await waitForAutosaveDebounce();
  await harness.renderProbe();
}

function appendRemoteSinkGraphState(harness: CanvasControllerHarness): void {
  harness.state.canonicalNodes = [
    ...harness.state.canonicalNodes,
    {
      id: 'node_4',
      name: 'remote_sink',
      pluginId: 'dvt',
      kind: 'dvt:sink',
      role: 'output',
      status: 'idle',
      tags: [],
      metadata: {
        config: {
          schema: 'analytics',
          table: 'remote_sink',
          materialization: 'table',
          writeMode: 'replace',
        },
      },
    },
  ];
  harness.state.canonicalEdges = [
    ...harness.state.canonicalEdges,
    {
      id: 'edge_remote',
      sourceId: 'node_2',
      targetId: 'node_4',
      relation: 'lineage',
    },
  ];
  harness.state.graphData = {
    nodes: [{ id: 'node_1' }, { id: 'node_2' }, { id: 'node_3' }, { id: 'node_4' }],
    edges: [{ id: 'edge_1' }, { id: 'edge_2' }, { id: 'edge_remote' }],
  };
}

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
      buildRemoteDraftRecord(
        {
          nodeIds: ['node_1', 'node_2'],
          nodePositions: {
            node_1: { x: 0, y: 0 },
            node_2: { x: 220, y: 120 },
          },
          edges: [{ sourceId: 'node_1', targetId: 'node_2' }],
        },
        'rev-base'
      ),
      ['node_1', 'node_2']
    );
    harness.state.services.workspaceGraphDraftAuthoringPort.saveGraphDraft = async () => {
      saveAttempts += 1;
      setHarnessRemoteDraftRecord(
        harness,
        buildLocalThreeNodeDraftRecord({ revision: 'rev-remote' })
      );
      return buildDraftSaveConflictResponse(AUTHORING_SCOPE, { currentRevision: 'rev-remote' });
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

  it('reloads from the typed authoring port instead of bypassing through the injected graph-draft cache state', async () => {
    harness.cleanup();
    harness = await createTransformationAuthoringHarness();
    setHarnessRemoteDraftRecord(
      harness,
      buildSingleNodeDraftRecord({ nodeId: 'node_2', revision: 'rev-stale' })
    );
    appendRemoteSinkGraphState(harness);
    harness.state.services.workspaceGraphDraftAuthoringPort.readGraphDraft = vi.fn(async () =>
      buildProtectedDraftReadResult({
        revision: 'rev-remote',
        updatedAt: '2026-04-18T00:00:05Z',
        nodes: [
          buildProtectedTransformNode({
            nodeId: 'node_2',
            path: 'models/transform.sql',
            contentShaSeed: 'c',
          }),
          buildProtectedTableNode({
            nodeId: 'node_4',
            type: 'sink',
            schema: 'analytics',
            table: 'remote_sink',
            materialization: 'table',
            writeMode: 'replace',
          }),
        ],
        edges: [{ sourceId: 'node_2', targetId: 'node_4' }],
      })
    );

    await reloadLatestDraft(harness);

    expect(
      harness.state.services.workspaceGraphDraftAuthoringPort.readGraphDraft
    ).toHaveBeenCalled();
    expect(harness.getLatestResult()?.nodesWithImpact.map((node) => node.id)).toEqual([
      'node_2',
      'node_4',
    ]);
    expect(harness.getLatestResult()?.edges).toEqual([
      { id: 'draft_edge_node_2_node_4', source: 'node_2', target: 'node_4' },
    ]);
  });

  it('reloads against fresh protected draft semantics so remote draft nodes are not truncated by stale local canon', async () => {
    setHarnessRemoteDraftRecord(
      harness,
      buildRemoteDraftRecord(
        {
          nodeIds: ['node_1', 'node_3'],
          nodePositions: {
            node_1: { x: 0, y: 0 },
            node_3: { x: 220, y: 120 },
          },
          edges: [{ sourceId: 'node_1', targetId: 'node_3' }],
        },
        'rev-remote',
        '2026-04-17T00:00:01Z'
      )
    );
    harness.state.services.workspaceService.getGraphSnapshot = vi.fn(async () => {
      throw new Error('RETIRED_GRAPH_SNAPSHOT_SHOULD_NOT_BE_USED');
    });
    harness.state.services.workspaceGraphDraftAuthoringPort.readGraphDraft = vi.fn(async () =>
      buildProtectedDraftReadResult({
        revision: 'rev-remote',
        updatedAt: '2026-04-17T00:00:02Z',
        nodes: [
          buildProtectedTableNode({
            nodeId: 'node_1',
            type: 'source',
            schema: 'raw',
            table: 'orders',
            alias: 'orders',
          }),
          buildProtectedTransformNode({
            nodeId: 'node_3',
            path: 'models/src_erp_orders.sql',
            contentShaSeed: 'd',
          }),
        ],
        edges: [{ sourceId: 'node_1', targetId: 'node_3' }],
      })
    );

    await harness.renderProbe();
    await reloadLatestDraft(harness);

    expect(
      harness.state.services.workspaceGraphDraftAuthoringPort.readGraphDraft
    ).toHaveBeenCalled();
    expect(harness.state.services.workspaceService.getGraphSnapshot).not.toHaveBeenCalled();
    expect(harness.getLatestResult()?.nodesWithImpact.map((node) => node.id)).toEqual([
      'node_1',
      'node_3',
    ]);
    expect(harness.getLatestResult()?.edges).toEqual([
      { id: 'draft_edge_node_1_node_3', source: 'node_1', target: 'node_3' },
    ]);
  });
});
