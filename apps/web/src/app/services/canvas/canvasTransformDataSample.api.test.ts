// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';

import { createApiClientHarness } from '../workspace/workspaceApiClient.test.harness';
import {
  buildWorkspaceScope,
  installWorkspaceScopeHarness,
  setWorkspaceScope,
} from '../workspace/workspaceScope.test.harness';

import {
  CanvasTransformDataSampleQueryError,
  createApiCanvasTransformDataSampleQueryPort,
} from './canvasTransformDataSample.api';

installWorkspaceScopeHarness();

describe('canvasTransformDataSample.api', () => {
  it('loads the card-owned Transform sample through its scoped query rail', async () => {
    const scope = buildWorkspaceScope();
    setWorkspaceScope(scope);
    const sample = {
      contractVersion: 1 as const,
      canvasId: 'canvas-orders',
      transformNodeId: 'transform-orders',
      draftRevision: 'revision-7',
      semanticPlanSha256: 'a'.repeat(64),
      columns: [{ name: 'order_id', type: 'integer', nullable: false }],
      rows: [{ values: ['1'] }],
      limit: 20,
      truncated: false,
      sampledAt: '2026-09-15T10:00:00.000Z',
    };
    const { apiClient, getJson } = createApiClientHarness({
      getJson: async <TResponse>() => sample as TResponse,
    });
    const port = createApiCanvasTransformDataSampleQueryPort(apiClient, { record: vi.fn() });

    await expect(
      port.previewTransformRows({
        canvasId: sample.canvasId,
        transformNodeId: sample.transformNodeId,
        limit: 20,
      })
    ).resolves.toEqual(sample);
    expect(getJson).toHaveBeenCalledWith(
      `/workspace/graph/canvases/canvas-orders/transforms/transform-orders/data-sample?tenantId=${scope.tenantId}&projectId=${scope.projectId}&environmentId=${scope.environmentId}&limit=20`
    );
  });

  it('rejects a malformed response with one stable presentation error', async () => {
    setWorkspaceScope(buildWorkspaceScope());
    const record = vi.fn();
    const { apiClient } = createApiClientHarness({ getJson: async () => ({ rows: [] }) });
    const port = createApiCanvasTransformDataSampleQueryPort(apiClient, { record });

    await expect(
      port.previewTransformRows({
        canvasId: 'canvas-orders',
        transformNodeId: 'transform-orders',
        limit: 20,
      })
    ).rejects.toBeInstanceOf(CanvasTransformDataSampleQueryError);
    expect(record).toHaveBeenCalledWith({
      type: 'frontend.contract.failed',
      operation: 'PreviewCanvasTransformRows',
      reasonCode: 'response-contract-rejected',
    });
  });
});
