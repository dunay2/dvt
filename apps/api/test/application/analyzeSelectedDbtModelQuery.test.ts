import type { CanvasAuthoringAuthorityBinding } from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import type { DbtProjectAnalysis } from '../../src/application/ports/dbtProjectAnalysis.js';
import { DbtProjectFileAuthorityRequiredError } from '../../src/application/ports/dbtProjectImport.js';
import { AnalyzeSelectedDbtModelQuery } from '../../src/application/services/analyzeSelectedDbtModelQuery.js';

const SCOPE = {
  tenantId: 'tenant-a',
  projectId: 'project-a',
  environmentId: 'env-a',
} as const;

const FILE_AUTHORITY: CanvasAuthoringAuthorityBinding = {
  schemaVersion: 'canvas-authoring-authority-binding.v1',
  canvasId: 'canvas-orders',
  authority: { kind: 'dbt-project-files', projectRoot: 'analytics' },
};

describe('AnalyzeSelectedDbtModelQuery', () => {
  it('projects one deterministic selected-model analysis from native evidence', async () => {
    const analysis = validAnalysis();
    const query = buildQuery(analysis);

    const first = await query.execute({
      scope: SCOPE,
      canvasId: FILE_AUTHORITY.canvasId,
      selectedUniqueId: 'model.analytics.orders',
    });
    const second = await buildQuery({
      ...analysis,
      projectRevision: {
        ...analysis.projectRevision,
        analyzedAt: '2026-08-01T11:00:00.000Z',
      },
    }).execute({
      scope: SCOPE,
      canvasId: FILE_AUTHORITY.canvasId,
      selectedUniqueId: 'model.analytics.orders',
    });

    expect(first.status).toBe('ready');
    expect(first.identities).toEqual([
      expect.objectContaining({
        uniqueId: 'macro.analytics.normalize_order',
        relationToSelection: 'macro',
      }),
      expect.objectContaining({
        uniqueId: 'model.analytics.orders',
        relationToSelection: 'selected',
      }),
      expect.objectContaining({
        uniqueId: 'source.analytics.raw.orders',
        relationToSelection: 'upstream',
      }),
      expect.objectContaining({
        uniqueId: 'test.analytics.not_null_orders_order_id',
        relationToSelection: 'test',
      }),
    ]);
    expect(first.dependencies).toEqual([
      {
        sourceUniqueId: 'macro.analytics.normalize_order',
        targetUniqueId: 'model.analytics.orders',
        relation: 'macro',
      },
      {
        sourceUniqueId: 'model.analytics.orders',
        targetUniqueId: 'test.analytics.not_null_orders_order_id',
        relation: 'test_target',
      },
      {
        sourceUniqueId: 'source.analytics.raw.orders',
        targetUniqueId: 'model.analytics.orders',
        relation: 'dependency',
        regionId: 'region-source-orders',
      },
    ]);
    expect(first.regions).toEqual([
      expect.objectContaining({
        regionId: 'region-source-orders',
        classification: 'supported',
        targetUniqueId: 'source.analytics.raw.orders',
      }),
      expect.objectContaining({
        regionId: 'region-dynamic',
        classification: 'code_only',
        reasonCode: 'dbt_jinja_dynamic_argument',
      }),
    ]);
    expect(first.files).toEqual(analysis.semanticEvidence.files);
    expect(second.selectedAnalysisSha256).toBe(first.selectedAnalysisSha256);
    expect(second.capabilitySet.capabilitySetSha256).toBe(first.capabilitySet.capabilitySetSha256);
  });

  it('refuses a missing or non-model selection with a typed diagnostic', async () => {
    const result = await buildQuery(validAnalysis()).execute({
      scope: SCOPE,
      canvasId: FILE_AUTHORITY.canvasId,
      selectedUniqueId: 'model.analytics.missing',
    });

    expect(result.status).toBe('refused');
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: 'dbt_selected_model_not_found',
        severity: 'error',
        subject: {
          kind: 'resource',
          uniqueId: 'model.analytics.missing',
        },
      }),
    ]);
  });

  it('returns unavailable without inventing semantic evidence when native analysis is unavailable', async () => {
    const result = await buildQuery({
      ...validAnalysis(),
      status: 'unavailable',
      resources: [],
      dependencies: [],
      semanticEvidence: { files: [], identities: [], regions: [], diagnostics: [] },
      diagnostics: [
        {
          code: 'dbt_analyzer_unavailable',
          severity: 'error',
          message: 'The server-managed dbt analyzer process is unavailable.',
        },
      ],
    }).execute({
      scope: SCOPE,
      canvasId: FILE_AUTHORITY.canvasId,
      selectedUniqueId: 'model.analytics.orders',
    });

    expect(result.status).toBe('unavailable');
    expect(result.identities).toEqual([]);
    expect(result.regions).toEqual([]);
    expect(result.diagnostics[0]).toEqual(
      expect.objectContaining({
        code: 'dbt_analyzer_unavailable',
        subject: { kind: 'project' },
      })
    );
  });

  it('rejects graph-draft authority before invoking native analysis', async () => {
    const analyze = vi.fn();
    const query = new AnalyzeSelectedDbtModelQuery({
      analyzer: { analyze },
      authorityPolicy: {
        resolve: vi.fn().mockResolvedValue({
          ...FILE_AUTHORITY,
          authority: { kind: 'graph-draft' },
        }),
      },
    });

    await expect(
      query.execute({
        scope: SCOPE,
        canvasId: FILE_AUTHORITY.canvasId,
        selectedUniqueId: 'model.analytics.orders',
      })
    ).rejects.toBeInstanceOf(DbtProjectFileAuthorityRequiredError);
    expect(analyze).not.toHaveBeenCalled();
  });
});

