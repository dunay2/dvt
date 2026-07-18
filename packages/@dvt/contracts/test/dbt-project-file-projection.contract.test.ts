import { describe, expect, it } from 'vitest';

import {
  CanvasAuthoringAuthorityBindingSchema,
  DbtProjectGraphProjectionSchema,
} from '../src/index.js';

const FILE_AUTHORITY = {
  schemaVersion: 'canvas-authoring-authority-binding.v1',
  canvasId: 'canvas-dbt-orders',
  authority: {
    kind: 'dbt-project-files',
    projectRoot: 'analytics/orders',
  },
} as const;

const PROJECT_REVISION = {
  projectRoot: 'analytics/orders',
  projectName: 'analytics',
  contentSetSha256: 'a'.repeat(64),
  analyzedAt: '2026-07-13T10:00:00.000Z',
  analyzerVersion: 'dvt-dbt-analyzer.v1',
  dbtVersion: '1.10.0',
} as const;

describe('CanvasAuthoringAuthorityBinding.v1', () => {
  it('accepts exactly one graph-draft authority', () => {
    expect(
      CanvasAuthoringAuthorityBindingSchema.parse({
        schemaVersion: 'canvas-authoring-authority-binding.v1',
        canvasId: 'canvas-graph',
        authority: { kind: 'graph-draft' },
      })
    ).toEqual({
      schemaVersion: 'canvas-authoring-authority-binding.v1',
      canvasId: 'canvas-graph',
      authority: { kind: 'graph-draft' },
    });
  });

  it('accepts a file authority with a workspace-relative project root', () => {
    expect(CanvasAuthoringAuthorityBindingSchema.parse(FILE_AUTHORITY)).toEqual(FILE_AUTHORITY);
  });

  it.each([
    '',
    '/analytics',
    '../analytics',
    'analytics/../other',
    'C:/analytics',
    'analytics\\orders',
  ])('rejects unsafe project root %s', (projectRoot) => {
    expect(
      CanvasAuthoringAuthorityBindingSchema.safeParse({
        ...FILE_AUTHORITY,
        authority: { kind: 'dbt-project-files', projectRoot },
      }).success
    ).toBe(false);
  });

  it('rejects projectRoot on graph-draft authority instead of accepting shadow state', () => {
    expect(
      CanvasAuthoringAuthorityBindingSchema.safeParse({
        schemaVersion: 'canvas-authoring-authority-binding.v1',
        canvasId: 'canvas-graph',
        authority: { kind: 'graph-draft', projectRoot: 'analytics' },
      }).success
    ).toBe(false);
  });
});

describe('DbtProjectGraphProjection.v1', () => {
  it('accepts a deterministic read-only source-to-model projection', () => {
    const projection = {
      schemaVersion: 'dbt-project-graph-projection.v1',
      authorityBinding: FILE_AUTHORITY,
      freshness: 'fresh',
      projectRevision: PROJECT_REVISION,
      analysisSha256: 'b'.repeat(64),
      adapterType: 'postgres',
      nodes: [
        {
          uniqueId: 'source.analytics.raw.orders',
          resourceType: 'source',
          name: 'orders',
          packageName: 'analytics',
          originalFilePath: 'models/sources.yml',
          sourceName: 'raw',
          columns: [{ name: 'order_id', dataType: 'integer' }],
          tags: ['raw'],
          visualEditability: {
            status: 'code_only',
            reasons: ['phase_two_read_only_projection'],
          },
        },
        {
          uniqueId: 'model.analytics.orders',
          resourceType: 'model',
          name: 'orders',
          packageName: 'analytics',
          originalFilePath: 'models/orders.sql',
          materialized: 'table',
          columns: [],
          tags: [],
          visualEditability: {
            status: 'code_only',
            reasons: ['phase_two_read_only_projection'],
          },
        },
      ],
      edges: [
        {
          id: 'source.analytics.raw.orders->model.analytics.orders',
          sourceUniqueId: 'source.analytics.raw.orders',
          targetUniqueId: 'model.analytics.orders',
          relation: 'dependency',
        },
      ],
      diagnostics: [],
      executionTarget: {
        provider: 'temporal',
        adapter: 'postgres',
        targetName: 'production',
        credentialRef: 'env:DBT_PROFILES_DIR',
      },
      capabilities: {
        canPreview: true,
        canRun: true,
        codeOnlyResourceCount: 2,
      },
    } as const;

    expect(DbtProjectGraphProjectionSchema.parse(projection)).toEqual(projection);
  });

  it('accepts invalid analysis without pretending it is executable', () => {
    const result = DbtProjectGraphProjectionSchema.parse({
      schemaVersion: 'dbt-project-graph-projection.v1',
      authorityBinding: FILE_AUTHORITY,
      freshness: 'invalid',
      projectRevision: PROJECT_REVISION,
      analysisSha256: 'c'.repeat(64),
      nodes: [],
      edges: [],
      diagnostics: [
        {
          code: 'dbt_project_invalid',
          severity: 'error',
          message: 'Model references a missing source.',
          path: 'models/orders.sql',
        },
      ],
      capabilities: {
        canPreview: false,
        canRun: false,
        codeOnlyResourceCount: 0,
      },
    });

    expect(result.freshness).toBe('invalid');
    expect(result.capabilities.canRun).toBe(false);
  });

  it('rejects duplicate dbt unique ids', () => {
    const node = {
      uniqueId: 'model.analytics.orders',
      resourceType: 'model',
      name: 'orders',
      packageName: 'analytics',
      columns: [],
      tags: [],
      visualEditability: {
        status: 'code_only',
        reasons: ['phase_two_read_only_projection'],
      },
    } as const;

    expect(
      DbtProjectGraphProjectionSchema.safeParse({
        schemaVersion: 'dbt-project-graph-projection.v1',
        authorityBinding: FILE_AUTHORITY,
        freshness: 'fresh',
        projectRevision: PROJECT_REVISION,
        analysisSha256: 'd'.repeat(64),
        nodes: [node, node],
        edges: [],
        diagnostics: [],
        capabilities: { canPreview: true, canRun: true, codeOnlyResourceCount: 2 },
      }).success
    ).toBe(false);
  });

  it('rejects edges whose endpoints are absent from the projection', () => {
    expect(
      DbtProjectGraphProjectionSchema.safeParse({
        schemaVersion: 'dbt-project-graph-projection.v1',
        authorityBinding: FILE_AUTHORITY,
        freshness: 'fresh',
        projectRevision: PROJECT_REVISION,
        analysisSha256: 'e'.repeat(64),
        nodes: [],
        edges: [
          {
            id: 'missing->also-missing',
            sourceUniqueId: 'model.analytics.missing',
            targetUniqueId: 'model.analytics.also_missing',
            relation: 'dependency',
          },
        ],
        diagnostics: [],
        capabilities: { canPreview: true, canRun: true, codeOnlyResourceCount: 0 },
      }).success
    ).toBe(false);
  });

  it('rejects executable capabilities for invalid or unavailable projections', () => {
    expect(
      DbtProjectGraphProjectionSchema.safeParse({
        schemaVersion: 'dbt-project-graph-projection.v1',
        authorityBinding: FILE_AUTHORITY,
        freshness: 'unavailable',
        projectRevision: PROJECT_REVISION,
        analysisSha256: 'f'.repeat(64),
        nodes: [],
        edges: [],
        diagnostics: [],
        capabilities: { canPreview: true, canRun: true, codeOnlyResourceCount: 0 },
      }).success
    ).toBe(false);
  });
});
