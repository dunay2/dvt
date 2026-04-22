import { describe, expect, it } from 'vitest';

import { buildProtectedDraftRecord } from './workspaceGraphDraft.test.fixtures';
import {
  projectDesignGraphDraft,
  projectDesignGraphDraftSemanticGraph,
  projectProtectedWorkspaceGraphDraftRecord,
} from './workspaceGraphDraftProjection';

const WORKSPACE_SCOPE = {
  tenantId: 'tenant-a',
  projectId: 'project-a',
  environmentId: 'dev',
} as const;

describe('workspaceGraphDraftProjection', () => {
  it('projects a design graph draft into the Canvas draft shape without layout', () => {
    const protectedDraft = buildProtectedDraftRecord(WORKSPACE_SCOPE).draft;

    expect(projectDesignGraphDraft(protectedDraft)).toEqual({
      nodeIds: ['source_node', 'transform_node', 'sink_node'],
      nodePositions: {},
      edges: [
        { sourceId: 'source_node', targetId: 'transform_node' },
        { sourceId: 'transform_node', targetId: 'sink_node' },
      ],
    });
  });

  it('projects a design graph draft into the canonical semantic graph used by the Canvas route', () => {
    const protectedDraft = buildProtectedDraftRecord(WORKSPACE_SCOPE).draft;

    expect(projectDesignGraphDraftSemanticGraph(protectedDraft)).toEqual({
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
          id: 'draft_edge_source_node_transform_node',
          sourceId: 'source_node',
          targetId: 'transform_node',
          relation: 'lineage',
        },
        {
          id: 'draft_edge_transform_node_sink_node',
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
        nodeIds: ['source_node', 'transform_node', 'sink_node'],
        nodePositions: {},
        edges: [
          { sourceId: 'source_node', targetId: 'transform_node' },
          { sourceId: 'transform_node', targetId: 'sink_node' },
        ],
      },
    });
  });
});
