import {
  WORKSPACE_GRAPH_DRAFT_CAPABILITY_MODE,
  WORKSPACE_GRAPH_DRAFT_CAPABILITY_REASON,
  type WorkspaceGraphAuthoringDraft,
  type WorkspaceGraphAuthoringNode,
} from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import type {
  IWorkspaceFileBatchMutationPort,
  IWorkspaceFileRepository,
  WorkspaceFileBatchMutation,
} from '../../../src/application/ports/workspaceFiles.js';
import type {
  IWorkspaceGraphDraftStore,
  WorkspaceGraphDraftDecisionContext,
} from '../../../src/application/ports/workspaceGraphDraft.js';
import { SaveWorkspaceGraphDraftUseCase } from '../../../src/application/services/saveWorkspaceGraphDraftUseCase.js';
import { EnvironmentId, ProjectId, TenantId } from '../../../src/domain/auth/types.js';
import {
  TEST_WORKSPACE_SCOPE,
  buildWorkspaceGraphDraft,
  buildWorkspaceGraphDraftSaveRequest,
} from '../../fixtures/workspaceGraphDraftFixture.js';

const SOURCE_PATH = 'models/sources/src_raw.yml';
const SOURCE_NAME = 'postgresql_local_dvt_raw';
const SOURCE_YAML = `version: 2

sources:
  - name: ${SOURCE_NAME}
    database: dvt
    schema: raw
    tables:
      - name: orders
`;

