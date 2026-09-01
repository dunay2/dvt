import { describe, expect, it, vi } from 'vitest';

import type { WorkspaceGraphAuthoringDraft } from '@dvt/contracts';
import type {
  IWorkspaceGraphDraftAuthoringPort,
  WorkspaceGraphDraftAuthoringReadResult,
  WorkspaceGraphDraftAuthoringSaveResult,
} from '../../ports/workspaceGraphDraftAuthoring';
import { createCanvasDraftRepository } from './canvasDraftRepository';
import { buildDraftReadNotFoundResponse } from '../../services/workspace/workspaceGraphDraftProtocol.test.fixtures';
import {
  buildAuthoringPort,
  buildSaveInput,
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
    },
    currentRevision: 'rev-remote',
  };
}

function buildRemoteAuthoringDraft(): WorkspaceGraphAuthoringDraft {
  return {
    canvas: {
      id: 'main-canvas',
      kind: 'transformation',
      title: 'Main canvas',
    },
    nodeIds: ['source-node', 'transform-node'],
    nodePositions: {
      'source-node': { x: 0, y: 0 },
      'transform-node': { x: 220, y: 0 },
    },
    nodes: [
      {
        id: 'source-node',
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
        id: 'transform-node',
        name: 'transform',
        pluginId: 'dvt',
        kind: 'transform',
        role: 'transform',
        status: 'idle',
        tags: [],
        path: 'models/transform.sql',
        metadata: {
          config: {
            dialect: 'postgres',
          },
          sqlArtifact: {
            repo: 'dunay2/dvt',
            path: 'models/transform.sql',
            ref: 'refs/heads/main',
            commitSha: 'remote',
            contentSha256: 'b'.repeat(64),
          },
        },
      },
    ],
    edges: [
      {
        id: 'draft_edge_source-node_transform-node',
        sourceId: 'source-node',
        targetId: 'transform-node',
        relation: 'lineage',
      },
    ],
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
    },
    authoringAuthority: {
      kind: 'resolved',
      binding: {
        schemaVersion: 'canvas-authoring-authority-binding.v1',
        canvasId: 'main-canvas',
        authority: { kind: 'graph-draft' },
      },
    },
    record: {
      scope: WORKSPACE_SCOPE,
      schemaVersion: 'workspace-graph-draft.v1',
      revision: 'rev-remote',
      updatedAt: '2026-04-18T00:00:03Z',
      draft: buildRemoteAuthoringDraft(),
    },
  };
}

type CanvasDraftRepository = ReturnType<typeof createCanvasDraftRepository>;
type SaveGraphDraftResult = Awaited<ReturnType<CanvasDraftRepository['saveGraphDraft']>>;
type ConflictSaveGraphDraftResult = Extract<SaveGraphDraftResult, { outcome: 'conflict' }>;

function buildExpectedConflictCurrentRecord(): ConflictSaveGraphDraftResult['current'] {
  return {
    revision: 'rev-remote',
    savedAt: '2026-04-18T00:00:03Z',
    draft: buildRemoteAuthoringDraft(),
  };
}

function buildExpectedConflictRemoteDraftState(): ConflictSaveGraphDraftResult['remoteDraftState'] {
  return {
    accessMode: 'writable' as const,
    authoringAuthority: {
      kind: 'resolved',
      binding: {
        schemaVersion: 'canvas-authoring-authority-binding.v1',
        canvasId: 'main-canvas',
        authority: { kind: 'graph-draft' },
      },
    },
    capabilityReason: 'authorized' as const,
    formatError: null,
    formatMeta: {
      schemaVersion: 'workspace-graph-draft.v1',
      storedSchemaVersion: 'workspace-graph-draft.v1',
    },
    record: buildExpectedConflictCurrentRecord(),
    semanticGraph: {
      canonicalNodes: [
        {
          id: 'source-node',
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
          id: 'transform-node',
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
              repo: 'dunay2/dvt',
              path: 'models/transform.sql',
              ref: 'refs/heads/main',
              commitSha: 'remote',
              contentSha256: 'b'.repeat(64),
            },
          },
        },
      ],
      canonicalEdges: [
        {
          id: 'draft_edge_source-node_transform-node',
          sourceId: 'source-node',
          targetId: 'transform-node',
          relation: 'lineage',
        },
      ],
    },
  };
}

describe('canvasDraftRepository conflict handling', () => {
  it('returns the actual remote projection on conflict instead of the rejected local payload', async () => {
    const authoringPort = buildAuthoringPort({
      saveGraphDraft: vi.fn(async (): Promise<WorkspaceGraphDraftAuthoringSaveResult> =>
        buildConflictSaveResult()
      ) as IWorkspaceGraphDraftAuthoringPort['saveGraphDraft'],
      readGraphDraft: vi.fn(async (): Promise<WorkspaceGraphDraftAuthoringReadResult> =>
        buildRemoteReadResult()
      ) as IWorkspaceGraphDraftAuthoringPort['readGraphDraft'],
    });
    const repository = createCanvasDraftRepository(authoringPort);

    await expect(repository.saveGraphDraft(buildSaveInput())).resolves.toEqual({
      outcome: 'conflict',
      current: buildExpectedConflictCurrentRecord(),
      remoteDraftState: buildExpectedConflictRemoteDraftState(),
    });
  });

  it('fails closed when a conflict cannot reload the actual remote draft', async () => {
    const authoringPort = buildAuthoringPort({
      saveGraphDraft: vi.fn(async (): Promise<WorkspaceGraphDraftAuthoringSaveResult> =>
        buildConflictSaveResult()
      ) as IWorkspaceGraphDraftAuthoringPort['saveGraphDraft'],
      readGraphDraft: vi.fn(async (): Promise<WorkspaceGraphDraftAuthoringReadResult> =>
        buildDraftReadNotFoundResponse(WORKSPACE_SCOPE)
      ) as IWorkspaceGraphDraftAuthoringPort['readGraphDraft'],
    });
    const repository = createCanvasDraftRepository(authoringPort);

    await expect(repository.saveGraphDraft(buildSaveInput())).rejects.toThrow(
      CONFLICT_RELOAD_ERROR
    );
  });

  it('fails closed when conflict recovery throws while reloading the remote draft', async () => {
    const authoringPort = buildAuthoringPort({
      saveGraphDraft: vi.fn(async (): Promise<WorkspaceGraphDraftAuthoringSaveResult> =>
        buildConflictSaveResult()
      ) as IWorkspaceGraphDraftAuthoringPort['saveGraphDraft'],
      readGraphDraft: vi.fn(async (): Promise<WorkspaceGraphDraftAuthoringReadResult> => {
        throw new Error('reload failed');
      }) as IWorkspaceGraphDraftAuthoringPort['readGraphDraft'],
    });
    const repository = createCanvasDraftRepository(authoringPort);

    await expect(repository.saveGraphDraft(buildSaveInput())).rejects.toThrow(
      CONFLICT_RELOAD_ERROR
    );
  });
});
