/**
 * Owned concern: provide fresh authoritative Preview inputs and explicit port spies; no dbt semantics.
 * @decision Share fixed contract inputs and explicit port spies without implementing analysis.
 * @consequence Each suite still supplies and asserts its own authority or compiler behavior.
 */
import {
  DbtProjectGraphProjectionSchema,
  asSha256HexString,
  type DbtProjectGraphProjection,
  type DbtProjectFilesProvenance,
  type GenericGraphSourceV1,
} from '@dvt/contracts';
import { vi, type Mock } from 'vitest';

import {
  AUTHORIZATION_ACTION,
  buildEnvironmentAccessScope,
} from '../../../src/application/ports/accessDecision.js';
import type { AuthorizedCommandExecutionContext } from '../../../src/application/ports/authContract.js';
import { ResolveAuthorizedPreviewSelectionService } from '../../../src/application/services/resolveAuthorizedPreviewSelection.js';
import { EnvironmentId, ProjectId, TenantId } from '../../../src/domain/auth/types.js';

export const MODEL_ID = 'model.analytics.orders';
const CONTENT_SHA = asSha256HexString('a'.repeat(64));
const ANALYSIS_SHA = asSha256HexString('b'.repeat(64));

export const GRAPH_SOURCE: GenericGraphSourceV1 = {
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

export const PROVENANCE: DbtProjectFilesProvenance = {
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
    connectionRef: {
      schemaVersion: 'connection-ref.v1',
      connectionId: 'warehouse-analysis',
      provider: 'postgres',
    },
    resolutionSource: 'environment-default',
    credentialRef: 'env:DVT_DBT_EXECUTION_PROFILE',
  },
};

export function buildContext(): AuthorizedCommandExecutionContext {
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

export function buildProjection(
  overrides: Record<string, unknown> = {}
): DbtProjectGraphProjection {
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

type SelectionDependencies = ConstructorParameters<
  typeof ResolveAuthorizedPreviewSelectionService
>[0];

export function buildService(projection = buildProjection()): {
  readonly graphDraftResolver: {
    readonly execute: Mock<SelectionDependencies['graphDraftResolver']['execute']>;
  };
  readonly dvtPreview: {
    readonly execute: Mock<
      NonNullable<SelectionDependencies['dvtPreviewSelectionResolver']>['execute']
    >;
  };
  readonly projectGraph: {
    readonly execute: Mock<SelectionDependencies['projectGraph']['execute']>;
  };
  readonly dbtCompilation: {
    readonly execute: Mock<SelectionDependencies['dbtCompilation']['execute']>;
  };
  readonly service: ResolveAuthorizedPreviewSelectionService;
} {
  const graphDraftResolver = {
    execute: vi.fn<SelectionDependencies['graphDraftResolver']['execute']>(),
  };
  const dvtPreview = {
    execute: vi.fn<NonNullable<SelectionDependencies['dvtPreviewSelectionResolver']>['execute']>(),
  };
  const projectGraph = {
    execute: vi
      .fn<SelectionDependencies['projectGraph']['execute']>()
      .mockResolvedValue(projection),
  };
  const dbtCompilation = {
    execute: vi
      .fn<SelectionDependencies['dbtCompilation']['execute']>()
      .mockResolvedValue({ ok: true }),
  };
  return {
    graphDraftResolver,
    dvtPreview,
    projectGraph,
    dbtCompilation,
    service: new ResolveAuthorizedPreviewSelectionService({
      graphDraftResolver,
      dvtPreviewSelectionResolver: dvtPreview,
      projectGraph,
      dbtCompilation,
    }),
  };
}
