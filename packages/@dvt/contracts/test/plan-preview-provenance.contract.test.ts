import { describe, expect, it } from 'vitest';

import {
  DbtProjectGraphProjectionSchema,
  PLAN_PREVIEW_PROVENANCE_KIND,
  PlanPreviewProvenanceSchema,
} from '../src/index.js';

const FILE_AUTHORITY = {
  schemaVersion: 'canvas-authoring-authority-binding.v1',
  canvasId: 'canvas-orders',
  authority: { kind: 'dbt-project-files', projectRoot: 'analytics/orders' },
} as const;

const EXECUTION_TARGET = {
  provider: 'temporal',
  adapter: 'postgres',
  targetName: 'production',
  credentialRef: 'env:DBT_PROFILES_DIR',
} as const;

const DBT_PROVENANCE = {
  kind: PLAN_PREVIEW_PROVENANCE_KIND.dbtProjectFiles,
  canvasId: 'canvas-orders',
  projectRoot: 'analytics/orders',
  contentSetSha256: 'a'.repeat(64),
  analysisSha256: 'b'.repeat(64),
  dbtVersion: '1.10.0',
  selectedUniqueIds: ['model.analytics.orders'],
  executionTarget: EXECUTION_TARGET,
} as const;

describe('PlanPreviewProvenance.v1', () => {
  it('accepts file-authoritative dbt provenance without credential material', () => {
    expect(PlanPreviewProvenanceSchema.parse(DBT_PROVENANCE)).toEqual(DBT_PROVENANCE);
  });

  it('accepts transformation provenance only under its explicit discriminator', () => {
    const provenance = {
      kind: PLAN_PREVIEW_PROVENANCE_KIND.transformationGitArtifacts,
      graphArtifact: {
        repo: 'org/repo',
        path: 'graphs/orders.yml',
        ref: 'refs/heads/main',
        commitSha: 'commit-graph',
        contentSha256: 'c'.repeat(64),
      },
      sqlArtifact: {
        repo: 'org/repo',
        path: 'models/orders.sql',
        ref: 'refs/heads/main',
        commitSha: 'commit-sql',
        contentSha256: 'd'.repeat(64),
      },
    } as const;

    expect(PlanPreviewProvenanceSchema.parse(provenance)).toEqual(provenance);
  });

  it.each([
    (({ canvasId: _canvasId, ...provenance }) => provenance)(DBT_PROVENANCE),
    { ...DBT_PROVENANCE, projectRoot: '../analytics' },
    { ...DBT_PROVENANCE, selectedUniqueIds: [] },
    { ...DBT_PROVENANCE, selectedUniqueIds: ['model.analytics.orders', 'model.analytics.orders'] },
    {
      ...DBT_PROVENANCE,
      executionTarget: { ...EXECUTION_TARGET, credentialRef: 'postgres://user:secret@db' },
    },
    {
      ...DBT_PROVENANCE,
      executionTarget: { ...EXECUTION_TARGET, password: 'secret' },
    },
  ])('rejects unsafe or secret-bearing dbt provenance', (provenance) => {
    expect(PlanPreviewProvenanceSchema.safeParse(provenance).success).toBe(false);
  });

  it('requires executable dbt projections to expose a matching server target', () => {
    const baseProjection = {
      schemaVersion: 'dbt-project-graph-projection.v1',
      authorityBinding: FILE_AUTHORITY,
      freshness: 'fresh',
      projectRevision: {
        projectRoot: 'analytics/orders',
        projectName: 'analytics',
        contentSetSha256: 'a'.repeat(64),
        analyzedAt: '2026-07-15T10:00:00.000Z',
        analyzerVersion: 'dvt-dbt-analyzer.v1',
        dbtVersion: '1.10.0',
      },
      analysisSha256: 'b'.repeat(64),
      adapterType: 'postgres',
      nodes: [],
      edges: [],
      diagnostics: [],
      executionTarget: EXECUTION_TARGET,
      capabilities: { canPreview: true, canRun: true, codeOnlyResourceCount: 0 },
    } as const;

    expect(DbtProjectGraphProjectionSchema.parse(baseProjection)).toEqual(baseProjection);
    expect(
      DbtProjectGraphProjectionSchema.safeParse({
        ...baseProjection,
        executionTarget: undefined,
      }).success
    ).toBe(false);
    expect(
      DbtProjectGraphProjectionSchema.safeParse({
        ...baseProjection,
        executionTarget: { ...EXECUTION_TARGET, adapter: 'snowflake' },
      }).success
    ).toBe(false);
  });
});
