/**
 * Owned concern: adapt pure canvas scenarios to the protected draft HTTP test boundary.
 * @baseline GH-3578: transport does not own scenario construction or workspace scope.
 * @decision Reuse pure builders, the V1 draft protocol and E2eWorkspaceSession.
 * @consequence Read/write assertions retain their existing stateful revision semantics.
 * @version 1.0.0
 */
import {
  WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
  WORKSPACE_GRAPH_DRAFT_INITIAL_REVISION,
} from '@dvt/contracts';

import { buildProtectedDraftRecord } from '../../src/app/services/workspace/workspaceGraphDraftAuthoring.test.fixtures';
import {
  buildDraftReadOkResponse,
  buildDraftSaveSavedResponse,
} from '../../src/app/services/workspace/workspaceGraphDraftProtocol.test.fixtures';
import { normalizeProjectCanvasDraft } from '../../src/app/views/canvas/canvasProjectCanvasLifecycle';

import { buildCanvasAuthoringDraft } from './canvasDrafts/buildCanvasAuthoringDraft';
import type { CanvasAuthoringDraft, CanvasDraftScenarioOptions } from './canvasDrafts/scenario';
import { stubE2eApi } from './e2eApiStub';
import { E2E_WORKSPACE_SESSION, type E2eWorkspaceSession } from './workspaceSession';

export type StubCanvasDraftReadOptions = CanvasDraftScenarioOptions & { readOnly?: boolean };
type CanvasDraftReadResponse = ReturnType<typeof buildDraftReadOkResponse>;
type CanvasDraftSaveRequest = {
  scope: E2eWorkspaceSession;
  schemaVersion: typeof WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION;
  expectedRevision: string;
  idempotencyKey: string;
  draft: CanvasAuthoringDraft;
};

export function buildCanvasDraftReadResponse(
  scope: E2eWorkspaceSession,
  options: StubCanvasDraftReadOptions = {}
): CanvasDraftReadResponse {
  const capability = options.readOnly
    ? {
        scope,
        mode: 'read_only' as const,
        canRead: true,
        canWrite: false,
        reason: 'write_denied' as const,
      }
    : undefined;

  return buildDraftReadOkResponse(scope, {
    ...(capability ? { capability } : {}),
    record: buildProtectedDraftRecord(scope, {
      revision: 'rev-e2e-graph-ready',
      scope,
      draft: buildCanvasAuthoringDraft(options),
    }),
  });
}

export function buildCanvasDraftSaveRequest(
  scope: E2eWorkspaceSession,
  args: StubCanvasDraftReadOptions & {
    expectedRevision?: string;
    idempotencyKey?: string;
  } = {}
): CanvasDraftSaveRequest {
  return {
    scope,
    schemaVersion: WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
    expectedRevision: args.expectedRevision ?? WORKSPACE_GRAPH_DRAFT_INITIAL_REVISION,
    idempotencyKey: args.idempotencyKey ?? 'canvas-draft-authoring-seed',
    draft: normalizeProjectCanvasDraft(buildCanvasAuthoringDraft(args)),
  };
}

export function stubCanvasDraftRead(
  options: StubCanvasDraftReadOptions = {},
  scope: E2eWorkspaceSession = E2E_WORKSPACE_SESSION
): void {
  const responseBody = buildCanvasDraftReadResponse(scope, options);

  stubE2eApi('GET', '/workspace/graph/draft', ({ url }) => {
    expect(Object.fromEntries(url.searchParams.entries())).to.deep.include({
      tenantId: scope.tenantId,
      projectId: scope.projectId,
      environmentId: scope.environmentId,
    });

    return {
      statusCode: 200,
      body: responseBody,
    };
  });
}

export function stubCanvasDraftSave(scope: E2eWorkspaceSession = E2E_WORKSPACE_SESSION): void {
  stubE2eApi('PUT', '/workspace/graph/draft', ({ body }) => {
    expect(body).to.deep.include({
      schemaVersion: WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
      expectedRevision: 'rev-e2e-graph-ready',
    });
    expect((body as CanvasDraftSaveRequest).scope).to.deep.equal(scope);

    return {
      body: buildDraftSaveSavedResponse(scope, {
        revision: 'rev-e2e-graph-ready-2',
      }),
    };
  });
}

export function stubFailingCanvasDraftSave(
  scope: E2eWorkspaceSession = E2E_WORKSPACE_SESSION
): void {
  stubE2eApi('PUT', '/workspace/graph/draft', ({ body }) => {
    expect(body).to.deep.include({
      schemaVersion: WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
      expectedRevision: 'rev-e2e-graph-ready',
    });
    expect((body as CanvasDraftSaveRequest).scope).to.deep.equal(scope);

    return {
      statusCode: 500,
      body: {
        error: {
          type: 'internal_error',
          reason: 'draft_save_failed',
          message: 'Draft save failed in e2e fixture.',
        },
      },
    };
  });
}

export function stubStatefulCanvasDraftAuthoring(
  options: StubCanvasDraftReadOptions = {},
  scope: E2eWorkspaceSession = E2E_WORKSPACE_SESSION
): CanvasAuthoringDraft {
  let revision = 'rev-e2e-graph-ready';
  let savedRevision = 0;
  let draft = buildCanvasAuthoringDraft(options);

  stubE2eApi('GET', '/workspace/graph/draft', ({ url }) => {
    expect(Object.fromEntries(url.searchParams.entries())).to.deep.include({
      tenantId: scope.tenantId,
      projectId: scope.projectId,
      environmentId: scope.environmentId,
    });

    return {
      statusCode: 200,
      body: buildDraftReadOkResponse(scope, {
        record: buildProtectedDraftRecord(scope, {
          revision,
          scope,
          draft,
        }),
      }),
    };
  });

  stubE2eApi('PUT', '/workspace/graph/draft', ({ body }) => {
    const saveRequest = body as CanvasDraftSaveRequest;
    expect(saveRequest).to.deep.include({
      schemaVersion: WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
      expectedRevision: revision,
    });
    expect(saveRequest.scope).to.deep.equal(scope);

    draft = saveRequest.draft;
    revision = `rev-e2e-graph-ready-${++savedRevision}`;

    return {
      body: buildDraftSaveSavedResponse(scope, {
        revision,
      }),
    };
  });

  return draft;
}
