import { describe, expect, it } from 'vitest';

import {
  buildDraftReadOkResponse,
  buildWorkspaceGraphDraftEndpoint,
} from './workspaceGraphDraft.test.fixtures';
import { WORKSPACE_GRAPH_DRAFT_HTTP_ERROR_REASON } from './workspaceGraphDraftHttp';
import { createApiWorkspaceServiceHarness } from './workspaceServiceApi.test.harness';
import {
  buildWorkspaceScope,
  installWorkspaceScopeHarness,
  setWorkspaceScope,
} from './workspaceScope.test.harness';
import { httpErrorResponse, jsonResponse } from './workspaceApiClient.test.harness';

describe('workspaceService api graph snapshot', () => {
  installWorkspaceScopeHarness();

  it('projects the protected workspace graph draft into the canonical graph snapshot read model', async () => {
    const scope = buildWorkspaceScope();
    setWorkspaceScope(scope);
    const { getJson, requestRaw, service } = createApiWorkspaceServiceHarness({
      getJson: async (endpoint) => {
        throw new Error(`Retired graph endpoint reached: ${endpoint}`);
      },
      requestRaw: async (endpoint, init) => {
        expect(endpoint).toBe(buildWorkspaceGraphDraftEndpoint(scope));
        expect(init).toMatchObject({ method: 'GET' });
        return jsonResponse(buildDraftReadOkResponse(scope));
      },
    });

    const snapshot = await service.getGraphSnapshot();

    expect(getJson).not.toHaveBeenCalled();
    expect(requestRaw).toHaveBeenCalledTimes(1);
    expect(snapshot.nodes.map((node) => node.id)).toEqual([
      'source_node',
      'transform_node',
      'sink_node',
    ]);
    expect(snapshot.nodes.find((node) => node.id === 'transform_node')).toMatchObject({
      name: 'transform',
      type: 'MODEL',
      package: 'dvt',
      path: 'models/transform.sql',
      status: 'idle',
      dependencies: ['source_node'],
    });
    expect(snapshot.edges.map((edge) => [edge.source, edge.target])).toEqual([
      ['source_node', 'transform_node'],
      ['transform_node', 'sink_node'],
    ]);
  });

  it('maps a missing protected draft to an empty graph snapshot instead of failing startup', async () => {
    const scope = buildWorkspaceScope();
    setWorkspaceScope(scope);
    const { getJson, service } = createApiWorkspaceServiceHarness({
      getJson: async (endpoint) => {
        throw new Error(`Retired graph endpoint reached: ${endpoint}`);
      },
      requestRaw: async () =>
        httpErrorResponse({
          type: 'not_found',
          reason: WORKSPACE_GRAPH_DRAFT_HTTP_ERROR_REASON.notFound,
          status: 404,
        }),
    });

    await expect(service.getGraphSnapshot()).resolves.toEqual({ nodes: [], edges: [] });
    expect(getJson).not.toHaveBeenCalled();
  });
});
