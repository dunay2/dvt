/** Exercise the actual producer resolver and PostgreSQL parser; no label/Jinja SQL fallback. */
import {
  asSha256HexString,
  DbtProjectGraphProjectionSchema,
  DbtSelectedModelExecutionSqlSelectionSchema,
  type DbtProjectGraphProjection,
} from '@dvt/contracts';
import { sha256HexUtf8 } from '@dvt/crypto';
import { expect, it, vi, type Mock } from 'vitest';

import {
  AUTHORIZATION_ACTION,
  buildEnvironmentAccessScope,
  type AuthorizationAction,
  type RequestedScope,
} from '../../src/application/ports/accessDecision.js';
import type { AuthorizedExecutionContext } from '../../src/application/ports/authContract.js';
import type {
  AnalyzeDbtProjectInput,
  DbtProjectAnalysis,
} from '../../src/application/ports/dbtProjectAnalysis.js';
import { AnalyzeSelectedDbtModelQuery } from '../../src/application/services/analyzeSelectedDbtModelQuery.js';
import type { AuthorizeCommandScopeService } from '../../src/application/services/authorizeCommandScopeService.js';
import { ResolveDbtModelProducers } from '../../src/application/services/resolveDbtModelProducers.js';
import { projectSelectedDbtModelAnalysis } from '../../src/application/services/selectedDbtModelAnalysisProjection.js';
import {
  SelectedDbtModelAnalysisResolver,
  type ResolvedSelectedDbtModelAnalysis,
} from '../../src/application/services/selectedDbtModelAnalysisResolver.js';
import { projectSelectedDbtModelExecutionSql } from '../../src/application/services/selectedDbtModelExecutionSql.js';
import {
  TenantId,
  ProjectId,
  EnvironmentId,
  type AuthenticatedPrincipal,
} from '../../src/domain/auth/types.js';

const scope = { tenantId: 'tenant', projectId: 'project', environmentId: 'dev' };
const context: AuthorizedExecutionContext = {
  principal: {
    principalId: 'user',
    subjectId: 'user',
    issuer: 'test',
    audience: 'test',
    principalType: 'user',
    expiresAt: new Date('2030-01-01'),
    rawScopes: [],
    assertedTenantIds: ['tenant'],
    assertedProjectIds: ['project'],
  },
  scope: buildEnvironmentAccessScope(
    TenantId.unsafe('tenant'),
    ProjectId.unsafe('project'),
    EnvironmentId.unsafe('dev')
  ),
  action: AUTHORIZATION_ACTION.workspaceGraphDraftView,
  requestId: 'request',
  authorizedAt: new Date('2026-11-25'),
};
const binding = {
  schemaVersion: 'canvas-authoring-authority-binding.v1',
  canvasId: 'files',
  authority: { kind: 'dbt-project-files', projectRoot: '.' },
} as const;
const uniqueId = 'model.demo.orders';

function nativeAnalysisFixture(): DbtProjectAnalysis {
  return {
    status: 'valid',
    adapterType: 'postgres',
    analysisSha256: 'b'.repeat(64),
    projectRevision: {
      projectRoot: '.',
      projectName: 'demo',
      dbtVersion: '1.10.0',
      contentSetSha256: 'a'.repeat(64),
      analyzedAt: '2026-11-25T00:00:00.000Z',
      analyzerVersion: 'native',
    },
    resources: [
      {
        uniqueId,
        resourceType: 'model',
        name: 'orders',
        packageName: 'demo',
        materialized: 'ephemeral',
        columns: [{ name: 'id', dataType: 'integer' }],
        tags: [],
        codeOnlyReasons: [],
        compiledSql: 'SELECT 1 AS id',
      },
    ],
    dependencies: [],
    diagnostics: [],
    semanticEvidence: {
      files: [],
      regions: [],
      diagnostics: [],
      identities: [
        {
          uniqueId,
          resourceType: 'model',
          name: 'orders',
          packageName: 'demo',
          dependencyUniqueIds: [],
          macroUniqueIds: [],
        },
      ],
    },
  };
}

function projectionFixture(nativeAnalysis: DbtProjectAnalysis): DbtProjectGraphProjection {
  return DbtProjectGraphProjectionSchema.parse({
    schemaVersion: 'dbt-project-graph-projection.v1',
    adapterType: 'postgres',
    authorityBinding: binding,
    freshness: 'fresh',
    projectRevision: nativeAnalysis.projectRevision,
    analysisSha256: nativeAnalysis.analysisSha256,
    nodes: [projectedModelFixture()],
    edges: [],
    diagnostics: [],
    capabilities: { canPreview: true, canRun: true, codeOnlyResourceCount: 1 },
    executionTarget: {
      provider: 'temporal',
      adapter: 'postgres',
      targetName: 'dev',
      connectionRef: {
        schemaVersion: 'connection-ref.v1',
        connectionId: 'warehouse',
        provider: 'postgres',
      },
      resolutionSource: 'environment-default',
      credentialRef: 'env:DBT_PROFILES_DIR',
    },
  });
}

function projectedModelFixture(): DbtProjectGraphProjection['nodes'][number] {
  return {
    uniqueId,
    resourceType: 'model',
    name: 'orders',
    packageName: 'demo',
    materialized: 'ephemeral',
    columns: [{ name: 'id', dataType: 'integer' }],
    tags: [],
    visualEditability: { status: 'code_only', reasons: ['files'] },
  };
}

