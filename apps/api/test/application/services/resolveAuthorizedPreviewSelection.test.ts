import {
  DbtProjectGraphProjectionSchema,
  asSha256HexString,
  parseExecutionSelection,
  type DbtProjectGraphProjection,
  type DbtProjectFilesProvenance,
  type GenericGraphSourceV1,
} from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import {
  AUTHORIZATION_ACTION,
  buildEnvironmentAccessScope,
  buildTenantAccessScope,
} from '../../../src/application/ports/accessDecision.js';
import type { AuthorizedCommandExecutionContext } from '../../../src/application/ports/authContract.js';
import { ResolveAuthorizedPreviewSelectionService } from '../../../src/application/services/resolveAuthorizedPreviewSelection.js';
import { EnvironmentId, ProjectId, TenantId } from '../../../src/domain/auth/types.js';

const MODEL_ID = 'model.analytics.orders';
const CONTENT_SHA = asSha256HexString('a'.repeat(64));
const ANALYSIS_SHA = asSha256HexString('b'.repeat(64));

const GRAPH_SOURCE: GenericGraphSourceV1 = {
  kind: 'generic-graph-v1',
  sourceFamily: 'dbt',
  sourceVersion: '1.0',
  nodes: [
    {
      nodeId: MODEL_ID,
      stepKind: 'DBT_MODEL',
      dependsOn: [],
      metadata: {
        displayName: 'orders',
        tags: { kind: 'dbt:model', pluginId: 'dbt', role: 'transform' },
      },
    },
  ],
};

const PROVENANCE: DbtProjectFilesProvenance = {
  kind: 'dbt-project-files',
  canvasId: 'analytics-canvas',
  projectRoot: 'analytics',
  contentSetSha256: CONTENT_SHA,
  analysisSha256: ANALYSIS_SHA,
  dbtVersion: '1.10.0',
  selectedUniqueIds: [MODEL_ID],
  executionTarget: {
    provider: 'temporal',
    adapter: 'postgres',
    targetName: 'analysis',
    credentialRef: 'env:DVT_DBT_EXECUTION_PROFILE',
  },
};

function buildContext(): AuthorizedCommandExecutionContext {
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
    authorizedAt: new Date('2026-07-15T00:00:00.000Z'),
  };
}

function buildProjection(overrides: Record<string, unknown> = {}): DbtProjectGraphProjection {
  return DbtProjectGraphProjectionSchema.parse({
    schemaVersion: 'dbt-project-graph-projection.v1',
    authorityBinding: {
      schemaVersion: 'canvas-authoring-authority-binding.v1',
      canvasId: 'analytics-canvas',
      authority: { kind: 'dbt-project-files', projectRoot: 'analytics' },
    },
    freshness: 'fresh',
    projectRevision: {
      projectRoot: 'analytics',
      projectName: 'analytics',
      contentSetSha256: CONTENT_SHA,
      analyzedAt: '2026-07-15T10:00:00.000Z',
      analyzerVersion: 'dvt-dbt-analyzer.v1',
      dbtVersion: '1.10.0',
    },
    analysisSha256: ANALYSIS_SHA,
    adapterType: 'postgres',
    nodes: [
      {
        uniqueId: 'source.analytics.raw.orders',
        resourceType: 'source',
        name: 'orders',
        packageName: 'analytics',
        sourceName: 'raw',
        columns: [],
        tags: [],
        visualEditability: { status: 'code_only', reasons: ['dbt-project-files'] },
      },
      {
        uniqueId: MODEL_ID,
        resourceType: 'model',
        name: 'orders',
        packageName: 'analytics',
        originalFilePath: 'models/orders.sql',
        materialized: 'view',
        columns: [],
        tags: [],
        visualEditability: { status: 'code_only', reasons: ['dbt-project-files'] },
      },
    ],
    edges: [
      {
        id: 'source-to-model',
        sourceUniqueId: 'source.analytics.raw.orders',
        targetUniqueId: MODEL_ID,
        relation: 'dependency',
      },
    ],
    diagnostics: [],
    executionTarget: PROVENANCE.executionTarget,
    capabilities: { canPreview: true, canRun: true, codeOnlyResourceCount: 2 },
    ...overrides,
  });
}

