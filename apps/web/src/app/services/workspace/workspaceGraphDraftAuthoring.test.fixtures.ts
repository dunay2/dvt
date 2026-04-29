/** Owned concern: build workspace graph authoring draft and protected record fixtures. */
import type {
  WorkspaceGraphAuthoringDraft,
  WorkspaceGraphDraftRecord as ProtectedWorkspaceGraphDraftRecord,
  WorkspaceGraphDraftScope,
} from '@dvt/contracts';

export function buildWorkspaceGraphAuthoringDraft(
  overrides: Partial<WorkspaceGraphAuthoringDraft> = {}
): WorkspaceGraphAuthoringDraft {
  return {
    canvas: {
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
        kind: 'sql_transform',
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