describe('SaveWorkspaceGraphDraftUseCase', () => {
  it('hashes semantically identical requests with JCS and declares every Canvas owner', async () => {
    const save = vi.fn(async (_input: Parameters<IWorkspaceGraphDraftStore['save']>[0]) => ({
      kind: 'saved' as const,
      schemaVersion: 'workspace-graph-draft.v1',
      revision: 'revision-1',
      updatedAt: '2026-08-13T10:00:00.000Z',
      deduplicated: false,
    }));
    const store = { read: vi.fn(async () => null), save } as never;
    const useCase = new SaveWorkspaceGraphDraftUseCase(
      store,
      { record: vi.fn(async () => undefined) },
      () => new Date('2026-08-13T10:00:00.000Z'),
      createSourceRemovalDependencies()
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

  it('deletes the generated source YAML before persisting removal of its last node', async () => {
    const previousDraft = buildSourceDraft([buildImportedSourceNode('source-orders', 'orders')]);
    const nextDraft = buildSourceDraft([]);
    const save = vi.fn(async () => ({
      kind: 'saved' as const,
      schemaVersion: 'workspace-graph-draft.v1',
      revision: 'revision-after-removal',
      updatedAt: '2026-08-16T10:00:00.000Z',
      deduplicated: false,
    }));
    const store: Pick<IWorkspaceGraphDraftStore, 'read' | 'save'> = {
      read: vi.fn(async () => ({
        scope: TEST_WORKSPACE_SCOPE,
        schemaVersion: 'workspace-graph-draft.v1',
        revision: 'revision-before-removal',
        draftPayload: previousDraft,
        updatedAt: '2026-08-16T09:59:00.000Z',
      })),
      save,
    };
    const sourceRemoval = createSourceRemovalDependencies();
    const useCase = new SaveWorkspaceGraphDraftUseCase(
      store as IWorkspaceGraphDraftStore,
      { record: vi.fn(async () => undefined) },
      () => new Date('2026-08-16T10:00:00.000Z'),
      sourceRemoval
    );

    const result = await useCase.execute({
      request: buildWorkspaceGraphDraftSaveRequest({
        expectedRevision: 'revision-before-removal',
        idempotencyKey: 'remove-source-orders',
        draft: nextDraft,
      }),
      decision: writableDecision(),
    });

    expect(result.response.kind).toBe('saved');
    expect(sourceRemoval.batchMutation.apply).toHaveBeenCalledWith(
      TEST_WORKSPACE_SCOPE,
      expect.objectContaining({
        idempotencyKey: 'remove-source-orders:source-removal:apply',
        writes: [],
        deletes: [SOURCE_PATH],
      })
    );
    expect(sourceRemoval.batchMutation.apply.mock.invocationCallOrder[0]).toBeLessThan(
      save.mock.invocationCallOrder[0] ?? Number.POSITIVE_INFINITY
    );
  });

  it('restores source YAML when the later graph-draft compare-and-swap fails', async () => {
    const previousDraft = buildSourceDraft([buildImportedSourceNode('source-orders', 'orders')]);
    const store: Pick<IWorkspaceGraphDraftStore, 'read' | 'save'> = {
      read: vi.fn(async () => ({
        scope: TEST_WORKSPACE_SCOPE,
        schemaVersion: 'workspace-graph-draft.v1',
        revision: 'revision-before-removal',
        draftPayload: previousDraft,
        updatedAt: '2026-08-16T09:59:00.000Z',
      })),
      save: vi.fn(async () => ({
        kind: 'conflict' as const,
        currentRevision: 'revision-concurrent',
        storedSchemaVersion: 'workspace-graph-draft.v1',
        updatedAt: '2026-08-16T10:00:01.000Z',
      })),
    };
    const sourceRemoval = createSourceRemovalDependencies();
    const useCase = new SaveWorkspaceGraphDraftUseCase(
      store as IWorkspaceGraphDraftStore,
      { record: vi.fn(async () => undefined) },
      () => new Date('2026-08-16T10:00:00.000Z'),
      sourceRemoval
    );

    const result = await useCase.execute({
      request: buildWorkspaceGraphDraftSaveRequest({
        expectedRevision: 'revision-before-removal',
        idempotencyKey: 'remove-source-conflict',
        draft: buildSourceDraft([]),
      }),
      decision: writableDecision(),
    });

    expect(result.response.kind).toBe('conflict');
    expect(sourceRemoval.batchMutation.apply).toHaveBeenCalledTimes(2);
    expect(sourceRemoval.batchMutation.apply).toHaveBeenLastCalledWith(
      TEST_WORKSPACE_SCOPE,
      expect.objectContaining({
        idempotencyKey: 'remove-source-conflict:source-removal:rollback',
        writes: [{ path: SOURCE_PATH, content: SOURCE_YAML }],
        deletes: [],
      })
    );
  });

  it('returns a save conflict without persisting the draft when source YAML changed concurrently', async () => {
    const previousDraft = buildSourceDraft([buildImportedSourceNode('source-orders', 'orders')]);
    const save = vi.fn();
    const store: Pick<IWorkspaceGraphDraftStore, 'read' | 'save'> = {
      read: vi.fn(async () => ({
        scope: TEST_WORKSPACE_SCOPE,
        schemaVersion: 'workspace-graph-draft.v1',
        revision: 'revision-before-removal',
        draftPayload: previousDraft,
        updatedAt: '2026-08-16T09:59:00.000Z',
      })),
      save,
    };
    const sourceRemoval = createSourceRemovalDependencies({
      kind: 'conflict',
      conflicts: [{ path: SOURCE_PATH, currentContentSha256: 'f'.repeat(64) }],
    });
    const useCase = new SaveWorkspaceGraphDraftUseCase(
      store as IWorkspaceGraphDraftStore,
      { record: vi.fn(async () => undefined) },
      () => new Date('2026-08-16T10:00:00.000Z'),
      sourceRemoval
    );

    const result = await useCase.execute({
      request: buildWorkspaceGraphDraftSaveRequest({
        expectedRevision: 'revision-before-removal',
        idempotencyKey: 'remove-source-file-conflict',
        draft: buildSourceDraft([]),
      }),
      decision: writableDecision(),
    });

    expect(result.response.kind).toBe('conflict');
    expect(save).not.toHaveBeenCalled();
    expect(sourceRemoval.batchMutation.apply).toHaveBeenCalledTimes(1);
  });

  it('does not mutate workspace files when no imported source binding was removed', async () => {
    const sourceDraft = buildSourceDraft([buildImportedSourceNode('source-orders', 'orders')]);
    const store: Pick<IWorkspaceGraphDraftStore, 'read' | 'save'> = {
      read: vi.fn(async () => ({
        scope: TEST_WORKSPACE_SCOPE,
        schemaVersion: 'workspace-graph-draft.v1',
        revision: 'revision-before-edit',
        draftPayload: sourceDraft,
        updatedAt: '2026-08-16T09:59:00.000Z',
      })),
      save: vi.fn(async () => ({
        kind: 'saved' as const,
        schemaVersion: 'workspace-graph-draft.v1',
        revision: 'revision-after-edit',
        updatedAt: '2026-08-16T10:00:00.000Z',
        deduplicated: false,
      })),
    };
    const sourceRemoval = createSourceRemovalDependencies();
    const useCase = new SaveWorkspaceGraphDraftUseCase(
      store as IWorkspaceGraphDraftStore,
      { record: vi.fn(async () => undefined) },
      () => new Date('2026-08-16T10:00:00.000Z'),
      sourceRemoval
    );

    await useCase.execute({
      request: buildWorkspaceGraphDraftSaveRequest({
        expectedRevision: 'revision-before-edit',
        idempotencyKey: 'edit-source-without-removal',
        draft: sourceDraft,
      }),
      decision: writableDecision(),
    });

    expect(sourceRemoval.workspaceFiles.getFileContent).not.toHaveBeenCalled();
    expect(sourceRemoval.batchMutation.apply).not.toHaveBeenCalled();
  });
});

function buildImportedSourceNode(id: string, tableName: string): WorkspaceGraphAuthoringNode {
  return {
    id,
    name: tableName,
    pluginId: 'dvt.warehouse-source',
    kind: 'dvt:source',
    role: 'input',
    status: 'idle',
    tags: ['source', 'raw'],
    path: SOURCE_PATH,
    metadata: {
      connectedSourceRef: {
        schemaVersion: 'connected-source-ref.v1',
        connectionRef: {
          schemaVersion: 'connection-ref.v1',
          connectionId: 'postgresql-local',
          provider: 'postgres',
        },
        sourceObjectId: `relation/dvt/raw/${tableName}`,
      },
      sourceName: SOURCE_NAME,
      tableName,
    },
  };
}

function buildSourceDraft(
  nodes: readonly WorkspaceGraphAuthoringNode[]
): WorkspaceGraphAuthoringDraft {
  return buildWorkspaceGraphDraft({
    canvas: { id: 'canvas-source-removal', kind: 'dbt', title: 'Sources' },
    nodeIds: nodes.map((node) => node.id),
    nodePositions: Object.fromEntries(
      nodes.map((node, index) => [node.id, { x: index * 240, y: 0 }])
    ),
    nodes: [...nodes],
    edges: [],
  });
}

function createSourceRemovalDependencies(
  batchResult?: Awaited<ReturnType<IWorkspaceFileBatchMutationPort['apply']>>
): {
  workspaceFiles: IWorkspaceFileRepository & { getFileContent: ReturnType<typeof vi.fn> };
  batchMutation: IWorkspaceFileBatchMutationPort & { apply: ReturnType<typeof vi.fn> };
} {
  return {
    workspaceFiles: {
      listFiles: vi.fn(async () => []),
      getFileContent: vi.fn(async () => ({
        path: SOURCE_PATH,
        name: 'src_raw.yml',
        language: 'yaml',
        content: SOURCE_YAML,
        contentSha256: 'a'.repeat(64),
        lastModified: '2026-08-16T09:58:00.000Z',
      })),
      saveFileContent: vi.fn(),
      deleteFileContent: vi.fn(),
    },
    batchMutation: {
      apply: vi.fn(async (_scope: unknown, mutation: WorkspaceFileBatchMutation) =>
        batchResult === undefined
          ? {
              kind: 'applied' as const,
              idempotencyKey: mutation.idempotencyKey,
              requestHash: 'b'.repeat(64),
              deduplicated: false,
              writes: mutation.writes.map((write) => ({
                path: write.path,
                contentSha256: 'c'.repeat(64),
              })),
              deletes: mutation.deletes,
            }
          : batchResult
      ),
    },
  };
}

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
