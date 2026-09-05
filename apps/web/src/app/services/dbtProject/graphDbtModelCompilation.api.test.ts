// @vitest-environment jsdom

import type { CompileGraphDbtModelsRequest } from '@dvt/contracts';
import { GraphDbtModelCompilationResultSchema } from '@dvt/contracts';
import { beforeEach, describe, expect, it } from 'vitest';

import type { ApiClient } from '../api/createApiClient';
import { createApiClientHarness } from '../workspace/workspaceApiClient.test.harness';
import {
  buildWorkspaceScope,
  installWorkspaceScopeHarness,
  setWorkspaceScope,
} from '../workspace/workspaceScope.test.harness';
import { createApiGraphDbtModelCompilationQueryPort } from './graphDbtModelCompilation.api';

installWorkspaceScopeHarness();

const REQUEST: CompileGraphDbtModelsRequest = {
  canvasId: 'orders-canvas',
  selectors: ['orders'],
};

const RESULT = GraphDbtModelCompilationResultSchema.parse({
  schemaVersion: 'graph-dbt-model-compilation.v1',
  kind: 'compiled',
  canvasId: REQUEST.canvasId,
  authorityBinding: {
    schemaVersion: 'canvas-authoring-authority-binding.v1',
    canvasId: REQUEST.canvasId,
    authority: { kind: 'graph-draft' },
  },
  projectRevision: {
    projectRoot: '.',
    projectName: 'analytics',
    contentSetSha256: 'a'.repeat(64),
    analyzedAt: '2026-08-19T22:00:00.000Z',
    analyzerVersion: 'dvt-dbt-analyzer.v1',
    dbtVersion: '1.10.0',
  },
  analysisSha256: 'a'.repeat(64),
  models: [{ selector: 'orders', uniqueId: 'model.analytics.orders', compiledSql: 'select 1' }],
});

describe('Graph DBT model compilation API port', () => {
  beforeEach(() => {
    setWorkspaceScope(buildWorkspaceScope());
  });

  it('queries the single scoped protected endpoint', async () => {
    const scope = buildWorkspaceScope();
    setWorkspaceScope(scope);
    const postJsonImpl: ApiClient['postJson'] = async <TRequest, TResponse>() =>
      RESULT as TResponse;
    const { apiClient, postJson } = createApiClientHarness({ postJson: postJsonImpl });
    const port = createApiGraphDbtModelCompilationQueryPort(apiClient);

    await expect(port.compile(REQUEST)).resolves.toEqual(RESULT);
    expect(postJson).toHaveBeenCalledWith(
      `/workspace/dbt/graph-artifacts/compiled-models?${new URLSearchParams(scope).toString()}`,
      REQUEST
    );
  });

  it('rejects malformed result data at the browser boundary', async () => {
    const postJsonImpl: ApiClient['postJson'] = async <TRequest, TResponse>() =>
      ({ kind: 'compiled' }) as TResponse;
    const { apiClient } = createApiClientHarness({ postJson: postJsonImpl });
    const port = createApiGraphDbtModelCompilationQueryPort(apiClient);

    await expect(port.compile(REQUEST)).rejects.toThrow();
  });
});
