import { describe, expect, it } from 'vitest';

import { buildProtectedDraftRecord } from './workspaceGraphDraftAuthoring.test.fixtures';
import { buildExpectedCanvasAuthoringSemanticGraph } from './workspaceGraphDraftProjectionExpected.test.fixtures';
import { projectWorkspaceGraphAuthoringDraftSemanticGraph } from './workspaceGraphDraftProjection';

const WORKSPACE_SCOPE = {
  tenantId: 'tenant-a',
  projectId: 'project-a',
  environmentId: 'dev',
} as const;

describe('workspaceGraphDraftProjection', () => {
  it('projects an authoring draft into the canonical semantic graph used by the Canvas route', () => {
    const protectedDraft = buildProtectedDraftRecord(WORKSPACE_SCOPE).draft;

    expect(projectWorkspaceGraphAuthoringDraftSemanticGraph(protectedDraft)).toEqual(
      buildExpectedCanvasAuthoringSemanticGraph()
    );
  });
});
