import { type ExecutableSubgraph, parseExecutionSelection } from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import {
  AUTHORIZATION_ACTION,
  buildEnvironmentAccessScope,
  buildTenantAccessScope,
} from '../../../src/application/ports/accessDecision.js';
import type { AuthorizedCommandExecutionContext } from '../../../src/application/ports/authContract.js';
import { WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION } from '../../../src/application/ports/workspaceGraphDraft.js';
import { ResolveAuthorizedExecutableSubgraphService } from '../../../src/application/services/resolveAuthorizedExecutableSubgraph.js';
import { EnvironmentId, ProjectId, TenantId } from '../../../src/domain/auth/types.js';

function buildContext(): AuthorizedCommandExecutionContext {
  return {
    principal: {
      principalId: 'user-1',
      subjectId: 'user-1',
      issuer: 'issuer',
      audience: 'audience',
      principalType: 'user' as const,
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
    authorizedAt: new Date('2026-04-23T00:00:00.000Z'),
  };
}

function buildDraftPayload(): Record<string, unknown> {
  return {
    canvas: {
      kind: 'workspace-graph-authoring-v1',
      title: 'Test workspace graph draft',
    },
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
        tags: ['input'],
      },
      {
        id: 'transform-node',
        name: 'Transform',
        pluginId: 'dvt',
        kind: 'transform',
        role: 'transform',
        status: 'idle',
        tags: ['transform'],
      },
    ],
    edges: [
      {
        id: 'edge-1',
        sourceId: 'source-node',
        targetId: 'transform-node',
        relation: 'lineage',
      },
    ],
  };
}

function buildExecutableSubgraph(overrides: Partial<ExecutableSubgraph> = {}): ExecutableSubgraph {
  return {
    selection: parseExecutionSelection({
      mode: 'explicit',
      nodeIds: ['source-node', 'transform-node'],
    }),
    nodeIds: ['source-node', 'transform-node'],
    edgeIds: ['edge-1'],
    executable: true,
    diagnostics: [],
    ...overrides,
  };
}

