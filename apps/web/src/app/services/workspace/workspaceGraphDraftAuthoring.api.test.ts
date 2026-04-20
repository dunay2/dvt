import { describe, expect, it } from 'vitest';

import { createApiWorkspaceGraphDraftAuthoringPort } from './workspaceGraphDraftAuthoring.api';
import {
  buildDraftReadDeniedResponse,
  buildDraftReadOkResponse,
  buildDraftSaveConflictResponse,
  buildDraftSaveDeniedResponse,
  buildDraftSaveSavedResponse,
  buildProtectedDraftRecord,
  buildWorkspaceGraphDraftEndpoint,
} from './workspaceGraphDraft.test.fixtures';
import {
  createApiClientHarness,
  httpErrorResponse,
  jsonResponse,
} from './workspaceApiClient.test.harness';
import {
  buildWorkspaceScope,
  installWorkspaceScopeHarness,
  setWorkspaceScope,
  type WorkspaceScope,
} from './workspaceScope.test.harness';

installWorkspaceScopeHarness();

function createAuthoringPortHarness(
  options: Parameters<typeof createApiClientHarness>[0] = {}
): {
  requestRaw: NonNullable<Parameters<typeof createApiClientHarness>[0]>['requestRaw'];
  port: ReturnType<typeof createApiWorkspaceGraphDraftAuthoringPort>;
} {
  const { apiClient, requestRaw } = createApiClientHarness(options);

  return {
    requestRaw,
    port: createApiWorkspaceGraphDraftAuthoringPort(apiClient),
  };
}

function buildAuthoringSaveInput(
  scope: WorkspaceScope,
  overrides: Partial<{
    expectedRevision: string | null;
    idempotencyKey: string;
  }> = {}
): {
  expectedRevision: string | null;
  idempotencyKey: string;
  draft: ReturnType<typeof buildProtectedDraftRecord>['draft'];
} {
  return {
    expectedRevision: 'rev-1',
    idempotencyKey: 'idem-authoring-default',
    draft: buildProtectedDraftRecord(scope).draft,
    ...overrides,
  };
}

async function expectPreservedSaveEnvelope(args: {
  scope: WorkspaceScope;
  requestRaw: NonNullable<Parameters<typeof createApiClientHarness>[0]>['requestRaw'];
  expectedResponse:
    | ReturnType<typeof buildDraftSaveConflictResponse>
    | ReturnType<typeof buildDraftSaveDeniedResponse>;
  inputOverrides: Partial<{
    expectedRevision: string | null;
    idempotencyKey: string;
  }>;
}): Promise<void> {
  setWorkspaceScope(args.scope);
  const { port } = createAuthoringPortHarness({
    requestRaw: args.requestRaw,
  });

  await expect(
    port.saveGraphDraft(buildAuthoringSaveInput(args.scope, args.inputOverrides))
  ).resolves.toEqual(args.expectedResponse);
}

async function expectSpecialSaveOutcome(args: {
  scope: WorkspaceScope;
  requestRaw: NonNullable<Parameters<typeof createApiClientHarness>[0]>['requestRaw'];
  expectedOutcome:
    | {
        kind: 'unsupported_schema_version';
        expectedSchemaVersion: string;
      }
    | {
        kind: 'idempotency_mismatch';
      };
  idempotencyKey: string;
}): Promise<void> {
  setWorkspaceScope(args.scope);
  const { port } = createAuthoringPortHarness({
    requestRaw: args.requestRaw,
  });

  await expect(
    port.saveGraphDraft(
      buildAuthoringSaveInput(args.scope, {
        idempotencyKey: args.idempotencyKey,
      })
    )
  ).resolves.toEqual(args.expectedOutcome);
}

