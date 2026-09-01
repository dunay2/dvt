import { describe, expect, it, vi } from 'vitest';

import type {
  IWorkspaceGraphDraftAuthoringPort,
  WorkspaceGraphDraftAuthoringSaveResult,
} from '../../ports/workspaceGraphDraftAuthoring';
import { projectWorkspaceGraphAuthoringDraftSemanticGraph } from '../../services/workspace/workspaceGraphDraftProjection';
import {
  buildDraftReadNotFoundResponse,
  buildDraftSaveIdempotencyMismatchResponse,
  buildDraftSaveUnsupportedSchemaResponse,
} from '../../services/workspace/workspaceGraphDraftProtocol.test.fixtures';
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
        savedAt: '2026-04-18T00:00:01Z',
        draft: buildAuthoringDraft(),
      },
      remoteDraftState: {
        accessMode: 'writable',
        authoringAuthority: {
          kind: 'resolved',
          binding: {
            schemaVersion: 'canvas-authoring-authority-binding.v1',
            canvasId: 'main-canvas',
            authority: { kind: 'graph-draft' },
          },
        },
        capabilityReason: 'authorized',
        formatError: null,
        formatMeta: {
          schemaVersion: 'workspace-graph-draft.v1',
          storedSchemaVersion: 'workspace-graph-draft.v1',
        },
        record: {
          revision: 'rev-2',
          savedAt: '2026-04-18T00:00:01Z',
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
            expect.objectContaining({ id: 'transform-node', kind: 'transform' }),
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

  it('preserves a first typed canvas draft when the saved draft has no nodes yet', async () => {
    const authoringPort = buildAuthoringPort();
    const repository = createCanvasDraftRepository(authoringPort);
    const firstCanvasDraft = {
      canvas: {
        id: 'transformation-canvas',
        kind: 'transformation',
        title: 'Transformation canvas',
      },
      activeCanvasId: 'transformation-canvas',
      nodeIds: [],
      nodePositions: {},
      nodes: [],
      edges: [],
    };

    await expect(
      repository.saveGraphDraft({
        expectedRevision: null,
        idempotencyKey: 'idem-first-canvas',
        draft: firstCanvasDraft,
      })
    ).resolves.toEqual({
      outcome: 'saved',
      record: {
        revision: 'rev-2',
        savedAt: '2026-04-18T00:00:01Z',
        draft: firstCanvasDraft,
      },
      remoteDraftState: {
        accessMode: 'writable',
        authoringAuthority: {
          kind: 'resolved',
          binding: {
            schemaVersion: 'canvas-authoring-authority-binding.v1',
            canvasId: 'transformation-canvas',
            authority: { kind: 'graph-draft' },
          },
        },
        capabilityReason: 'authorized',
        formatError: null,
        formatMeta: {
          schemaVersion: 'workspace-graph-draft.v1',
          storedSchemaVersion: 'workspace-graph-draft.v1',
        },
        record: {
          revision: 'rev-2',
          savedAt: '2026-04-18T00:00:01Z',
          draft: firstCanvasDraft,
        },
        semanticGraph: {
          canonicalNodes: [],
          canonicalEdges: [],
        },
      },
    });
  });

  it('fails closed when authoring denies writes for the current scope', async () => {
    await expectSaveGraphDraftToFailClosed(
      buildDeniedSaveResult(),
      'Workspace graph draft authoring is not writable for the current scope.'
    );
  });

  it('fails closed when authoring rejects the schema version', async () => {
    await expectSaveGraphDraftToFailClosed(
      buildDraftSaveUnsupportedSchemaResponse(WORKSPACE_SCOPE),
      'Workspace graph draft authoring rejected schema version; expected workspace-graph-draft.v1.'
    );
  });

  it('fails closed when authoring rejects the idempotency key for a different payload', async () => {
    await expectSaveGraphDraftToFailClosed(
      buildDraftSaveIdempotencyMismatchResponse(WORKSPACE_SCOPE),
      'Workspace graph draft authoring rejected the idempotency key for a different payload.'
    );
  });

  it('fails closed when the canonical reload does not confirm the saved revision', async () => {
    const authoringPort = buildAuthoringPort({
      readGraphDraft: vi.fn(async () => buildDraftReadNotFoundResponse(WORKSPACE_SCOPE)),
    });
    const repository = createCanvasDraftRepository(authoringPort);

    await expect(repository.saveGraphDraft(buildSaveInput())).rejects.toThrow(
      'Workspace graph draft save could not confirm the canonical remote revision.'
    );
  });
});
