import { describe, expect, it, vi } from 'vitest';

import type {
  IWorkspaceGraphDraftAuthoringPort,
  WorkspaceGraphDraftAuthoringReadResult,
  WorkspaceGraphDraftAuthoringSaveResult,
} from '../../ports/workspaceGraphDraftAuthoring';
import { createCanvasDraftRepository } from './canvasDraftRepository';
import {
  buildAuthoringPort,
  buildSaveInput,
  buildWorkspacePort,
  WORKSPACE_SCOPE,
} from './canvasDraftRepository.test.fixtures';

const CONFLICT_RELOAD_ERROR =
  'Workspace graph draft conflict could not reload the current remote draft.';

function buildConflictSaveResult(): WorkspaceGraphDraftAuthoringSaveResult {
  return {
    kind: 'conflict',
    capability: {
      scope: WORKSPACE_SCOPE,
      mode: 'writable',
      canRead: true,
      canWrite: true,
      reason: 'authorized',
    },
    auditRef: {
      correlationId: 'corr-conflict',
      decisionId: 'dec-conflict',
      action: 'draft_write',
      outcome: 'conflict',
      recordedAt: '2026-04-18T00:00:02Z',
    },
    formatMeta: {
      schemaVersion: 'workspace-graph-draft.v1',
      storedSchemaVersion: 'workspace-graph-draft.v1',
      migrationState: 'native',
    },
    currentRevision: 'rev-remote',
  };
}

function buildRemoteReadResult(): WorkspaceGraphDraftAuthoringReadResult {
  return {
    kind: 'ok',
    capability: {
      scope: WORKSPACE_SCOPE,
      mode: 'writable',
      canRead: true,
      canWrite: true,
      reason: 'authorized',
    },
    auditRef: {
      correlationId: 'corr-remote',
      decisionId: 'dec-remote',
      action: 'draft_read',
      outcome: 'allowed',
      recordedAt: '2026-04-18T00:00:03Z',
    },
    formatMeta: {
      schemaVersion: 'workspace-graph-draft.v1',
      storedSchemaVersion: 'workspace-graph-draft.v1',
      migrationState: 'native',
    },
    record: {
      scope: WORKSPACE_SCOPE,
      schemaVersion: 'workspace-graph-draft.v1',
      revision: 'rev-remote',
      updatedAt: '2026-04-18T00:00:03Z',
      draft: {
        context: {
          ...WORKSPACE_SCOPE,
          executionTarget: 'postgres',
        },
        nodes: [
          {
            id: 'source-node',
            type: 'source',
            payload: {
              kind: 'postgres_table',
              schema: 'raw',
              table: 'orders',
              alias: 'orders',
            },
          },
          {
            id: 'transform-node',
            type: 'sql_transform',
            payload: {
              dialect: 'postgres',
              sqlArtifact: {
                repo: 'dunay2/dvt',
                path: 'models/transform.sql',
                ref: 'refs/heads/main',
                commitSha: 'remote',
                contentSha256: 'b'.repeat(64),
              },
              entrypoint: 'models/transform.sql',
            },
          },
        ],
        edges: [{ fromNodeId: 'source-node', toNodeId: 'transform-node' }],
      },
    },
  };
}

describe('canvasDraftRepository conflict handling', () => {
  it('returns the actual remote projection on conflict instead of the rejected local payload', async () => {
    const authoringPort = buildAuthoringPort({
      saveGraphDraft: vi.fn(
        async (): Promise<WorkspaceGraphDraftAuthoringSaveResult> => buildConflictSaveResult()
      ) as IWorkspaceGraphDraftAuthoringPort['saveGraphDraft'],
      readGraphDraft: vi.fn(
        async (): Promise<WorkspaceGraphDraftAuthoringReadResult> => buildRemoteReadResult()
      ) as IWorkspaceGraphDraftAuthoringPort['readGraphDraft'],
    });
    const repository = createCanvasDraftRepository(buildWorkspacePort(), authoringPort);

    await expect(repository.saveGraphDraft(buildSaveInput())).resolves.toEqual({
      outcome: 'conflict',
      current: {
        revision: 'rev-remote',
        savedAt: '2026-04-18T00:00:03Z',
        draft: {
          nodeIds: ['source-node', 'transform-node'],
          nodePositions: {},
          edges: [{ sourceId: 'source-node', targetId: 'transform-node' }],
        },
      },
    });
  });

  it('fails closed when a conflict cannot reload the actual remote draft', async () => {
    const authoringPort = buildAuthoringPort({
      saveGraphDraft: vi.fn(
        async (): Promise<WorkspaceGraphDraftAuthoringSaveResult> => buildConflictSaveResult()
      ) as IWorkspaceGraphDraftAuthoringPort['saveGraphDraft'],
      readGraphDraft: vi.fn(
        async (): Promise<WorkspaceGraphDraftAuthoringReadResult> => ({ kind: 'not_found' })
      ) as IWorkspaceGraphDraftAuthoringPort['readGraphDraft'],
    });
    const repository = createCanvasDraftRepository(buildWorkspacePort(), authoringPort);

    await expect(repository.saveGraphDraft(buildSaveInput())).rejects.toThrow(CONFLICT_RELOAD_ERROR);
  });

  it('fails closed when conflict recovery throws while reloading the remote draft', async () => {
    const authoringPort = buildAuthoringPort({
      saveGraphDraft: vi.fn(
        async (): Promise<WorkspaceGraphDraftAuthoringSaveResult> => buildConflictSaveResult()
      ) as IWorkspaceGraphDraftAuthoringPort['saveGraphDraft'],
      readGraphDraft: vi.fn(async (): Promise<WorkspaceGraphDraftAuthoringReadResult> => {
        throw new Error('reload failed');
      }) as IWorkspaceGraphDraftAuthoringPort['readGraphDraft'],
    });
    const repository = createCanvasDraftRepository(buildWorkspacePort(), authoringPort);

    await expect(repository.saveGraphDraft(buildSaveInput())).rejects.toThrow(CONFLICT_RELOAD_ERROR);
  });
});
