// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { WorksheetCanvasModelRequestSchema } from '@dvt/contracts';
import { createApiClientHarness } from '../workspace/workspaceApiClient.test.harness';
import {
  buildWorkspaceScope,
  installWorkspaceScopeHarness,
  setWorkspaceScope,
} from '../workspace/workspaceScope.test.harness';
import { buildWorksheetCanvasProposal } from '../../views/sql/worksheetCanvasModel.test-fixtures';
import { createWorksheetCanvasModelQuery } from './worksheetCanvasModel.api';

installWorkspaceScopeHarness();
const input = WorksheetCanvasModelRequestSchema.parse({
  schemaVersion: 'worksheet-canvas-model-request.v1',
  canvasId: 'canvas',
  expectedRevision: 'r1',
  modelId: 'model',
  name: 'Model',
  connectionRef: {
    schemaVersion: 'connection-ref.v1',
    connectionId: 'warehouse',
    provider: 'postgres',
  },
  sql: 'SELECT orders_id FROM public.orders',
  models: [],
});
describe('worksheet Canvas proposal transport', () => {
  it('keeps SQL in the body and validates the complete scoped proposal digest', async () => {
    const scope = buildWorkspaceScope();
    setWorkspaceScope(scope);
    const response = buildWorksheetCanvasProposal(input, scope);
    const { apiClient, postJson } = createApiClientHarness({
      postJson: async <_T, R>() => response as R,
    });
    expect(await createWorksheetCanvasModelQuery(apiClient).propose(input)).toEqual(response);
    expect(postJson.mock.calls[0]?.[0]).toBe(
      '/workspace/graph/canvases/canvas/sql-model-proposal?tenantId=tenant-a&projectId=project-a&environmentId=env-a'
    );
    expect(postJson.mock.calls[0]?.[1]).toEqual(input);
  });
  it.each(['expectedRevision', 'modelId', 'sqlSha256', 'proposalSha256'])(
    'rejects contradictory or tampered %s',
    async (key) => {
      const scope = buildWorkspaceScope();
      setWorkspaceScope(scope);
      const response = {
        ...buildWorksheetCanvasProposal(input, scope),
        [key]: key.endsWith('Sha256') ? 'b'.repeat(64) : 'foreign',
      };
      const { apiClient } = createApiClientHarness({ postJson: async <_T, R>() => response as R });
      await expect(createWorksheetCanvasModelQuery(apiClient).propose(input)).rejects.toMatchObject(
        { reason: 'contract' }
      );
    }
  );
  it('rejects a foreign response scope', async () => {
    const scope = buildWorkspaceScope();
    setWorkspaceScope(scope);
    const response = buildWorksheetCanvasProposal(input, { ...scope, tenantId: 'foreign' });
    const { apiClient } = createApiClientHarness({ postJson: async <_T, R>() => response as R });
    await expect(createWorksheetCanvasModelQuery(apiClient).propose(input)).rejects.toMatchObject({
      reason: 'contract',
    });
  });
  it('admits only the requested current-context verification without a replacement graph', async () => {
    const scope = buildWorkspaceScope();
    setWorkspaceScope(scope);
    const verification = WorksheetCanvasModelRequestSchema.parse({
      ...input,
      verifyContextSha256: 'a'.repeat(64),
    });
    const response = buildWorksheetCanvasProposal(verification, scope);
    const { apiClient, postJson } = createApiClientHarness({
      postJson: async <_T, R>() => response as R,
    });
    expect(await createWorksheetCanvasModelQuery(apiClient).propose(verification)).toEqual(
      response
    );
    expect(response.status).toBe('current');
    expect(response).not.toHaveProperty('draft');
    expect(postJson.mock.calls[0]?.[1]).toEqual(verification);
    await expect(createWorksheetCanvasModelQuery(apiClient).propose(input)).rejects.toMatchObject({
      reason: 'contract',
    });
  });
  it.each(['replacement graph', 'changed context'])(
    'rejects %s during verification',
    async (scenario) => {
      const scope = buildWorkspaceScope();
      setWorkspaceScope(scope);
      const verification = WorksheetCanvasModelRequestSchema.parse({
        ...input,
        verifyContextSha256: 'a'.repeat(64),
      });
      const response =
        scenario === 'replacement graph'
          ? buildWorksheetCanvasProposal(input, scope)
          : buildWorksheetCanvasProposal(verification, scope, 'b'.repeat(64));
      const { apiClient } = createApiClientHarness({ postJson: async <_T, R>() => response as R });
      await expect(
        createWorksheetCanvasModelQuery(apiClient).propose(verification)
      ).rejects.toMatchObject({ reason: 'contract' });
    }
  );
});
