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

type CanvasDraftRepository = ReturnType<typeof createCanvasDraftRepository>;
type ProjectedReadRecord = Exclude<
  Awaited<ReturnType<CanvasDraftRepository['readGraphDraft']>>,
  null
>;
type ProjectedReadState = Awaited<ReturnType<CanvasDraftRepository['readGraphDraftState']>>;

function buildExpectedProjectedReadRecord(): ProjectedReadRecord {
  return {
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
  };
}

function buildExpectedProjectedSemanticGraph(): NonNullable<ProjectedReadState['semanticGraph']> {
  return {
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
        id: 'sink-node',
        name: 'orders_dashboard',
        pluginId: 'dvt',
        kind: 'dvt:sink',
        role: 'output',
        status: 'idle',
        tags: [],
        metadata: {
          config: {
            schema: 'analytics',
            table: 'orders_dashboard',
            materialization: 'table',
            writeMode: 'replace',
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
      {
        id: 'draft_edge_transform-node_sink-node',
        sourceId: 'transform-node',
        targetId: 'sink-node',
        relation: 'lineage',
      },
    ],
  };
}

function buildExpectedProjectedReadState(): ProjectedReadState {
  return {
    accessMode: 'writable' as const,
    capabilityReason: 'authorized' as const,
    formatError: null,
    formatMeta: {
      schemaVersion: 'workspace-graph-draft.v1',
      storedSchemaVersion: 'workspace-graph-draft.v1',
      migrationState: 'native',
    },
    record: buildExpectedProjectedReadRecord(),
    semanticGraph: buildExpectedProjectedSemanticGraph(),
  };
}

function createRepositoryWithSaveResult(
  saveGraphDraftResult: WorkspaceGraphDraftAuthoringSaveResult
): CanvasDraftRepository {
  const authoringPort = buildAuthoringPort({
    saveGraphDraft: vi.fn(
      async (): Promise<WorkspaceGraphDraftAuthoringSaveResult> => saveGraphDraftResult
    ) as IWorkspaceGraphDraftAuthoringPort['saveGraphDraft'],
  });

  return createCanvasDraftRepository(buildWorkspacePort(), authoringPort);
}

async function expectSaveGraphDraftToFailClosed(
  saveGraphDraftResult: WorkspaceGraphDraftAuthoringSaveResult,
  message: string
): Promise<void> {
  const repository = createRepositoryWithSaveResult(saveGraphDraftResult);

  await expect(repository.saveGraphDraft(buildSaveInput())).rejects.toThrow(message);
}

describe('canvasDraftRepository read/write', () => {
  it('projects protected draft reads into the route-facing record model', async () => {
    const repository = createCanvasDraftRepository(buildWorkspacePort(), buildAuthoringPort());

    await expect(repository.readGraphDraftState()).resolves.toEqual(
      buildExpectedProjectedReadState()
    );
    await expect(repository.readGraphDraft()).resolves.toEqual(buildExpectedProjectedReadRecord());
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
      remoteDraftState: {
        accessMode: 'writable',
        capabilityReason: 'authorized',
        formatError: null,
        formatMeta: null,
        record: {
          revision: 'rev-2',
          savedAt: expect.any(String),
          draft: PROJECTED_DRAFT,
        },
        semanticGraph: {
          canonicalNodes: buildSaveInput().draft.canonicalNodes,
          canonicalEdges: buildSaveInput().draft.canonicalEdges,
        },
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
    await expectSaveGraphDraftToFailClosed(
      buildDeniedSaveResult(),
      'Workspace graph draft authoring is not writable for the current scope.'
    );
  });

  it('fails closed when authoring rejects the schema version', async () => {
    await expectSaveGraphDraftToFailClosed(
      {
        kind: 'unsupported_schema_version',
        expectedSchemaVersion: 'workspace-graph-draft.v2',
      },
      'Workspace graph draft authoring rejected schema version; expected workspace-graph-draft.v2.'
    );
  });

  it('fails closed when authoring rejects the idempotency key for a different payload', async () => {
    await expectSaveGraphDraftToFailClosed(
      {
        kind: 'idempotency_mismatch',
      },
      'Workspace graph draft authoring rejected the idempotency key for a different payload.'
    );
  });
});