function buildQuery(analysis: DbtProjectAnalysis): AnalyzeSelectedDbtModelQuery {
  return new AnalyzeSelectedDbtModelQuery({
    analyzer: { analyze: vi.fn().mockResolvedValue(analysis) },
    authorityPolicy: { resolve: vi.fn().mockResolvedValue(FILE_AUTHORITY) },
  });
}

function validAnalysis(): DbtProjectAnalysis {
  const modelFileRevision = 'a'.repeat(64);
  const sourceRegionSha = 'b'.repeat(64);
  const dynamicRegionSha = 'c'.repeat(64);
  return {
    status: 'valid',
    adapterType: 'postgres',
    projectRevision: {
      projectRoot: 'analytics',
      projectName: 'analytics',
      contentSetSha256: 'd'.repeat(64),
      analyzedAt: '2026-08-01T10:00:00.000Z',
      analyzerVersion: 'dvt-dbt-analyzer.v1',
      dbtVersion: '1.10.0',
    },
    analysisSha256: 'e'.repeat(64),
    resources: [],
    dependencies: [
      {
        sourceUniqueId: 'source.analytics.raw.orders',
        targetUniqueId: 'model.analytics.orders',
        relation: 'dependency',
      },
      {
        sourceUniqueId: 'model.analytics.orders',
        targetUniqueId: 'test.analytics.not_null_orders_order_id',
        relation: 'test_target',
      },
    ],
    diagnostics: [],
    semanticEvidence: {
      files: [
        {
          path: 'dbt_project.yml',
          revisionSha256: 'f'.repeat(64),
          byteLength: 64,
          kind: 'project_config',
        },
        {
          path: 'models/orders.sql',
          revisionSha256: modelFileRevision,
          byteLength: 100,
          kind: 'model',
        },
      ],
      identities: [
        {
          uniqueId: 'macro.analytics.normalize_order',
          resourceType: 'macro',
          name: 'normalize_order',
          packageName: 'analytics',
          originalFilePath: 'macros/normalize_order.sql',
          dependencyUniqueIds: [],
          macroUniqueIds: [],
        },
        {
          uniqueId: 'model.analytics.orders',
          resourceType: 'model',
          name: 'orders',
          packageName: 'analytics',
          originalFilePath: 'models/orders.sql',
          dependencyUniqueIds: ['source.analytics.raw.orders'],
          macroUniqueIds: ['macro.analytics.normalize_order'],
        },
        {
          uniqueId: 'source.analytics.raw.orders',
          resourceType: 'source',
          name: 'orders',
          sourceName: 'raw',
          packageName: 'analytics',
          originalFilePath: 'models/sources.yml',
          dependencyUniqueIds: [],
          macroUniqueIds: [],
        },
        {
          uniqueId: 'test.analytics.not_null_orders_order_id',
          resourceType: 'test',
          name: 'not_null_orders_order_id',
          packageName: 'analytics',
          originalFilePath: 'models/schema.yml',
          dependencyUniqueIds: ['model.analytics.orders'],
          macroUniqueIds: [],
        },
      ],
      regions: [
        {
          regionId: 'region-source-orders',
          ownerUniqueIds: ['model.analytics.orders'],
          path: 'models/orders.sql',
          kind: 'source',
          range: { startByte: 20, endByte: 50 },
          sourceSha256: sourceRegionSha,
          classification: 'supported',
          targetUniqueId: 'source.analytics.raw.orders',
        },
        {
          regionId: 'region-dynamic',
          ownerUniqueIds: ['model.analytics.orders'],
          path: 'models/orders.sql',
          kind: 'jinja',
          range: { startByte: 60, endByte: 80 },
          sourceSha256: dynamicRegionSha,
          classification: 'code_only',
          reasonCode: 'dbt_jinja_dynamic_argument',
        },
      ],
      diagnostics: [
        {
          code: 'dbt_semantic_region_code_only',
          severity: 'warning',
          message: 'The dbt region is preserved as code-only.',
          subject: {
            kind: 'region',
            path: 'models/orders.sql',
            regionId: 'region-dynamic',
          },
          evidence: {
            path: 'models/orders.sql',
            range: { startByte: 60, endByte: 80 },
          },
        },
      ],
    },
  };
}
