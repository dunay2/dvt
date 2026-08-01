import type { CanvasAuthoringAuthorityBinding } from '@dvt/contracts';

import type { DbtProjectAnalysis } from '../../src/application/ports/dbtProjectAnalysis.js';

export const SELECTED_MODEL_ANALYSIS_SCOPE = {
  tenantId: 'tenant-a',
  projectId: 'project-a',
  environmentId: 'env-a',
} as const;

export const SELECTED_MODEL_FILE_AUTHORITY: CanvasAuthoringAuthorityBinding = {
  schemaVersion: 'canvas-authoring-authority-binding.v1',
  canvasId: 'canvas-orders',
  authority: { kind: 'dbt-project-files', projectRoot: 'analytics' },
};

export function validSelectedModelProjectAnalysis(): DbtProjectAnalysis {
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
          revisionSha256: 'a'.repeat(64),
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
          sourceSha256: 'b'.repeat(64),
          classification: 'supported',
          targetUniqueId: 'source.analytics.raw.orders',
        },
        {
          regionId: 'region-dynamic',
          ownerUniqueIds: ['model.analytics.orders'],
          path: 'models/orders.sql',
          kind: 'jinja',
          range: { startByte: 60, endByte: 80 },
          sourceSha256: 'c'.repeat(64),
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
