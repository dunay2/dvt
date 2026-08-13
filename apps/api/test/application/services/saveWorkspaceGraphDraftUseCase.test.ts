import {
  WORKSPACE_GRAPH_DRAFT_CAPABILITY_MODE,
  WORKSPACE_GRAPH_DRAFT_CAPABILITY_REASON,
} from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import type {
  IWorkspaceGraphDraftStore,
  WorkspaceGraphDraftDecisionContext,
} from '../../../src/application/ports/workspaceGraphDraft.js';
import { SaveWorkspaceGraphDraftUseCase } from '../../../src/application/services/saveWorkspaceGraphDraftUseCase.js';
import { EnvironmentId, ProjectId, TenantId } from '../../../src/domain/auth/types.js';
import {
  TEST_WORKSPACE_SCOPE,
  buildWorkspaceGraphDraftSaveRequest,
} from '../../fixtures/workspaceGraphDraftFixture.js';

describe('SaveWorkspaceGraphDraftUseCase', () => {
  it('hashes semantically identical requests with JCS and declares every Canvas owner', async () => {
    const save = vi.fn(async (_input: Parameters<IWorkspaceGraphDraftStore['save']>[0]) => ({
      kind: 'saved' as const,
      schemaVersion: 'workspace-graph-draft.v1',
      revision: 'revision-1',
      updatedAt: '2026-08-13T10:00:00.000Z',
      deduplicated: false,
    }));
    const useCase = new SaveWorkspaceGraphDraftUseCase(
      { save } as never,
      { record: vi.fn(async () => undefined) },
      () => new Date('2026-08-13T10:00:00.000Z')
    );
    const request = buildWorkspaceGraphDraftSaveRequest({
      draft: {
        ...buildWorkspaceGraphDraftSaveRequest().draft,
        canvas: { id: 'main', kind: 'transformation', title: 'Main' },
        activeCanvasId: 'secondary',
        canvases: [
          {
            ...buildWorkspaceGraphDraftSaveRequest().draft,
            canvas: { id: 'main', kind: 'transformation', title: 'Main' },
          },
          {
            ...buildWorkspaceGraphDraftSaveRequest().draft,
            canvas: { id: 'secondary', kind: 'transformation', title: 'Secondary' },
          },
        ],
      },
    });
    const reordered = {
      ...request,
      draft: {
        edges: request.draft.edges,
        nodes: request.draft.nodes,
        nodePositions: request.draft.nodePositions,
        nodeIds: request.draft.nodeIds,
        canvases: request.draft.canvases,
        activeCanvasId: request.draft.activeCanvasId,
        canvas: request.draft.canvas,
      },
    };

    await useCase.execute({ request, decision: writableDecision() });
    await useCase.execute({ request: reordered, decision: writableDecision() });

    expect(save).toHaveBeenCalledTimes(2);
    expect(save.mock.calls[0]?.[0].requestHash).toBe(save.mock.calls[1]?.[0].requestHash);
    expect(save.mock.calls[0]?.[0].canvasIds).toEqual(['main', 'secondary']);
  });
});

function writableDecision(): WorkspaceGraphDraftDecisionContext {
  return {
    authentication: 'authenticated' as const,
    requestId: 'request-1',
    correlationId: 'request-1',
    decisionId: 'decision-1',
    recordedAt: '2026-08-13T10:00:00.000Z',
    requestedScope: {
      tenantId: TenantId.unsafe(TEST_WORKSPACE_SCOPE.tenantId),
      projectId: ProjectId.unsafe(TEST_WORKSPACE_SCOPE.projectId),
      environmentId: EnvironmentId.unsafe(TEST_WORKSPACE_SCOPE.environmentId),
    },
    scope: TEST_WORKSPACE_SCOPE,
    capability: {
      scope: TEST_WORKSPACE_SCOPE,
      mode: WORKSPACE_GRAPH_DRAFT_CAPABILITY_MODE.writable,
      canRead: true,
      canWrite: true,
      reason: WORKSPACE_GRAPH_DRAFT_CAPABILITY_REASON.authorized,
    },
  };
}