function authorizedFixture(): Pick<AuthorizeCommandScopeService, 'authorize'> {
  return {
    async authorize<TAction extends AuthorizationAction>(
      principal: AuthenticatedPrincipal,
      requestedScope: RequestedScope<TAction>,
      requestId: string
    ): Promise<{ readonly ok: true; readonly context: AuthorizedExecutionContext<TAction> }> {
      return {
        ok: true,
        context: {
          ...context,
          principal,
          scope: requestedScope,
          action: requestedScope.action,
          requestId,
        },
      };
    },
  };
}

interface Fixture {
  nativeAnalysis: DbtProjectAnalysis;
  projection: DbtProjectGraphProjection;
  analyze: Mock<(input: AnalyzeDbtProjectInput) => Promise<DbtProjectAnalysis>>;
  deps: {
    projectGraph: { projectValidatedAnalysis: Mock<() => Promise<DbtProjectGraphProjection>> };
    producers: ResolveDbtModelProducers;
  };
  resolved: ResolvedSelectedDbtModelAnalysis;
}

function fixture(): Fixture {
  const nativeAnalysis = nativeAnalysisFixture();
  const projection = projectionFixture(nativeAnalysis);
  const analyze = vi.fn(async (_input: AnalyzeDbtProjectInput) => nativeAnalysis);
  const projectValidatedAnalysis = vi.fn(async () => projection);
  const producers = new ResolveDbtModelProducers({
    analyzer: { analyze },
    projectGraph: { projectValidatedAnalysis },
    authorityPolicy: { resolve: async () => binding },
    authorizer: authorizedFixture(),
  });
  return {
    nativeAnalysis,
    projection,
    analyze,
    deps: { projectGraph: { projectValidatedAnalysis }, producers },
    resolved: {
      authorityBinding: binding,
      nativeAnalysis,
      selectedAnalysis: projectSelectedDbtModelAnalysis({
        authorityBinding: binding,
        analysis: nativeAnalysis,
        selectedUniqueId: uniqueId,
      }),
    },
  };
}

function request(): Parameters<typeof projectSelectedDbtModelExecutionSql>[1] {
  return {
    scope,
    canvasId: binding.canvasId,
    selectedUniqueId: uniqueId,
    executionSql: DbtSelectedModelExecutionSqlSelectionSchema.parse({
      expectedProjectRevision: 'a'.repeat(64),
    }),
  };
}

it.each([true, false])(
  'reuses one producer compile for a file-only ephemeral Model with pinned revision: %s',
  async (pinned) => {
    const f = fixture();
    const input = { ...request(), executionSql: pinned ? request().executionSql : {} };
    const result = await projectSelectedDbtModelExecutionSql(f.deps, input, f.resolved, context);
    expect(result.reference).toMatchObject({
      canvasId: 'files',
      uniqueId,
      connectionRef: { connectionId: 'warehouse' },
      fields: [{ name: 'id', dataType: 'integer' }],
    });
    expect(result.sql).toContain('external_model');
    expect(result.sql).toContain('SELECT 1 AS id');
    expect(result.sqlSha256).toBe(sha256HexUtf8(result.sql));
    expect(result.projectRevisionSha256).toBe('a'.repeat(64));
    expect(result.analysisSha256).toBe('b'.repeat(64));
    expect(f.analyze).toHaveBeenCalledExactlyOnceWith({
      scope,
      projectRoot: '.',
      operation: { kind: 'compile', selectors: ['demo.orders'] },
    });
  }
);

it('resolves analysis once and compiles once inside a single selected-Model query', async () => {
  const f = fixture();
  const query = new AnalyzeSelectedDbtModelQuery(
    new SelectedDbtModelAnalysisResolver({
      analyzer: { analyze: f.analyze },
      authorityPolicy: { resolve: async () => binding },
    }),
    f.deps
  );
  const result = await query.execute({ ...request(), executionSql: {} }, context);
  expect(result.executionSql?.sql).toContain('SELECT 1 AS id');
  expect(f.analyze).toHaveBeenCalledTimes(2);
  expect(f.analyze).toHaveBeenNthCalledWith(1, { scope, projectRoot: '.' });
  expect(f.analyze).toHaveBeenNthCalledWith(2, {
    scope,
    projectRoot: '.',
    operation: { kind: 'compile', selectors: ['demo.orders'] },
  });
});

it('rejects stale captured project revision before compiling or projecting', async () => {
  const f = fixture();
  await expect(
    projectSelectedDbtModelExecutionSql(
      f.deps,
      {
        ...request(),
        executionSql: { expectedProjectRevision: asSha256HexString('c'.repeat(64)) },
      },
      f.resolved,
      context
    )
  ).rejects.toMatchObject({ code: 'stale_context' });
  expect(f.analyze).not.toHaveBeenCalled();
  expect(f.deps.projectGraph.projectValidatedAnalysis).not.toHaveBeenCalled();
});

it('refuses an untyped output instead of inventing Model columns', async () => {
  const f = fixture();
  delete f.projection.nodes[0]!.columns[0]!.dataType;
  await expect(
    projectSelectedDbtModelExecutionSql(f.deps, request(), f.resolved, context)
  ).rejects.toMatchObject({ code: 'input_unavailable' });
  expect(f.analyze).not.toHaveBeenCalled();
});

it('rejects a project that changes during producer resolution', async () => {
  const f = fixture();
  f.deps.projectGraph.projectValidatedAnalysis
    .mockResolvedValueOnce(f.projection)
    .mockResolvedValue({
      ...f.projection,
      projectRevision: {
        ...f.projection.projectRevision,
        contentSetSha256: asSha256HexString('c'.repeat(64)),
      },
    });
  await expect(
    projectSelectedDbtModelExecutionSql(f.deps, request(), f.resolved, context)
  ).rejects.toMatchObject({ code: 'stale_context' });
});
