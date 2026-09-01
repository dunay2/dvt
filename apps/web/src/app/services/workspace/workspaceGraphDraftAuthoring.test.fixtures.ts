/** Owned concern: build workspace graph authoring draft and protected record fixtures. */
import type {
  WorkspaceGraphAuthoringDraft,
  WorkspaceGraphAuthoringEdge,
  WorkspaceGraphAuthoringNode,
  WorkspaceGraphDraftRecord as ProtectedWorkspaceGraphDraftRecord,
  WorkspaceGraphDraftScope,
} from '@dvt/contracts';

const LARGE_GRAPH_LAYER_COUNT = 25;
const LARGE_GRAPH_NODES_PER_LAYER = 40;

function buildLargeGraphNodeId(layerIndex: number, nodeIndex: number): string {
  return `large-node-${layerIndex.toString().padStart(2, '0')}-${nodeIndex
    .toString()
    .padStart(2, '0')}`;
}

function buildLargeGraphNode(layerIndex: number, nodeIndex: number): WorkspaceGraphAuthoringNode {
  const firstLayer = layerIndex === 0;
  const lastLayer = layerIndex === LARGE_GRAPH_LAYER_COUNT - 1;
  const id = buildLargeGraphNodeId(layerIndex, nodeIndex);

  return {
    id,
    name: id,
    pluginId: 'dvt',
    kind: firstLayer ? 'source' : lastLayer ? 'sink' : 'transform',
    role: firstLayer ? 'input' : lastLayer ? 'output' : 'transform',
    status: 'idle',
    tags: ['large-graph'],
    ...(firstLayer || lastLayer ? {} : { path: `models/large/${id}.sql` }),
  };
}

function buildLargeGraphEdges(): WorkspaceGraphAuthoringEdge[] {
  const edges: WorkspaceGraphAuthoringEdge[] = [];

  for (let layerIndex = 0; layerIndex < LARGE_GRAPH_LAYER_COUNT - 1; layerIndex += 1) {
    for (let nodeIndex = 0; nodeIndex < LARGE_GRAPH_NODES_PER_LAYER; nodeIndex += 1) {
      const sourceId = buildLargeGraphNodeId(layerIndex, nodeIndex);
      for (const targetIndex of [nodeIndex, (nodeIndex + 1) % LARGE_GRAPH_NODES_PER_LAYER]) {
        const targetId = buildLargeGraphNodeId(layerIndex + 1, targetIndex);
        edges.push({
          id: `large-edge-${sourceId}-${targetId}`,
          sourceId,
          targetId,
          relation: 'lineage',
        });
      }
    }
  }

  return edges;
}

export function buildWorkspaceGraphAuthoringDraft(
  overrides: Partial<WorkspaceGraphAuthoringDraft> = {}
): WorkspaceGraphAuthoringDraft {
  return {
    canvas: {
      id: 'main-canvas',
      kind: 'transformation',
      title: 'Main canvas',
    },
    nodeIds: ['source_node', 'transform_node', 'sink_node'],
    nodePositions: {
      source_node: { x: 0, y: 0 },
      transform_node: { x: 240, y: 0 },
      sink_node: { x: 480, y: 0 },
    },
    nodes: [
      {
        id: 'source_node',
        name: 'orders',
        pluginId: 'dvt',
        kind: 'source',
        role: 'input',
        status: 'idle',
        tags: [],
        metadata: {
          config: {
            schema: 'raw',
            table: 'orders',
            alias: 'orders',
          },
        },
      },
      {
        id: 'transform_node',
        name: 'transform',
        pluginId: 'dvt',
        kind: 'transform',
        role: 'transform',
        status: 'idle',
        tags: [],
        path: 'models/transform.sql',
        metadata: {
          config: {
            dialect: 'postgres',
          },
          sqlArtifact: {
            repo: 'repo',
            path: 'models/transform.sql',
            ref: 'main',
            commitSha: 'abc123',
            contentSha256: 'a'.repeat(64),
          },
        },
      },
      {
        id: 'sink_node',
        name: 'orders_final',
        pluginId: 'dvt',
        kind: 'sink',
        role: 'output',
        status: 'idle',
        tags: [],
        metadata: {
          config: {
            schema: 'analytics',
            table: 'orders_final',
            materialization: 'table',
            writeMode: 'replace',
          },
        },
      },
    ],
    edges: [
      {
        id: 'edge_source_transform',
        sourceId: 'source_node',
        targetId: 'transform_node',
        relation: 'lineage',
      },
      {
        id: 'edge_transform_sink',
        sourceId: 'transform_node',
        targetId: 'sink_node',
        relation: 'lineage',
      },
    ],
    ...overrides,
  };
}

export function buildLargeWorkspaceGraphAuthoringDraft(): WorkspaceGraphAuthoringDraft {
  const nodes: WorkspaceGraphAuthoringNode[] = [];
  const nodePositions: WorkspaceGraphAuthoringDraft['nodePositions'] = {};

  for (let layerIndex = 0; layerIndex < LARGE_GRAPH_LAYER_COUNT; layerIndex += 1) {
    for (let nodeIndex = 0; nodeIndex < LARGE_GRAPH_NODES_PER_LAYER; nodeIndex += 1) {
      const node = buildLargeGraphNode(layerIndex, nodeIndex);
      nodes.push(node);
      nodePositions[node.id] = {
        x: layerIndex * 240,
        y: nodeIndex * 120,
      };
    }
  }

  return buildWorkspaceGraphAuthoringDraft({
    canvas: {
      id: 'large-canvas',
      kind: 'transformation',
      title: 'Large Canvas regression fixture',
    },
    nodeIds: nodes.map((node) => node.id),
    nodePositions,
    nodes,
    edges: buildLargeGraphEdges(),
  });
}

export function buildProtectedDraftRecord(
  scope: WorkspaceGraphDraftScope,
  overrides: Partial<ProtectedWorkspaceGraphDraftRecord> = {}
): ProtectedWorkspaceGraphDraftRecord {
  const baseRecord: ProtectedWorkspaceGraphDraftRecord = {
    scope,
    schemaVersion: 'workspace-graph-draft.v1',
    revision: 'rev-1',
    draft: buildWorkspaceGraphAuthoringDraft(),
    updatedAt: '2026-04-18T01:00:00.000Z',
  };

  return {
    ...baseRecord,
    ...overrides,
    scope: overrides.scope ?? baseRecord.scope,
  };
}
