import { describe, expect, it } from 'vitest';

import { buildProtectedDraftRecord } from './workspaceGraphDraft.test.fixtures';
import {
  projectDesignGraphDraft,
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