function buildService(projection = buildProjection()): {
  readonly graphDraftResolver: { readonly execute: ReturnType<typeof vi.fn> };
  readonly projectGraph: { readonly execute: ReturnType<typeof vi.fn> };
  readonly service: ResolveAuthorizedPreviewSelectionService;
} {
  const graphDraftResolver = { execute: vi.fn() };
  const projectGraph = { execute: vi.fn(async () => projection) };
  return {
    graphDraftResolver,
    projectGraph,
    service: new ResolveAuthorizedPreviewSelectionService({
      graphDraftResolver: graphDraftResolver as never,
      projectGraph: projectGraph as never,
    }),
  };
}

describe('ResolveAuthorizedPreviewSelectionService', () => {
  it('re-resolves dbt file Preview from the bound server projection without reading graph draft', async () => {
    const { service, projectGraph, graphDraftResolver } = buildService();
    const selection = parseExecutionSelection({ mode: 'explicit', nodeIds: [MODEL_ID] });

    await expect(
      service.execute(
        { selection, graphSource: GRAPH_SOURCE, provenance: PROVENANCE },
        buildContext()
      )
    ).resolves.toEqual({
      ok: true,
      value: {
        graphSource: GRAPH_SOURCE,
        nodeIds: [MODEL_ID],
        decisionScopeNodeIds: [MODEL_ID],
        requestedRootNodeIds: [MODEL_ID],
      },
    });
    expect(projectGraph.execute).toHaveBeenCalledWith({
      canvasId: 'analytics-canvas',
      scope: { tenantId: 'tenant-a', projectId: 'project-a', environmentId: 'env-a' },
    });
    expect(graphDraftResolver.execute).not.toHaveBeenCalled();
  });

  it('rejects stale dbt revision provenance before planner persistence', async () => {
    const { service } = buildService(
      buildProjection({
        projectRevision: {
          projectRoot: 'analytics',
          projectName: 'analytics',
          contentSetSha256: 'c'.repeat(64),
          analyzedAt: '2026-07-15T10:00:00.000Z',
          analyzerVersion: 'dvt-dbt-analyzer.v1',
          dbtVersion: '1.10.0',
        },
      })
    );

    await expect(
      service.execute(
        {
          selection: parseExecutionSelection({ mode: 'explicit', nodeIds: [MODEL_ID] }),
          graphSource: GRAPH_SOURCE,
          provenance: PROVENANCE,
        },
        buildContext()
      )
    ).resolves.toMatchObject({
      ok: false,
      rejection: {
        cause: 'dbt_project_preview_provenance_stale',
        findings: [
          {
            phase: 'preview-selection',
            requestId: 'req-1',
            remediationCode: 'REGENERATE_PREVIEW',
            evidence: expect.arrayContaining([
              expect.objectContaining({ evidenceCode: 'project_content_set_sha256' }),
            ]),
          },
        ],
      },
    });
  });

  it('rejects unsupported dbt selection modes with selection evidence', async () => {
    const { service, projectGraph } = buildService();

    const result = await service.execute(
      {
        selection: parseExecutionSelection({ mode: 'upstream', nodeIds: [MODEL_ID] }),
        graphSource: GRAPH_SOURCE,
        provenance: PROVENANCE,
      },
      buildContext()
    );

    expect(result).toMatchObject({
      ok: false,
      rejection: {
        cause: 'dbt_project_selection_mode_unsupported',
        findings: [
          {
            remediationCode: 'REDUCE_OR_REPAIR_SELECTION',
            evidence: expect.arrayContaining([
              expect.objectContaining({ evidenceCode: 'selection_mode' }),
            ]),
          },
        ],
      },
    });
    expect(projectGraph.execute).not.toHaveBeenCalled();
  });

  it('rejects selection provenance mismatches with both resource subjects', async () => {
    const { service, projectGraph } = buildService();

    const result = await service.execute(
      {
        selection: parseExecutionSelection({
          mode: 'explicit',
          nodeIds: ['model.analytics.other'],
        }),
        graphSource: GRAPH_SOURCE,
        provenance: PROVENANCE,
      },
      buildContext()
    );

    expect(result).toMatchObject({
      ok: false,
      rejection: {
        cause: 'dbt_project_selection_provenance_mismatch',
        findings: [
          {
            remediationCode: 'REGENERATE_PREVIEW',
            subjects: expect.arrayContaining([
              { kind: 'selection', id: MODEL_ID },
              { kind: 'selection', id: 'model.analytics.other' },
            ]),
          },
        ],
      },
    });
    expect(projectGraph.execute).not.toHaveBeenCalled();
  });

  it('reports transient project projection failure without fabricating plan identity', async () => {
    const { service, projectGraph } = buildService();
    projectGraph.execute.mockRejectedValueOnce(new Error('catalog unavailable'));

    const result = await service.execute(
      {
        selection: parseExecutionSelection({ mode: 'explicit', nodeIds: [MODEL_ID] }),
        graphSource: GRAPH_SOURCE,
        provenance: PROVENANCE,
      },
      buildContext()
    );

    expect(result).toMatchObject({
      ok: false,
      rejection: {
        cause: 'dbt_project_preview_projection_unavailable',
        findings: [
          {
            remediationCode: 'RETRY_PREVIEW',
            evidence: expect.arrayContaining([
              expect.objectContaining({
                evidenceCode: 'authoritative_project_projection_available',
              }),
            ]),
          },
        ],
      },
    });
    expect(JSON.stringify(result)).not.toMatch(/plan(Id|Version|Ref)/u);
  });

  it('rejects incomplete authorized scope without querying project authority', async () => {
    const { service, projectGraph } = buildService();
    const context = {
      ...buildContext(),
      scope: buildTenantAccessScope(TenantId.unsafe('tenant-a')),
    };

    const result = await service.execute(
      {
        selection: parseExecutionSelection({ mode: 'explicit', nodeIds: [MODEL_ID] }),
        graphSource: GRAPH_SOURCE,
        provenance: PROVENANCE,
      },
      context
    );

    expect(result).toMatchObject({
      ok: false,
      rejection: {
        cause: 'authorized_scope_incomplete',
        findings: [
          {
            remediationCode: 'REQUEST_AUTHORIZED_SCOPE',
            subjects: [{ kind: 'request', id: 'req-1' }],
          },
        ],
      },
    });
    expect(projectGraph.execute).not.toHaveBeenCalled();
  });

  it('reports target mismatch without exposing credential references', async () => {
    const { service } = buildService(
      buildProjection({
        executionTarget: {
          ...PROVENANCE.executionTarget,
          credentialRef: 'env:SERVER_SECRET_PROFILE',
        },
      })
    );

    const result = await service.execute(
      {
        selection: parseExecutionSelection({ mode: 'explicit', nodeIds: [MODEL_ID] }),
        graphSource: GRAPH_SOURCE,
        provenance: {
          ...PROVENANCE,
          executionTarget: {
            ...PROVENANCE.executionTarget,
            credentialRef: 'env:CLIENT_SECRET_PROFILE',
          },
        },
      },
      buildContext()
    );

    expect(result).toMatchObject({
      ok: false,
      rejection: {
        cause: 'dbt_project_preview_provenance_stale',
        findings: [
          {
            remediationCode: 'REGENERATE_PREVIEW',
            evidence: expect.arrayContaining([
              expect.objectContaining({ evidenceCode: 'execution_target_match' }),
            ]),
          },
        ],
      },
    });
    expect(JSON.stringify(result)).not.toContain('SERVER_SECRET_PROFILE');
    expect(JSON.stringify(result)).not.toContain('CLIENT_SECRET_PROFILE');
  });

  it('rejects browser graph semantics that differ from the authoritative dbt projection', async () => {
    const { service } = buildService();

    await expect(
      service.execute(
        {
          selection: parseExecutionSelection({ mode: 'explicit', nodeIds: [MODEL_ID] }),
          graphSource: {
            ...GRAPH_SOURCE,
            nodes: [{ ...GRAPH_SOURCE.nodes[0]!, stepKind: 'DBT_SNAPSHOT' }],
          },
          provenance: PROVENANCE,
        },
        buildContext()
      )
    ).resolves.toMatchObject({
      ok: false,
      rejection: {
        cause: 'dbt_project_graph_source_mismatch',
        findings: [
          {
            remediationCode: 'REGENERATE_PREVIEW',
            evidence: expect.arrayContaining([
              expect.objectContaining({
                evidenceCode: 'browser_graph_matches_authoritative_projection',
              }),
            ]),
          },
        ],
      },
    });
  });

  it('rejects a file-backed selection that names only a non-executable dbt resource', async () => {
    const { service } = buildService();
    const sourceId = 'source.analytics.raw.orders';

    await expect(
      service.execute(
        {
          selection: parseExecutionSelection({ mode: 'explicit', nodeIds: [sourceId] }),
          graphSource: GRAPH_SOURCE,
          provenance: { ...PROVENANCE, selectedUniqueIds: [sourceId] },
        },
        buildContext()
      )
    ).resolves.toMatchObject({
      ok: false,
      rejection: {
        cause: 'dbt_project_selected_resource_not_executable',
        findings: [
          {
            remediationCode: 'REDUCE_OR_REPAIR_SELECTION',
            subjects: expect.arrayContaining([{ kind: 'resource', id: sourceId }]),
          },
        ],
      },
    });
  });

  it('identifies the exact missing executable dependency', async () => {
    const parentId = 'model.analytics.parent';
    const baseProjection = buildProjection();
    const { service } = buildService(
      buildProjection({
        nodes: [
          ...baseProjection.nodes,
          {
            uniqueId: parentId,
            resourceType: 'model',
            name: 'parent',
            packageName: 'analytics',
            originalFilePath: 'models/parent.sql',
            materialized: 'view',
            columns: [],
            tags: [],
            visualEditability: { status: 'code_only', reasons: ['dbt-project-files'] },
          },
        ],
        edges: [
          ...baseProjection.edges,
          {
            id: 'parent-to-model',
            sourceUniqueId: parentId,
            targetUniqueId: MODEL_ID,
            relation: 'dependency',
          },
        ],
        capabilities: { canPreview: true, canRun: true, codeOnlyResourceCount: 3 },
      })
    );

    const result = await service.execute(
      {
        selection: parseExecutionSelection({ mode: 'explicit', nodeIds: [MODEL_ID] }),
        graphSource: GRAPH_SOURCE,
        provenance: PROVENANCE,
      },
      buildContext()
    );

    expect(result).toMatchObject({
      ok: false,
      rejection: {
        cause: 'dbt_project_dependency_gap',
        findings: [
          {
            remediationCode: 'REDUCE_OR_REPAIR_SELECTION',
            subjects: expect.arrayContaining([
              { kind: 'resource', id: MODEL_ID },
              { kind: 'resource', id: parentId },
            ]),
          },
        ],
      },
    });
  });

  it('delegates non-file Preview to protected graph-draft selection resolution', async () => {
    const graphDraftResult = {
      ok: true as const,
      value: {
        selection: parseExecutionSelection({ mode: 'explicit', nodeIds: ['transform'] }),
        nodeIds: ['transform'],
        decisionScopeNodeIds: ['transform'],
        edgeIds: [],
        executable: true,
        diagnostics: [],
      },
    };
    const graphDraftResolver = { execute: vi.fn(async () => graphDraftResult) };
    const service = new ResolveAuthorizedPreviewSelectionService({
      graphDraftResolver: graphDraftResolver as never,
      projectGraph: { execute: vi.fn() } as never,
    });
    const input = {
      selection: parseExecutionSelection({ mode: 'explicit', nodeIds: ['transform'] }),
      graphSource: {
        kind: 'generic-graph-v1' as const,
        sourceFamily: 'transformation-design-graph',
        sourceVersion: 'transformation-sql-first-v1',
        nodes: [{ nodeId: 'transform', stepKind: 'POSTGRES_SQL_TRANSFORM', dependsOn: [] }],
      },
    };

    await expect(service.execute(input, buildContext())).resolves.toEqual({
      ok: true,
      value: {
        graphSource: input.graphSource,
        nodeIds: ['transform'],
        decisionScopeNodeIds: ['transform'],
        requestedRootNodeIds: ['transform'],
      },
    });
    expect(graphDraftResolver.execute).toHaveBeenCalledWith(input, buildContext());
  });
});