describe('workspaceGraphDraftAuthoring api port', () => {
  it('preserves canonical read envelopes for successful reads', async () => {
    const scope = buildWorkspaceScope();
    setWorkspaceScope(scope);
    const responseBody = buildDraftReadOkResponse(scope, {
      record: buildProtectedDraftRecord(scope, { revision: 'rev-authoring-1' }),
    });
    const { requestRaw, port } = createAuthoringPortHarness({
      requestRaw: async () => jsonResponse(responseBody),
    });

    await expect(port.readGraphDraft()).resolves.toEqual(responseBody);
    expect(requestRaw).toHaveBeenCalledWith(buildWorkspaceGraphDraftEndpoint(scope), {
      method: 'GET',
    });
  });

  it('preserves denied read posture instead of collapsing it into a generic error', async () => {
    const scope = buildWorkspaceScope();
    setWorkspaceScope(scope);
    const responseBody = buildDraftReadDeniedResponse(scope);
    const { port } = createAuthoringPortHarness({
      requestRaw: async () => jsonResponse(responseBody, 403),
    });

    await expect(port.readGraphDraft()).resolves.toEqual(responseBody);
  });

  it('maps governed 404 not-found into an explicit authoring outcome', async () => {
    const scope = buildWorkspaceScope();
    setWorkspaceScope(scope);
    const { port } = createAuthoringPortHarness({
      requestRaw: async () =>
        httpErrorResponse({
          type: 'not_found',
          reason: 'workspace_graph_draft_not_found',
          status: 404,
          details: {
            correlationId: 'corr-404',
            decisionId: 'dec-404',
          },
        }),
    });

    await expect(port.readGraphDraft()).resolves.toEqual({ kind: 'not_found' });
  });

  it('sends canonical save requests with structural design-graph payloads', async () => {
    const scope = buildWorkspaceScope();
    setWorkspaceScope(scope);
    const { requestRaw, port } = createAuthoringPortHarness({
      requestRaw: async () => jsonResponse(buildDraftSaveSavedResponse(scope)),
    });
    const input = buildAuthoringSaveInput(scope, {
      expectedRevision: null,
      idempotencyKey: 'idem-authoring-1',
    });

    await expect(port.saveGraphDraft(input)).resolves.toEqual(buildDraftSaveSavedResponse(scope));
    expect(requestRaw).toHaveBeenCalledWith('/workspace/graph/draft', {
      method: 'PUT',
      jsonBody: {
        scope,
        schemaVersion: 'workspace-graph-draft.v1',
        expectedRevision: 'initial',
        idempotencyKey: 'idem-authoring-1',
        draft: input.draft,
      },
    });
  });

  it('preserves conflict save envelopes from the protected boundary', async () => {
    const scope = buildWorkspaceScope();
    const responseBody = buildDraftSaveConflictResponse(scope);
    await expectPreservedSaveEnvelope({
      scope,
      requestRaw: async () => jsonResponse(responseBody, 409),
      expectedResponse: responseBody,
      inputOverrides: {
        expectedRevision: 'rev-stale',
        idempotencyKey: 'idem-authoring-2',
      },
    });
  });

  it('preserves denied write posture instead of collapsing it into a generic error', async () => {
    const scope = buildWorkspaceScope();
    const responseBody = buildDraftSaveDeniedResponse(scope);
    await expectPreservedSaveEnvelope({
      scope,
      requestRaw: async () => jsonResponse(responseBody, 403),
      expectedResponse: responseBody,
      inputOverrides: {
        idempotencyKey: 'idem-authoring-3',
      },
    });
  });

  it('maps unsupported schema failures into an explicit port outcome', async () => {
    const scope = buildWorkspaceScope();
    await expectSpecialSaveOutcome({
      scope,
      idempotencyKey: 'idem-authoring-4',
      requestRaw: async () =>
        httpErrorResponse({
          type: 'unprocessable',
          reason: 'workspace_graph_draft_unsupported_schema_version',
          status: 422,
          details: {
            expectedSchemaVersion: 'workspace-graph-draft.v1',
          },
        }),
      expectedOutcome: {
        kind: 'unsupported_schema_version',
        expectedSchemaVersion: 'workspace-graph-draft.v1',
      },
    });
  });

  it('maps idempotency mismatches into an explicit port outcome', async () => {
    const scope = buildWorkspaceScope();
    await expectSpecialSaveOutcome({
      scope,
      idempotencyKey: 'idem-authoring-5',
      requestRaw: async () =>
        httpErrorResponse({
          type: 'conflict',
          reason: 'workspace_graph_draft_idempotency_key_reused',
          status: 409,
        }),
      expectedOutcome: {
        kind: 'idempotency_mismatch',
      },
    });
  });
});
