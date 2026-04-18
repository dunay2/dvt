import { describe, expect, it } from 'vitest';

import { createWorkspaceService } from './workspaceService';
import {
  buildDraftReadOkResponse,
  buildDraftSaveConflictResponse,
  buildDraftSaveSavedResponse,
  buildPresentationGraphDraft,
  buildProjectedDraftRecord,
  buildProtectedDraftRecord,
  buildWorkspaceGraphDraftEndpoint,
} from './workspaceGraphDraft.test.fixtures';
import { jsonResponse } from './workspaceApiClient.test.harness';
import { createApiWorkspaceServiceHarness } from './workspaceServiceApi.test.harness';
import { buildWorkspaceScope, installWorkspaceScopeHarness, setWorkspaceScope } from './workspaceScope.test.harness';

installWorkspaceScopeHarness();

describe('workspaceService graph draft', () => {
  it('persists graph draft revisions with compare-and-swap semantics', async () => {
    const service = createWorkspaceService('mock');

    const firstSave = await service.saveGraphDraft({
      expectedRevision: null,
      idempotencyKey: 'idem-1',
      draft: buildPresentationGraphDraft(),
    });
    expect(firstSave.outcome).toBe('saved');

    if (firstSave.outcome !== 'saved') {
      throw new Error('expected saved outcome');
    }

    const conflictSave = await service.saveGraphDraft({
      expectedRevision: null,
      idempotencyKey: 'idem-2',
      draft: buildPresentationGraphDraft({
        nodePositions: { node_1: { x: 99, y: 88 } },
      }),
    });

    expect(conflictSave).toEqual({
      outcome: 'conflict',
      current: expect.objectContaining({
        revision: firstSave.record.revision,
      }),
    });

    const currentDraft = await service.getGraphDraft();
    expect(currentDraft).not.toBeNull();
    expect(currentDraft?.draft.nodePositions.node_1).toEqual({ x: 10, y: 20 });
  });

  it('deduplicates graph draft retries by idempotency key', async () => {
    const service = createWorkspaceService('mock');

    const firstAttempt = await service.saveGraphDraft({
      expectedRevision: null,
      idempotencyKey: 'idem-retry',
      draft: buildPresentationGraphDraft({
        nodePositions: { node_1: { x: 20, y: 30 } },
      }),
    });
    const secondAttempt = await service.saveGraphDraft({
      expectedRevision: null,
      idempotencyKey: 'idem-retry',
      draft: buildPresentationGraphDraft({
        nodePositions: { node_1: { x: 999, y: 999 } },
      }),
    });

    expect(secondAttempt).toEqual(firstAttempt);
    if (firstAttempt.outcome !== 'saved') {
      throw new Error('expected saved outcome');
    }
    expect(secondAttempt.outcome).toBe('saved');
    if (secondAttempt.outcome !== 'saved') {
      throw new Error('expected saved outcome');
    }
    expect(secondAttempt.record.revision).toBe(firstAttempt.record.revision);
  });

  it('reads graph drafts in api mode using scoped query params and the published read envelope', async () => {
    const scope = buildWorkspaceScope();
    setWorkspaceScope(scope);

    const { requestRaw, service } = createApiWorkspaceServiceHarness({
      requestRaw: async () =>
        jsonResponse(
          buildDraftReadOkResponse(scope, {
            record: buildProtectedDraftRecord(scope),
          })
        ),
    });

    await expect(service.getGraphDraft()).resolves.toEqual(buildProjectedDraftRecord());
    expect(requestRaw).toHaveBeenCalledWith(buildWorkspaceGraphDraftEndpoint(scope), {
      method: 'GET',
    });
  });

  it('sends contract-compliant save requests in api mode and hydrates the saved record via follow-up read', async () => {
    const scope = buildWorkspaceScope({
      tenantId: 'tenant-b',
      projectId: 'project-b',
      environmentId: 'env-b',
    });
    setWorkspaceScope(scope);

    const { requestRaw, service } = createApiWorkspaceServiceHarness({
      requestRaw: async (_endpoint, options) => {
        if (options?.method === 'PUT') {
          return jsonResponse(buildDraftSaveSavedResponse(scope));
        }

        return jsonResponse(
          buildDraftReadOkResponse(scope, {
            record: buildProtectedDraftRecord(scope, { revision: 'rev-2' }),
          })
        );
      },
    });
    const draft = buildPresentationGraphDraft();

    await expect(
      service.saveGraphDraft({
        expectedRevision: null,
        idempotencyKey: 'idem-api-save-1',
        draft,
      })
    ).resolves.toEqual({
      outcome: 'saved',
      record: buildProjectedDraftRecord({ revision: 'rev-2' }),
    });
    expect(requestRaw).toHaveBeenNthCalledWith(1, '/workspace/graph/draft', {
      method: 'PUT',
      jsonBody: {
        scope,
        schemaVersion: 'workspace-graph-draft.v1',
        expectedRevision: 'initial',
        idempotencyKey: 'idem-api-save-1',
        draft,
      },
    });
    expect(requestRaw).toHaveBeenNthCalledWith(2, buildWorkspaceGraphDraftEndpoint(scope), {
      method: 'GET',
    });
  });

  it('maps contract conflict responses through a follow-up read in api mode', async () => {
    const scope = buildWorkspaceScope({
      tenantId: 'tenant-c',
      projectId: 'project-c',
      environmentId: 'env-c',
    });
    setWorkspaceScope(scope);

    const { requestRaw, service } = createApiWorkspaceServiceHarness({
      requestRaw: async (_endpoint, options) => {
        if (options?.method === 'PUT') {
          return jsonResponse(buildDraftSaveConflictResponse(scope), 409);
        }

        return jsonResponse(
          buildDraftReadOkResponse(scope, {
            record: buildProtectedDraftRecord(scope, { revision: 'rev-current' }),
          })
        );
      },
    });
    const draft = buildPresentationGraphDraft({
      nodePositions: { node_1: { x: 99, y: 88 } },
    });

    await expect(
      service.saveGraphDraft({
        expectedRevision: 'rev-stale',
        idempotencyKey: 'idem-api-conflict-1',
        draft,
      })
    ).resolves.toEqual({
      outcome: 'conflict',
      current: buildProjectedDraftRecord({ revision: 'rev-current' }),
    });
    expect(requestRaw).toHaveBeenNthCalledWith(1, '/workspace/graph/draft', {
      method: 'PUT',
      jsonBody: {
        scope,
        schemaVersion: 'workspace-graph-draft.v1',
        expectedRevision: 'rev-stale',
        idempotencyKey: 'idem-api-conflict-1',
        draft,
      },
    });
  });

  it('reuses the original scope for save follow-up reads when session scope changes in flight', async () => {
    const initialScope = buildWorkspaceScope({
      tenantId: 'tenant-initial',
      projectId: 'project-initial',
      environmentId: 'env-initial',
    });
    const driftedScope = buildWorkspaceScope({
      tenantId: 'tenant-drifted',
      projectId: 'project-drifted',
      environmentId: 'env-drifted',
    });
    setWorkspaceScope(initialScope);

    const { requestRaw, service } = createApiWorkspaceServiceHarness({
      requestRaw: async (_endpoint, options) => {
        if (options?.method === 'PUT') {
          setWorkspaceScope(driftedScope);
          return jsonResponse(buildDraftSaveSavedResponse(initialScope));
        }

        return jsonResponse(
          buildDraftReadOkResponse(initialScope, {
            record: buildProtectedDraftRecord(initialScope, { revision: 'rev-stable' }),
          })
        );
      },
    });

    await expect(
      service.saveGraphDraft({
        expectedRevision: null,
        idempotencyKey: 'idem-api-save-scope-stability',
        draft: buildPresentationGraphDraft(),
      })
    ).resolves.toEqual({
      outcome: 'saved',
      record: buildProjectedDraftRecord({ revision: 'rev-stable' }),
    });

    expect(requestRaw).toHaveBeenNthCalledWith(1, '/workspace/graph/draft', {
      method: 'PUT',
      jsonBody: {
        scope: initialScope,
        schemaVersion: 'workspace-graph-draft.v1',
        expectedRevision: 'initial',
        idempotencyKey: 'idem-api-save-scope-stability',
        draft: buildPresentationGraphDraft(),
      },
    });
    expect(requestRaw).toHaveBeenNthCalledWith(
      2,
      buildWorkspaceGraphDraftEndpoint(initialScope),
      {
        method: 'GET',
      }
    );
  });
});
