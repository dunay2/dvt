import { describe, expect, it } from 'vitest';

import { projectDbtManifest } from '../../../src/infrastructure/dbt/dbtManifestProjection.js';

describe('projectDbtManifest', () => {
  it('projects supported resources and reports unsupported graph resources', () => {
    const projection = projectDbtManifest({
      metadata: { dbt_version: '1.10.0' },
      nodes: {
        'model.analytics.orders': {
          unique_id: 'model.analytics.orders',
          resource_type: 'model',
          name: 'orders',
          package_name: 'analytics',
          depends_on: { nodes: ['source.analytics.raw.orders'] },
          columns: {},
          tags: [],
        },
        'analysis.analytics.audit': {
          unique_id: 'analysis.analytics.audit',
          resource_type: 'analysis',
          name: 'audit',
          package_name: 'analytics',
          depends_on: { nodes: ['model.analytics.orders'] },
        },
      },
      sources: {
        'source.analytics.raw.orders': {
          unique_id: 'source.analytics.raw.orders',
          resource_type: 'source',
          name: 'orders',
          source_name: 'raw',
          package_name: 'analytics',
          depends_on: { nodes: [] },
          columns: {},
          tags: [],
        },
      },
      exposures: {},
      metrics: {},
    });

    expect(projection.resources.map((resource) => resource.uniqueId)).toEqual([
      'model.analytics.orders',
      'source.analytics.raw.orders',
    ]);
    expect(projection.dependencies).toEqual([
      {
        sourceUniqueId: 'source.analytics.raw.orders',
        targetUniqueId: 'model.analytics.orders',
        relation: 'dependency',
      },
    ]);
    expect(projection.diagnostics).toContainEqual({
      code: 'dbt_resource_not_projected',
      severity: 'warning',
      message:
        'analysis.analytics.audit uses unsupported dbt resource type analysis and is not represented on the Canvas.',
    });
  });

  it('rejects malformed supported graph resources', () => {
    expect(() =>
      projectDbtManifest({
        metadata: { dbt_version: '1.10.0' },
        nodes: {
          'model.analytics.orders': {
            unique_id: 'model.analytics.orders',
            resource_type: 'model',
          },
        },
        sources: {},
      })
    ).toThrow('dbt parse produced a malformed graph resource.');
  });
});
