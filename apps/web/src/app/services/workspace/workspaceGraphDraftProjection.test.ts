import { describe, expect, it } from 'vitest';

import { buildProtectedDraftRecord } from './workspaceGraphDraftAuthoring.test.fixtures';
import { buildExpectedWorkspaceGraphDraftSemanticGraph } from './workspaceGraphDraftProjectionExpected.test.fixtures';
import {
  projectWorkspaceGraphAuthoringDraft,
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

    expect(projectWorkspaceGraphAuthoringDraftSemanticGraph(protectedDraft)).toEqual(
      buildExpectedWorkspaceGraphDraftSemanticGraph()
    );
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
});
