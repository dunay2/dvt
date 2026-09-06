import { parseExecutionSelection, type GenericGraphSourceV1 } from '@dvt/contracts';
import { PlannerFacade } from '@dvt/planner';
import { describe, expect, it, vi } from 'vitest';

import {
  AUTHORIZATION_ACTION,
  buildEnvironmentAccessScope,
} from '../../../src/application/ports/accessDecision.js';
import type { AuthorizedCommandExecutionContext } from '../../../src/application/ports/authContract.js';
import {
  type IWorkspaceGraphDraftStore,
  WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
} from '../../../src/application/ports/workspaceGraphDraft.js';
import { ResolveAuthorizedExecutableSubgraphService } from '../../../src/application/services/resolveAuthorizedExecutableSubgraph.js';
import { EnvironmentId, ProjectId, TenantId } from '../../../src/domain/auth/types.js';

const selection = parseExecutionSelection({
  mode: 'explicit',
  nodeIds: ['source-node', 'transform-node'],
});

function context(): AuthorizedCommandExecutionContext {
  return {
    principal: {
      principalId: 'user-1',
      subjectId: 'user-1',
      issuer: 'issuer',
      audience: 'audience',
      principalType: 'user',
      expiresAt: new Date('2030-01-01T00:00:00.000Z'),
      rawScopes: [],
      assertedTenantIds: ['tenant-a'],
      assertedProjectIds: ['project-a'],
    },
    scope: buildEnvironmentAccessScope(
      TenantId.unsafe('tenant-a'),
      ProjectId.unsafe('project-a'),
      EnvironmentId.unsafe('env-a')
    ),
    action: AUTHORIZATION_ACTION.runStart,
    requestId: 'req-1',
    authorizedAt: new Date('2026-09-05T00:00:00.000Z'),
  };
}

function draftPayload(metadata: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    canvas: { kind: 'dvt', title: 'DVT Canvas' },
    nodeIds: ['source-node', 'transform-node'],
    nodePositions: {
      'source-node': { x: 0, y: 0 },
      'transform-node': { x: 1, y: 1 },
    },
    nodes: [
      {
        id: 'source-node',
        name: 'Source',
        pluginId: 'dvt',
        kind: 'source',
        role: 'input',
        status: 'idle',
        tags: [],
      },
      {
        id: 'transform-node',
        name: 'Transform',
        pluginId: 'dvt',
        kind: 'transform',
        role: 'transform',
        status: 'idle',
        tags: [],
      },
    ],
    edges: [
      {
        id: 'edge-1',
        sourceId: 'source-node',
        targetId: 'transform-node',
        relation: 'lineage',
        metadata,
      },
    ],
  };
}

function service(
  metadata: Record<string, unknown> = {}
): ResolveAuthorizedExecutableSubgraphService {
  const workspaceGraphDraftStore: IWorkspaceGraphDraftStore = {
    migrate: vi.fn(),
    close: vi.fn(),
    save: vi.fn(),
    read: vi.fn(async () => ({
      scope: { tenantId: 'tenant-a', projectId: 'project-a', environmentId: 'env-a' },
      schemaVersion: WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
      revision: 'revision-1',
      updatedAt: '2026-09-06T00:00:00.000Z',
      draftPayload: draftPayload(metadata),
    })),
  };
  return new ResolveAuthorizedExecutableSubgraphService({
    planner: new PlannerFacade(),
    workspaceGraphDraftStore,
  });
}

function graphSource(transformDependsOn: readonly string[]): GenericGraphSourceV1 {
  return {
    kind: 'generic-graph-v1',
    sourceFamily: 'dvt-substrait',
    sourceVersion: 'substrait-v1',
    nodes: [
      { nodeId: 'source-node', stepKind: 'SOURCE', dependsOn: [] },
      {
        nodeId: 'transform-node',
        stepKind: 'TRANSFORM',
        dependsOn: [...transformDependsOn],
      },
    ],
  };
}

describe('ResolveAuthorizedExecutableSubgraphService protected topology', () => {
  it('rejects a client graph with the right nodes but missing a protected dependency', async () => {
    const result = await service().execute({ selection, graphSource: graphSource([]) }, context());

    expect(result).toEqual({
      ok: false,
      rejection: {
        code: 'REJECTED',
        cause: 'graph_source_dependency_mismatch',
        reason:
          'graphSource dependencies for transform-node must match the planner-derived executable topology.',
      },
    });
  });

  it('accepts the client graph only when its dependencies match the protected selected edges', async () => {
    const result = await service().execute(
      { selection, graphSource: graphSource(['source-node']) },
      context()
    );

    expect(result).toMatchObject({
      ok: true,
      value: {
        nodeIds: ['source-node', 'transform-node'],
        edgeIds: ['edge-1'],
        decisionScopeNodeIds: ['source-node', 'transform-node'],
      },
    });
  });

  it.each([
    { executionDependency: false },
    { executionGate: 'closed' },
    { executionGate: 'future-state' },
  ])('rejects reintroduced dependencies for non-executable edges %o', async (metadata) => {
    const result = await service(metadata).execute(
      { selection, graphSource: graphSource(['source-node']) },
      context()
    );
    expect(result).toMatchObject({
      ok: false,
      rejection: { cause: 'graph_source_dependency_mismatch' },
    });
  });

  it.each([
    { executionDependency: false },
    { executionGate: 'closed' },
    { executionGate: 'future-state' },
  ])('accepts the exact closure after filtering non-executable edges %o', async (metadata) => {
    const result = await service(metadata).execute(
      { selection, graphSource: graphSource([]) },
      context()
    );
    expect(result).toMatchObject({ ok: true, value: { edgeIds: [] } });
  });

  it('rejects an extra dependency outside the protected closure', async () => {
    const result = await service().execute(
      { selection, graphSource: graphSource(['source-node', 'injected-node']) },
      context()
    );
    expect(result).toMatchObject({
      ok: false,
      rejection: { cause: 'graph_source_dependency_mismatch' },
    });
  });

  it('rejects reversed dependencies even with the same selected nodes', async () => {
    const source = graphSource([]);
    const reversed = {
      ...source,
      nodes: source.nodes.map((node) =>
        node.nodeId === 'source-node' ? { ...node, dependsOn: ['transform-node'] } : node
      ),
    };
    const result = await service().execute({ selection, graphSource: reversed }, context());
    expect(result).toMatchObject({
      ok: false,
      rejection: { cause: 'graph_source_dependency_mismatch' },
    });
  });
});
