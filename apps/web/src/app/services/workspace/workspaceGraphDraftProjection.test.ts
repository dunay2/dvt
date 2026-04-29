import { describe, expect, it } from 'vitest';

import { buildProtectedDraftRecord } from './workspaceGraphDraft.test.fixtures';
import {
  projectWorkspaceGraphAuthoringDraft,
  projectWorkspaceGraphAuthoringDraftSnapshot,
  projectWorkspaceGraphAuthoringDraftSemanticGraph,
  projectProtectedWorkspaceGraphDraftRecord,
} from './workspaceGraphDraftProjection';

const WORKSPACE_SCOPE = {
  tenantId: 'tenant-a',
  projectId: 'project-a',
  environmentId: 'dev',
} as const;

describe('workspaceGraphDraftProjection', () => {
  it('projects an authoring draft into the Canvas draft shape with layout', () => {
    const protectedDraft = buildProtectedDraftRecord(WORKSPACE_SCOPE).draft;

    expect(projectWorkspaceGraphAuthoringDraft(protectedDraft)).toEqual({
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
      edges: [
        { sourceId: 'source_node', targetId: 'transform_node' },
        { sourceId: 'transform_node', targetId: 'sink_node' },
      ],
    });
  });

  it('projects an authoring draft into the canonical semantic graph used by the Canvas route', () => {
    const protectedDraft = buildProtectedDraftRecord(WORKSPACE_SCOPE).draft;

    expect(projectWorkspaceGraphAuthoringDraftSemanticGraph(protectedDraft)).toEqual({
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
          kind: 'dvt:sql_transform',
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
    });
  });

  it('projects a protected record into the presentation draft record shape', () => {
    const protectedRecord = buildProtectedDraftRecord(WORKSPACE_SCOPE, {
      revision: 'rev-protected',
      updatedAt: '2026-04-20T16:30:00.000Z',
    });

    expect(projectProtectedWorkspaceGraphDraftRecord(protectedRecord)).toEqual({
      revision: 'rev-protected',
      savedAt: '2026-04-20T16:30:00.000Z',
      draft: {
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
        edges: [
          { sourceId: 'source_node', targetId: 'transform_node' },
          { sourceId: 'transform_node', targetId: 'sink_node' },
        ],
      },
    });
  });

  it('preserves DBT metadata-backed fields when projecting draft snapshots', () => {
    const protectedDraft = buildProtectedDraftRecord(WORKSPACE_SCOPE).draft;
    const transformNode = protectedDraft.nodes.find((node) => node.id === 'transform_node');
    if (transformNode == null) {
      throw new Error('Expected transform_node fixture.');
    }
    const metadataColumns = [
      {
        name: 'order_id',
        type: 'INTEGER',
        nullable: false,
        description: 'Order identifier',
      },
    ];
    transformNode.metadata = {
      ...transformNode.metadata,
      package: 'analytics_core',
      compiledSql: 'select order_id from raw.orders',
      columns: metadataColumns,
    };

    const snapshot = projectWorkspaceGraphAuthoringDraftSnapshot(protectedDraft);

    const transformSnapshotNode = snapshot.nodes.find((node) => node.id === 'transform_node');
    expect(transformSnapshotNode).toMatchObject({
      package: 'analytics_core',
      compiledSql: 'select order_id from raw.orders',
      columns: metadataColumns,
    });
    expect(transformSnapshotNode?.columns).not.toBe(metadataColumns);
  });
});
