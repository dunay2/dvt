// @vitest-environment jsdom
/** Prove SQL inspection stays a scoped identity query and rejects mismatched server output. */
import { describe, expect, it, vi } from 'vitest';
import {
  TransformSqlProjectionRequestSchema,
  type TransformSqlProjectionRequest,
} from '@dvt/contracts';
import { createApiClientHarness } from '../workspace/workspaceApiClient.test.harness';
import {
  buildWorkspaceScope,
  installWorkspaceScopeHarness,
  setWorkspaceScope,
} from '../workspace/workspaceScope.test.harness';
import { CanvasTransformSqlQueryError } from '../../ports/canvasTransformSql';
import { createApiCanvasTransformSqlQueryPort } from './canvasTransformSql.api';

installWorkspaceScopeHarness();
const request = TransformSqlProjectionRequestSchema.parse({
  canvasId: 'canvas/orders',
  transformNodeId: 'model/orders',
  semanticPlanSha256: 'a'.repeat(64),
});
const result = {
  ...request,
  schemaVersion: 'canvas-transform-sql-projection.v1',
  draftRevision: 'revision-7',
  sql: 'select authorized_orders',
  provenance: {
    sourceRefs: [],
    modelRefs: [
      {
        canvasId: 'files-canvas',
        uniqueId: 'model.project.orders',
        contentSetSha256: 'b'.repeat(64),
        analysisSha256: 'c'.repeat(64),
      },
    ],
  },
};

describe('Canvas Transform authorized SQL adapter', () => {
  it('reads one encoded identity and current granted scope without sending SQL or executing rows', async () => {
    const scope = buildWorkspaceScope();
    setWorkspaceScope(scope);
    const { apiClient, getJson, postJson } = createApiClientHarness({
      getJson: async <T>() => result as T,
    });
    const port = createApiCanvasTransformSqlQueryPort(apiClient, { record: vi.fn() });
    await expect(port.projectTransformSql(request)).resolves.toEqual(result);
    expect(getJson).toHaveBeenCalledExactlyOnceWith(
      `/workspace/graph/canvases/canvas%2Forders/transforms/model%2Forders/sql?tenantId=${scope.tenantId}&projectId=${scope.projectId}&environmentId=${scope.environmentId}&semanticPlanSha256=${request.semanticPlanSha256}`
    );
    expect(postJson).not.toHaveBeenCalled();
  });

  it.each([
    {},
    { ...result, canvasId: 'another-canvas' },
    { ...result, transformNodeId: 'another-model' },
    { ...result, semanticPlanSha256: 'd'.repeat(64) },
    { ...result, sql: '' },
    { ...result, provenance: { sourceRefs: [] } },
  ])('rejects malformed or mismatched output without publishing SQL', async (response) => {
    setWorkspaceScope(buildWorkspaceScope());
    const { apiClient } = createApiClientHarness({ getJson: async <T>() => response as T });
    const record = vi.fn();
    await expect(
      createApiCanvasTransformSqlQueryPort(apiClient, { record }).projectTransformSql(request)
    ).rejects.toBeInstanceOf(CanvasTransformSqlQueryError);
    expect(record).toHaveBeenCalledOnce();
  });

  it('does not expose transport diagnostics or reinterpret a failed query as SQL', async () => {
    setWorkspaceScope(buildWorkspaceScope());
    const { apiClient } = createApiClientHarness({
      getJson: async () => {
        throw new Error('private connection diagnostic');
      },
    });
    await expect(
      createApiCanvasTransformSqlQueryPort(apiClient, { record: vi.fn() }).projectTransformSql(
        request
      )
    ).rejects.toThrow('The authorized Canvas Transform SQL could not be read.');
  });

  it('rejects an invalid semantic identity before any HTTP call', async () => {
    setWorkspaceScope(buildWorkspaceScope());
    const { apiClient, getJson } = createApiClientHarness();
    await expect(
      createApiCanvasTransformSqlQueryPort(apiClient, { record: vi.fn() }).projectTransformSql({
        ...request,
        semanticPlanSha256: 'not-a-digest',
      } as unknown as TransformSqlProjectionRequest)
    ).rejects.toBeInstanceOf(CanvasTransformSqlQueryError);
    expect(getJson).not.toHaveBeenCalled();
  });
});
