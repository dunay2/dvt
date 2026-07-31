import { describe, expect, it, vi } from 'vitest';

import type {
  IWorkspaceGraphDraftAuditPort,
  IWorkspaceGraphDraftStore,
  WorkspaceGraphDraftDecisionContext,
} from '../../../src/application/ports/workspaceGraphDraft.js';
import { GetWorkspaceGraphDraftUseCase } from '../../../src/application/services/getWorkspaceGraphDraftUseCase.js';
import {
  buildWorkspaceGraphDraft,
  TEST_WORKSPACE_SCOPE,
} from '../../fixtures/workspaceGraphDraftFixture.js';

const DECISION = {
  authentication: 'authenticated',
  requestId: 'request-authority',
  correlationId: 'correlation-authority',
  decisionId: 'decision-authority',
  recordedAt: '2026-07-31T00:00:00.000Z',
  requestedScope: TEST_WORKSPACE_SCOPE,
  scope: TEST_WORKSPACE_SCOPE,
  capability: {
    scope: TEST_WORKSPACE_SCOPE,
    mode: 'writable',
    canRead: true,
    canWrite: true,
    reason: 'authorized',
  },
} as const satisfies WorkspaceGraphDraftDecisionContext;

function buildUseCase(canvasId: string | null): GetWorkspaceGraphDraftUseCase {
  const store = {
    read: vi.fn(async () => ({
      scope: TEST_WORKSPACE_SCOPE,
      schemaVersion: 'workspace-graph-draft.v1',
      revision: 'revision-authority',
      draftPayload: buildWorkspaceGraphDraft({
        canvas: {
          ...(canvasId === null ? {} : { id: canvasId }),
          kind: 'transformation',
          title: 'Main canvas',
        },
      }),
      updatedAt: '2026-07-31T00:00:00.000Z',
    })),
  } as unknown as IWorkspaceGraphDraftStore;
  const audit = {
    record: vi.fn(async () => undefined),
  } satisfies IWorkspaceGraphDraftAuditPort;

  return new GetWorkspaceGraphDraftUseCase(store, audit);
}

describe('GetWorkspaceGraphDraftUseCase authoring authority', () => {
  it('returns the active graph-draft authority when the Canvas identity is explicit', async () => {
    const result = await buildUseCase('main-canvas').execute(DECISION);

    expect(result).toMatchObject({
      kind: 'response',
      httpStatus: 200,
      response: {
        kind: 'ok',
        authoringAuthority: {
          kind: 'resolved',
          binding: {
            canvasId: 'main-canvas',
            authority: { kind: 'graph-draft' },
          },
        },
      },
    });
  });

  it('returns missing authority instead of inferring a Canvas identity', async () => {
    const result = await buildUseCase(null).execute(DECISION);

    expect(result).toMatchObject({
      kind: 'response',
      httpStatus: 200,
      response: {
        kind: 'ok',
        authoringAuthority: {
          kind: 'unresolved',
          reason: 'missing_authority',
          canvasId: null,
        },
      },
    });
  });
});
