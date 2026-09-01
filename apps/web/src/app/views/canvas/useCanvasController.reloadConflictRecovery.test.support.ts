import type { WorkspaceGraphAuthoringNode } from '@dvt/contracts';
import { act, type DragEvent } from 'react';
import { vi } from 'vitest';

import {
  buildDraftReadOkResponse,
  buildDraftSaveConflictResponse,
} from '../../services/workspace/workspaceGraphDraftProtocol.test.fixtures';
import { buildProtectedDraftRecord } from '../../services/workspace/workspaceGraphDraftAuthoring.test.fixtures';
import type { CanvasDraftSession } from './canvasDraftSession';
import {
  buildRemoteDraftRecord,
  TRANSFORMATION_AUTHORING_CANONICAL_NODES,
  type CanvasControllerHarness,
  waitForAutosaveDebounce,
} from './useCanvasController.draftLifecycle.test.support';
import { projectCanvasHarnessDraftReadModel } from './useCanvasController.test.draftAuthoring';

export const AUTHORING_SCOPE = {
  tenantId: 'tenant-a',
  projectId: 'project-a',
  environmentId: 'dev',
} as const;

type ProtectedDraftNode = WorkspaceGraphAuthoringNode;
type ProtectedDraftReadResult = ReturnType<typeof buildDraftReadOkResponse>;

export function buildDraftConflictResponse(args: { currentRevision: string }) {
  return buildDraftSaveConflictResponse(AUTHORING_SCOPE, args);
}

export function requireCanonicalNode(
  nodeId: string
): (typeof TRANSFORMATION_AUTHORING_CANONICAL_NODES)[number] {
  return (
    TRANSFORMATION_AUTHORING_CANONICAL_NODES.find((node) => node.id === nodeId) ??
    (() => {
      throw new Error(`EXPECTED_${nodeId.toUpperCase()}_CANONICAL_NODE`);
    })()
  );
}

export function buildLocalThreeNodeDraftRecord(args: {
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

export function buildTwoNodeDraftRecord(args: {
  revision: string;
  updatedAt?: string;
}): ReturnType<typeof buildRemoteDraftRecord> {
  const { revision, updatedAt = '2026-04-18T00:00:02Z' } = args;

  return buildRemoteDraftRecord(
    {
      nodeIds: ['node_1', 'node_2'],
      nodePositions: {
        node_1: { x: 0, y: 0 },
        node_2: { x: 220, y: 120 },
      },
      edges: [{ sourceId: 'node_1', targetId: 'node_2' }],
    },
    revision,
    updatedAt
  );
}

export function buildSourceTransformDraftRecord(args: {
  revision: string;
  updatedAt?: string;
}): ReturnType<typeof buildRemoteDraftRecord> {
  const { revision, updatedAt = '2026-04-17T00:00:01Z' } = args;

  return buildRemoteDraftRecord(
    {
      nodeIds: ['node_1', 'node_3'],
      nodePositions: {
        node_1: { x: 0, y: 0 },
        node_3: { x: 220, y: 120 },
      },
      edges: [{ sourceId: 'node_1', targetId: 'node_3' }],
    },
    revision,
    updatedAt
  );
}

export function buildSingleNodeDraftRecord(args: {
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

export function buildProtectedTableNode(
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

export function buildProtectedTransformNode(args: {
  nodeId: string;
  path: string;
  contentShaSeed: string;
}): ProtectedDraftNode {
  const { nodeId, path, contentShaSeed } = args;

  return {
    id: nodeId,
    name: nodeId,
    pluginId: 'dvt',
    kind: 'transform',
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

export function buildProtectedDraftReadResult(args: {
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

export function configureDroppedNodeHandleDrop(
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

export async function triggerDropAutosave(harness: CanvasControllerHarness): Promise<void> {
  await harness.renderProbe();
  await act(async () => {
    harness.getLatestResult()?.handleDrop({} as DragEvent<HTMLDivElement>);
  });
  await harness.renderProbe();
  await waitForAutosaveDebounce();
  await harness.renderProbe();
}

export function appendRemoteSinkGraphState(harness: CanvasControllerHarness): void {
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
