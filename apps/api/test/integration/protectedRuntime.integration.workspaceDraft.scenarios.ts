/**
 * @file apps/api/test/integration/protectedRuntime.integration.workspaceDraft.scenarios.ts
 * @baseline ADR-0004: Event Sourcing Strategy
 * @decision Keep workspace-graph-draft integration flows separate from runtime/admin scenarios
 * @date 2026-04-18
 */
import { buildWorkspaceGraphDraftSaveRequest } from '../fixtures/workspaceGraphDraftFixture.js';

import type { ProtectedRuntimeHarness } from './protectedRuntime.integration.harness.js';
import { ENVIRONMENT_ID, PROJECT_ID, TENANT_ID } from './protectedRuntime.integration.shared.js';

type WorkspaceGraphDraftSaveRequest = ReturnType<typeof buildWorkspaceGraphDraftSaveRequest>;

export async function exerciseWorkspaceGraphDraftFlow(
  runtime: ProtectedRuntimeHarness,
  saveRequest: WorkspaceGraphDraftSaveRequest
): Promise<{
  readonly firstSave: { statusCode: number; json(): unknown };
  readonly retrySave: { statusCode: number; json(): unknown };
  readonly readResponse: { statusCode: number; json(): unknown };
  readonly staleSave: { statusCode: number; json(): unknown };
  readonly firstRevision: string;
}> {
  const token = await runtime.issuePrincipalToken();
  const firstSave = await saveWorkspaceGraphDraft(runtime, token, saveRequest);
  const firstRevision = readWorkspaceGraphDraftRevision(firstSave.json());
  const retrySave = await saveWorkspaceGraphDraft(runtime, token, saveRequest);
  const readResponse = await readWorkspaceGraphDraft(runtime, token);
  const staleSave = await saveWorkspaceGraphDraft(runtime, token, {
    ...saveRequest,
    idempotencyKey: 'draft-save-it-2',
  });

  return {
    firstSave,
    retrySave,
    readResponse,
    staleSave,
    firstRevision,
  };
}

export async function expectReadOnlyWorkspaceDraftDenied(
  runtime: ProtectedRuntimeHarness,
  input?: {
    expectedRevision?: string;
    idempotencyKey?: string;
  }
): Promise<{ statusCode: number; json(): unknown }> {
  let response: { statusCode: number; json(): unknown } | null = null;

  await runtime.withPrincipalGrant(['workspace:graph-draft:view'], async () => {
    const token = await runtime.issuePrincipalToken();
    response = await runtime.requireApp().inject({
      method: 'PUT',
      url: '/workspace/graph/draft',
      headers: { authorization: `Bearer ${token}` },
      payload: buildWorkspaceGraphDraftSaveRequest({
        idempotencyKey: input?.idempotencyKey ?? 'draft-save-read-only',
        expectedRevision:
          input?.expectedRevision ?? '11111111-1111-1111-1111-111111111111',
      }),
    });
  });

  if (response === null) {
    throw new Error('Workspace draft read_only scenario did not produce a response');
  }

  return response;
}

async function saveWorkspaceGraphDraft(
  runtime: ProtectedRuntimeHarness,
  token: string,
  payload: WorkspaceGraphDraftSaveRequest
): Promise<{ statusCode: number; json(): unknown }> {
  return runtime.requireApp().inject({
    method: 'PUT',
    url: '/workspace/graph/draft',
    headers: { authorization: `Bearer ${token}` },
    payload,
  });
}

async function readWorkspaceGraphDraft(
  runtime: ProtectedRuntimeHarness,
  token: string
): Promise<{ statusCode: number; json(): unknown }> {
  return runtime.requireApp().inject({
    method: 'GET',
    url: `/workspace/graph/draft?tenantId=${TENANT_ID}&projectId=${PROJECT_ID}&environmentId=${ENVIRONMENT_ID}`,
    headers: { authorization: `Bearer ${token}` },
  });
}

function readWorkspaceGraphDraftRevision(payload: unknown): string {
  if (payload === null || typeof payload !== 'object') {
    throw new TypeError('Workspace graph draft save payload is not an object');
  }

  const revision = (payload as { revision?: unknown }).revision;
  if (typeof revision !== 'string') {
    throw new TypeError('Workspace graph draft save payload did not include a string revision');
  }

  return revision;
}
