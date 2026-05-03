import { describe, expect, it, vi } from 'vitest';

import type {
  IWorkspaceGraphDraftAuthoringPort,
  WorkspaceGraphDraftAuthoringSaveResult,
} from '../../ports/workspaceGraphDraftAuthoring';
import { projectWorkspaceGraphAuthoringDraftSemanticGraph } from '../../services/workspace/workspaceGraphDraftProjection';
import { createCanvasDraftRepository } from './canvasDraftRepository';
import {
  buildAuthoringDraft,
  buildAuthoringPort,
  buildSaveInput,
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
type AuthoringReadRecord = Exclude<
  Awaited<ReturnType<CanvasDraftRepository['readGraphDraft']>>,
  null
>;
type AuthoringReadState = Awaited<ReturnType<CanvasDraftRepository['readGraphDraftState']>>;

function buildExpectedAuthoringReadRecord(): AuthoringReadRecord {
  return {
    revision: 'rev-1',
    savedAt: '2026-04-18T00:00:00Z',
    draft: buildAuthoringDraft(),
  };
}

function buildExpectedAuthoringSemanticGraph(): NonNullable<AuthoringReadState['semanticGraph']> {
  return projectWorkspaceGraphAuthoringDraftSemanticGraph(buildAuthoringDraft());
}

function buildExpectedAuthoringReadState(): AuthoringReadState {
  return {
    accessMode: 'writable' as const,
    capabilityReason: 'authorized' as const,
    formatError: null,
    formatMeta: {
      schemaVersion: 'workspace-graph-draft.v1',
      storedSchemaVersion: 'workspace-graph-draft.v1',
      migrationState: 'native',
    },
    record: buildExpectedAuthoringReadRecord(),
    semanticGraph: buildExpectedAuthoringSemanticGraph(),
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

  return createCanvasDraftRepository(authoringPort);
}

async function expectSaveGraphDraftToFailClosed(
  saveGraphDraftResult: WorkspaceGraphDraftAuthoringSaveResult,
  message: string
): Promise<void> {
  const repository = createRepositoryWithSaveResult(saveGraphDraftResult);

  await expect(repository.saveGraphDraft(buildSaveInput())).rejects.toThrow(message);
}

describe('canvasDraftRepository read/write', () => {
  it('projects protected draft reads into the Canvas authoring record model', async () => {
    const repository = createCanvasDraftRepository(buildAuthoringPort());

    await expect(repository.readGraphDraftState()).resolves.toEqual(
      buildExpectedAuthoringReadState()
    );
    await expect(repository.readGraphDraft()).resolves.toEqual(buildExpectedAuthoringReadRecord());
  });

  it('builds typed authoring saves and preserves the authoring draft locally on success', async () => {
    const authoringPort = buildAuthoringPort();
    const repository = createCanvasDraftRepository(authoringPort);

    await expect(repository.saveGraphDraft(buildSaveInput())).resolves.toEqual({
      outcome: 'saved',
      record: {
        revision: 'rev-2',
        savedAt: expect.any(String),
        draft: buildAuthoringDraft(),
      },
      remoteDraftState: {
        accessMode: 'writable',
        capabilityReason: 'authorized',
        formatError: null,
        formatMeta: null,
        record: {
          revision: 'rev-2',
          savedAt: expect.any(String),
          draft: buildAuthoringDraft(),
        },
        semanticGraph: projectWorkspaceGraphAuthoringDraftSemanticGraph(buildAuthoringDraft()),
      },
    });

    expect(authoringPort.saveGraphDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedRevision: 'rev-1',
        idempotencyKey: 'idem-1',
        draft: expect.objectContaining({
          nodeIds: ['source-node', 'transform-node', 'sink-node'],
          nodePositions: buildAuthoringDraft().nodePositions,
          nodes: expect.arrayContaining([
            expect.objectContaining({ id: 'source-node', kind: 'source' }),
            expect.objectContaining({ id: 'transform-node', kind: 'sql_transform' }),
            expect.objectContaining({ id: 'sink-node', kind: 'sink' }),
          ]),
          edges: [
            {
              id: 'edge-1',
              sourceId: 'source-node',
              targetId: 'transform-node',
              relation: 'lineage',
            },
            {
              id: 'edge-2',
              sourceId: 'transform-node',
              targetId: 'sink-node',
              relation: 'lineage',
            },
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