describe('ResolveAuthorizedExecutableSubgraphService', () => {
  it('rejects incomplete authorized scope before reading the protected draft', async () => {
    const read = vi.fn();
    const service = new ResolveAuthorizedExecutableSubgraphService({
      planner: { deriveExecutableSubgraph: vi.fn() } as never,
      workspaceGraphDraftStore: { read } as never,
    });

    const result = await service.execute(
      {
        selection: parseExecutionSelection({
          mode: 'explicit',
          nodeIds: ['source-node'],
        }),
      },
      {
        ...buildContext(),
        scope: buildTenantAccessScope(TenantId.unsafe('tenant-a')),
      }
    );

    expect(result).toEqual({
      ok: false,
      rejection: {
        code: 'REJECTED',
        cause: 'authorized_scope_incomplete',
        reason: 'Authorized scope is missing projectId or environmentId.',
      },
    });
    expect(read).not.toHaveBeenCalled();
  });

  it('rejects non-executable planner diagnostics instead of widening to the whole draft', async () => {
    const planner = {
      deriveExecutableSubgraph: vi.fn(() =>
        buildExecutableSubgraph({
          executable: false,
          diagnostics: [
            {
              code: 'dependency_gap',
              message: 'transform-node requires source-node to be selected.',
            },
          ],
        })
      ),
    };
    const service = new ResolveAuthorizedExecutableSubgraphService({
      planner: planner as never,
      workspaceGraphDraftStore: {
        read: vi.fn(async () => ({
          schemaVersion: WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
          draftPayload: buildDraftPayload(),
        })),
      } as never,
    });

    const result = await service.execute(
      {
        selection: parseExecutionSelection({
          mode: 'explicit',
          nodeIds: ['transform-node'],
        }),
      },
      buildContext()
    );

    expect(result).toEqual({
      ok: false,
      rejection: {
        code: 'REJECTED',
        cause: 'dependency_gap',
        reason: 'transform-node requires source-node to be selected.',
      },
    });
    expect(planner.deriveExecutableSubgraph).toHaveBeenCalledTimes(1);
  });

  it.each([
    { executionDependency: false },
    { executionGate: 'closed' },
    { executionGate: 'future-state' },
  ])('excludes non-executable edge metadata %o before deriving the closure', async (metadata) => {
    const selection = parseExecutionSelection({
      mode: 'explicit',
      nodeIds: ['transform-node'],
    });
    const planner = {
      deriveExecutableSubgraph: vi.fn((input) => {
        expect(input.draft.edges).toEqual([]);
        return buildExecutableSubgraph({
          selection,
          nodeIds: ['transform-node'],
          edgeIds: [],
        });
      }),
    };
    const service = new ResolveAuthorizedExecutableSubgraphService({
      planner: planner as never,
      workspaceGraphDraftStore: {
        read: vi.fn(async () => ({
          schemaVersion: WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
          draftPayload: {
            ...buildDraftPayload(),
            edges: [
              {
                id: 'edge-reference',
                sourceId: 'source-node',
                targetId: 'transform-node',
                relation: 'lineage',
                metadata,
              },
            ],
          },
        })),
      } as never,
    });

    const result = await service.execute(
      {
        selection,
        graphSource: {
          kind: 'generic-graph-v1',
          sourceFamily: 'dbt',
          sourceVersion: '1.0',
          nodes: [
            {
              nodeId: 'transform-node',
              stepKind: 'DBT_MODEL',
              dependsOn: [],
            },
          ],
        },
      },
      buildContext()
    );

    expect(result).toEqual({
      ok: true,
      value: {
        ...buildExecutableSubgraph({
          selection,
          nodeIds: ['transform-node'],
          edgeIds: [],
        }),
        decisionScopeNodeIds: ['source-node', 'transform-node'],
      },
    });
    expect(planner.deriveExecutableSubgraph).toHaveBeenCalledTimes(1);
  });

  it('keeps active multi-canvas workspaces mirrored when filtering reference-only edges', async () => {
    const selection = parseExecutionSelection({
      mode: 'explicit',
      nodeIds: ['transform-node'],
    });
    const planner = {
      deriveExecutableSubgraph: vi.fn((input) => {
        expect(input.draft.edges).toEqual([]);
        expect(input.draft.canvases?.[0]?.edges).toEqual([]);
        return buildExecutableSubgraph({
          selection,
          nodeIds: ['transform-node'],
          edgeIds: [],
        });
      }),
    };
    const baseDraftPayload = buildDraftPayload();
    const canvas = {
      id: 'dbt-canvas',
      kind: 'dbt',
      title: 'dbt canvas',
    };
    const referenceOnlyEdges = [
      {
        id: 'edge-reference',
        sourceId: 'source-node',
        targetId: 'transform-node',
        relation: 'lineage',
        metadata: {
          executionDependency: false,
        },
      },
    ];
    const service = new ResolveAuthorizedExecutableSubgraphService({
      planner: planner as never,
      workspaceGraphDraftStore: {
        read: vi.fn(async () => ({
          schemaVersion: WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
          draftPayload: {
            ...baseDraftPayload,
            canvas,
            activeCanvasId: canvas.id,
            edges: referenceOnlyEdges,
            canvases: [
              {
                canvas,
                nodeIds: baseDraftPayload.nodeIds,
                nodePositions: baseDraftPayload.nodePositions,
                nodes: baseDraftPayload.nodes,
                edges: referenceOnlyEdges,
              },
            ],
          },
        })),
      } as never,
    });

    const result = await service.execute(
      {
        selection,
        graphSource: {
          kind: 'generic-graph-v1',
          sourceFamily: 'dbt',
          sourceVersion: '1.0',
          nodes: [
            {
              nodeId: 'transform-node',
              stepKind: 'DBT_MODEL',
              dependsOn: [],
            },
          ],
        },
      },
      buildContext()
    );

    expect(result).toEqual({
      ok: true,
      value: {
        ...buildExecutableSubgraph({
          selection,
          nodeIds: ['transform-node'],
          edgeIds: [],
        }),
        decisionScopeNodeIds: ['source-node', 'transform-node'],
      },
    });
    expect(planner.deriveExecutableSubgraph).toHaveBeenCalledTimes(1);
  });

  it('rejects graphSource mismatches against the planner-derived selected closure', async () => {
    const service = new ResolveAuthorizedExecutableSubgraphService({
      planner: {
        deriveExecutableSubgraph: vi.fn(() => buildExecutableSubgraph()),
      } as never,
      workspaceGraphDraftStore: {
        read: vi.fn(async () => ({
          schemaVersion: WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
          draftPayload: buildDraftPayload(),
        })),
      } as never,
    });

    const result = await service.execute(
      {
        selection: parseExecutionSelection({
          mode: 'explicit',
          nodeIds: ['source-node', 'transform-node'],
        }),
        graphSource: {
          kind: 'generic-graph-v1',
          sourceFamily: 'dvt-substrait',
          sourceVersion: 'substrait-v1',
          nodes: [
            {
              nodeId: 'source-node',
              stepKind: 'PREPARE_POSTGRES_TRANSFORM',
              dependsOn: [],
            },
          ],
        },
      },
      buildContext()
    );

    expect(result).toEqual({
      ok: false,
      rejection: {
        code: 'REJECTED',
        cause: 'graph_source_selection_mismatch',
        reason:
          'graphSource nodes must match the planner-derived executable subgraph for the selection.',
      },
    });
  });

  it('returns the planner-derived executable subgraph when the protected draft and graphSource align', async () => {
    const executableSubgraph = buildExecutableSubgraph();
    const service = new ResolveAuthorizedExecutableSubgraphService({
      planner: {
        deriveExecutableSubgraph: vi.fn(() => executableSubgraph),
      } as never,
      workspaceGraphDraftStore: {
        read: vi.fn(async () => ({
          schemaVersion: WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
          draftPayload: buildDraftPayload(),
        })),
      } as never,
    });

    const result = await service.execute(
      {
        selection: executableSubgraph.selection,
        graphSource: {
          kind: 'generic-graph-v1',
          sourceFamily: 'dvt-substrait',
          sourceVersion: 'substrait-v1',
          nodes: [
            {
              nodeId: 'source-node',
              stepKind: 'PREPARE_POSTGRES_TRANSFORM',
              dependsOn: [],
            },
            {
              nodeId: 'transform-node',
              stepKind: 'POSTGRES_SQL_TRANSFORM',
              dependsOn: ['source-node'],
            },
          ],
        },
      },
      buildContext()
    );

    expect(result).toEqual({
      ok: true,
      value: {
        ...executableSubgraph,
        decisionScopeNodeIds: ['source-node', 'transform-node'],
      },
    });
  });
});
