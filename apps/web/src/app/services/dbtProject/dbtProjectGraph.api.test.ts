// @vitest-environment jsdom

import { DbtProjectGraphProjectionSchema, type DbtProjectGraphProjection } from '@dvt/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createApiDbtProjectGraphQueryPort } from './dbtProjectGraph.api';
import type { DbtProjectFilesAuthorityBinding } from '../../ports/dbtProjectGraph';
import { createApiClientHarness, jsonResponse } from '../workspace/workspaceApiClient.test.harness';
import {
  buildWorkspaceScope,
  installWorkspaceScopeHarness,
  setWorkspaceScope,
} from '../workspace/workspaceScope.test.harness';

installWorkspaceScopeHarness();

function buildProjection(): DbtProjectGraphProjection {
  return DbtProjectGraphProjectionSchema.parse({
    schemaVersion: 'dbt-project-graph-projection.v1',
    authorityBinding: {
      schemaVersion: 'canvas-authoring-authority-binding.v1',
      canvasId: 'analytics-canvas',
      authority: { kind: 'dbt-project-files', projectRoot: '.' },
    },
    freshness: 'fresh',
    projectRevision: {
      projectRoot: '.',
      projectName: 'analytics',
      contentSetSha256: '1'.repeat(64),
      analyzedAt: '2026-07-13T10:00:00.000Z',
      analyzerVersion: 'dbt-cli-v1',
    },
    analysisSha256: '2'.repeat(64),
    nodes: [],
    edges: [],
    diagnostics: [],
    capabilities: { canPreview: false, canRun: false, codeOnlyResourceCount: 0 },
  });
}

function readFileAuthorityBinding(
  projection: DbtProjectGraphProjection
): DbtProjectFilesAuthorityBinding {
  if (projection.authorityBinding.authority.kind !== 'dbt-project-files') {
    throw new Error('Expected a dbt-project-files test fixture.');
  }
  return projection.authorityBinding as DbtProjectFilesAuthorityBinding;
}

describe('dbtProjectGraph api query port', () => {
  beforeEach(() => {
    setWorkspaceScope(buildWorkspaceScope());
  });

  it('queries the protected file projection with granted scope and explicit authority', async () => {
    const projection = buildProjection();
    const scope = buildWorkspaceScope();
    setWorkspaceScope(scope);
    const { apiClient, requestRaw } = createApiClientHarness({
      requestRaw: async () => jsonResponse(projection),
    });
    const port = createApiDbtProjectGraphQueryPort(apiClient);

    await expect(port.getProjectGraph(readFileAuthorityBinding(projection))).resolves.toEqual(
      projection
    );
    expect(requestRaw).toHaveBeenCalledWith(
      `/workspace/dbt/graph?tenantId=${scope.tenantId}&projectId=${scope.projectId}&environmentId=${scope.environmentId}&canvasId=analytics-canvas&projectRoot=.&projectionFeature=governed-source-identity.v1`,
      { method: 'GET' }
    );
  });

  it('rejects malformed response data at the browser boundary', async () => {
    const { apiClient } = createApiClientHarness({
      requestRaw: async () => jsonResponse({ freshness: 'fresh' }),
    });
    const port = createApiDbtProjectGraphQueryPort(apiClient);

    await expect(
      port.getProjectGraph(readFileAuthorityBinding(buildProjection()))
    ).rejects.toThrowError();
  });

  it('rejects a valid projection bound to another Canvas authority', async () => {
    const requestedProjection = buildProjection();
    const mismatchedProjection = DbtProjectGraphProjectionSchema.parse({
      ...requestedProjection,
      authorityBinding: {
        ...requestedProjection.authorityBinding,
        canvasId: 'another-canvas',
      },
    });
    const { apiClient } = createApiClientHarness({
      requestRaw: async () => jsonResponse(mismatchedProjection),
    });
    const port = createApiDbtProjectGraphQueryPort(apiClient);

    await expect(
      port.getProjectGraph(readFileAuthorityBinding(requestedProjection))
    ).rejects.toThrow('returned a projection for a different authority');
  });

  it('does not issue a graph-draft request', async () => {
    const requestRaw = vi.fn(async () => jsonResponse(buildProjection()));
    const { apiClient } = createApiClientHarness({ requestRaw });
    const port = createApiDbtProjectGraphQueryPort(apiClient);

    await port.getProjectGraph(readFileAuthorityBinding(buildProjection()));

    expect(requestRaw.mock.calls.flat().join(' ')).not.toContain('/workspace/graph/draft');
  });
});
