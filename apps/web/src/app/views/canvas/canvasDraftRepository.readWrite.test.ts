import { describe, expect, it, vi } from 'vitest';

import type {
  IWorkspaceGraphDraftAuthoringPort,
  WorkspaceGraphDraftAuthoringSaveResult,
} from '../../ports/workspaceGraphDraftAuthoring';
import { createCanvasDraftRepository } from './canvasDraftRepository';
import {
  buildAuthoringPort,
  buildSaveInput,
  buildWorkspacePort,
  PROJECTED_DRAFT,
  WORKSPACE_SCOPE,
} from './canvasDraftRepository.test.fixtures';

function buildDeniedSaveResult(): WorkspaceGraphDraftAuthoringSaveResult {
  return {
    kind: 'denied',
    capability: {
      scope: WORKSPACE_SCOPE,
      mode: 'read_only',
      canRead: true,
      canWrite: false,
      reason: 'write_denied',
    },
    auditRef: {
      correlationId: 'corr-denied',
      decisionId: 'dec-denied',
      action: 'draft_write',
      outcome: 'read_only',
      recordedAt: '2026-04-18T00:00:02Z',
    },
  };
}

describe('canvasDraftRepository read/write', () => {
  it('projects protected draft reads into the route-facing record model', async () => {
    const repository = createCanvasDraftRepository(buildWorkspacePort(), buildAuthoringPort());

    await expect(repository.readGraphDraft()).resolves.toEqual({
      revision: 'rev-1',
      savedAt: '2026-04-18T00:00:00Z',
      draft: {
        nodeIds: ['source-node', 'transform-node', 'sink-node'],
        nodePositions: {},
        edges: [
          { sourceId: 'source-node', targetId: 'transform-node' },
          { sourceId: 'transform-node', targetId: 'sink-node' },
        ],
      },
    });
    await expect(repository.readGraphSnapshot()).resolves.toEqual({ nodes: [], edges: [] });
  });

  it('builds typed authoring saves and preserves the projected draft locally on success', async () => {
    const authoringPort = buildAuthoringPort();
    const repository = createCanvasDraftRepository(buildWorkspacePort(), authoringPort);

    await expect(repository.saveGraphDraft(buildSaveInput())).resolves.toEqual({
      outcome: 'saved',
      record: {
        revision: 'rev-2',
        savedAt: expect.any(String),
        draft: PROJECTED_DRAFT,
      },
    });

    expect(authoringPort.saveGraphDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedRevision: 'rev-1',
        idempotencyKey: 'idem-1',
        draft: expect.objectContaining({
          context: expect.objectContaining({
            tenantId: 'tenant-a',
            projectId: 'project-a',
            environmentId: 'dev',
            executionTarget: 'postgres',
          }),
          nodes: expect.arrayContaining([
            expect.objectContaining({ id: 'source-node', type: 'source' }),
            expect.objectContaining({ id: 'transform-node', type: 'sql_transform' }),
            expect.objectContaining({ id: 'sink-node', type: 'sink' }),
          ]),
          edges: [
            { fromNodeId: 'source-node', toNodeId: 'transform-node' },
            { fromNodeId: 'transform-node', toNodeId: 'sink-node' },
          ],
        }),
      })
    );
  });

  it('fails closed when authoring denies writes for the current scope', async () => {
    const authoringPort = buildAuthoringPort({
      saveGraphDraft: vi.fn(
        async (): Promise<WorkspaceGraphDraftAuthoringSaveResult> => buildDeniedSaveResult()
      ) as IWorkspaceGraphDraftAuthoringPort['saveGraphDraft'],
    });
    const repository = createCanvasDraftRepository(buildWorkspacePort(), authoringPort);

    await expect(repository.saveGraphDraft(buildSaveInput())).rejects.toThrow(
      'Workspace graph draft authoring is not writable for the current scope.'
    );
  });

  it('fails closed when authoring rejects the schema version', async () => {
    const authoringPort = buildAuthoringPort({
      saveGraphDraft: vi.fn(async (): Promise<WorkspaceGraphDraftAuthoringSaveResult> => ({
        kind: 'unsupported_schema_version',
        expectedSchemaVersion: 'workspace-graph-draft.v2',
      })) as IWorkspaceGraphDraftAuthoringPort['saveGraphDraft'],
    });
    const repository = createCanvasDraftRepository(buildWorkspacePort(), authoringPort);

    await expect(repository.saveGraphDraft(buildSaveInput())).rejects.toThrow(
      'Workspace graph draft authoring rejected schema version; expected workspace-graph-draft.v2.'
    );
  });

  it('fails closed when authoring rejects the idempotency key for a different payload', async () => {
    const authoringPort = buildAuthoringPort({
      saveGraphDraft: vi.fn(async (): Promise<WorkspaceGraphDraftAuthoringSaveResult> => ({
        kind: 'idempotency_mismatch',
      })) as IWorkspaceGraphDraftAuthoringPort['saveGraphDraft'],
    });
    const repository = createCanvasDraftRepository(buildWorkspacePort(), authoringPort);

    await expect(repository.saveGraphDraft(buildSaveInput())).rejects.toThrow(
      'Workspace graph draft authoring rejected the idempotency key for a different payload.'
    );
  });
});
