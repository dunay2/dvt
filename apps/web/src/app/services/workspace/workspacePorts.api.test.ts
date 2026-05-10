import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { buildDraftReadOkResponse } from './workspaceGraphDraftProtocol.test.fixtures';
import {
  buildWorkspaceGraphDraftEndpoint,
  WORKSPACE_GRAPH_DRAFT_HTTP_ERROR_REASON,
} from './workspaceGraphDraftHttp';
import { createApiWorkspacePortHarness } from './workspacePortsApi.test.harness';
import {
  buildWorkspaceScope,
  installWorkspaceScopeHarness,
  setWorkspaceScope,
} from './workspaceScope.test.harness';
import { httpErrorResponse, jsonResponse } from './workspaceApiClient.test.harness';

type ApiWorkspacePorts = ReturnType<typeof createApiWorkspacePortHarness>;

const unsupportedApiWorkspaceOperations: ReadonlyArray<{
  readonly operation: string;
  readonly capability: string;
  readonly rail: string;
  readonly call: (ports: ApiWorkspacePorts) => Promise<unknown>;
}> = [
  {
    operation: 'getDiffChanges',
    capability: 'workspace.diffChanges',
    rail: 'GetWorkspaceDiffChanges',
    call: (ports) => ports.workspaceDiffQuery.getDiffChanges(),
  },
  {
    operation: 'getPlugins',
    capability: 'workspace.plugins',
    rail: 'ListWorkspacePlugins',
    call: (ports) => ports.workspacePluginCatalogQuery.getPlugins(),
  },
  {
    operation: 'getRoles',
    capability: 'workspace.adminRoles',
    rail: 'ListAdminRoles',
    call: (ports) => ports.workspaceAdminRead.getRoles(),
  },
  {
    operation: 'getAuditLog',
    capability: 'workspace.adminAuditLog',
    rail: 'ListAdminAuditLog',
    call: (ports) => ports.workspaceAdminRead.getAuditLog(),
  },
  {
    operation: 'saveFileContent',
    capability: 'workspace.fileWrite',
    rail: 'SaveWorkspaceFileContent',
    call: (ports) =>
      ports.workspaceFileContentCommand.saveFileContent('models/generated.sql', 'select 1'),
  },
] as const;

describe('workspace ports api graph snapshot', () => {
  installWorkspaceScopeHarness();

  it('projects the protected workspace graph draft into the canonical graph snapshot read model', async () => {
    const scope = buildWorkspaceScope();
    setWorkspaceScope(scope);
    const { getJson, requestRaw, workspaceGraphSnapshotQuery } = createApiWorkspacePortHarness({
      getJson: async (endpoint) => {
        throw new Error(`Retired graph endpoint reached: ${endpoint}`);
      },
      requestRaw: async (endpoint, init) => {
        expect(endpoint).toBe(buildWorkspaceGraphDraftEndpoint(scope));
        expect(init).toMatchObject({ method: 'GET' });
        return jsonResponse(buildDraftReadOkResponse(scope));
      },
    });

    const snapshot = await workspaceGraphSnapshotQuery.getGraphSnapshot();

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
    const { getJson, workspaceGraphSnapshotQuery } = createApiWorkspacePortHarness({
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

    await expect(workspaceGraphSnapshotQuery.getGraphSnapshot()).resolves.toEqual({
      nodes: [],
      edges: [],
    });
    expect(getJson).not.toHaveBeenCalled();
  });
});

describe('workspace ports api route parity posture', () => {
  it.each(unsupportedApiWorkspaceOperations)(
    'fails closed for %s before issuing transport calls',
    async ({ call, capability, rail }) => {
      const ports = createApiWorkspacePortHarness();
      const { getJson, postJson, requestRaw } = ports;

      await expect(call(ports)).rejects.toMatchObject({
        name: 'WorkspaceApiCapabilityUnsupportedError',
        capability,
        rail,
      });
      expect(getJson).not.toHaveBeenCalled();
      expect(postJson).not.toHaveBeenCalled();
      expect(requestRaw).not.toHaveBeenCalled();
    }
  );

  it('does not retain orphan API route literals for missing workspace rails', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/app/services/workspace/workspacePorts.api.ts'),
      'utf8'
    );

    expect(source).not.toContain('/diff/changes');
    expect(source).not.toContain('/plugins');
    expect(source).not.toContain('/admin/roles');
    expect(source).not.toContain('/admin/audit');
    expect(source).not.toContain('postJson<{ content: string }, FileContent>');
  });
});
