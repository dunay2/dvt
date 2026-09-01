/** Owned concern: build expected workspace graph draft projection fixtures. */
import type { CanvasAuthoringSemanticGraph } from './workspaceGraphDraftProjection';

export function buildExpectedCanvasAuthoringSemanticGraph(): CanvasAuthoringSemanticGraph {
  return {
    canonicalNodes: [
      {
        id: 'source_node',
        name: 'orders',
        pluginId: 'dvt',
        kind: 'dvt:source',
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
        kind: 'dvt:transform',
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
        kind: 'dvt:sink',
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
    canonicalEdges: [
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
  };
}
