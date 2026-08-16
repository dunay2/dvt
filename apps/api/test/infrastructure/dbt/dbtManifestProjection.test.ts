import { describe, expect, it } from 'vitest';

import { projectDbtManifest } from '../../../src/infrastructure/dbt/dbtManifestProjection.js';

describe('projectDbtManifest', () => {
  it('projects supported resources and reports unsupported graph resources', () => {
    const projection = projectDbtManifest({
      metadata: {
        dbt_version: '1.10.0',
        adapter_type: 'postgres',
        project_name: 'analytics',
      },
      nodes: {
        'model.analytics.orders': {
          unique_id: 'model.analytics.orders',
          resource_type: 'model',
          name: 'orders',
          package_name: 'analytics',
          original_file_path: 'models\\orders.sql',
          patch_path: 'analytics://models/schema.yml',
          description: 'Curated customer orders',
          depends_on: {
            nodes: ['source.analytics.raw.orders'],
            macros: ['macro.analytics.normalize_order'],
          },
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
        'model.dbt_utils.orders': {
          unique_id: 'model.dbt_utils.orders',
          resource_type: 'model',
          name: 'orders',
          package_name: 'dbt_utils',
          original_file_path: 'models/orders.sql',
          patch_path: 'dbt_utils://models/schema.yml',
          depends_on: { nodes: [] },
          columns: {},
          tags: [],
        },
      },
      sources: {
        'source.analytics.raw.orders': {
          unique_id: 'source.analytics.raw.orders',
          resource_type: 'source',
          name: 'orders',
          identifier: 'orders-physical',
          source_name: 'raw',
          package_name: 'analytics',
          database: 'analytics',
          schema: 'raw',
          meta: {
            dvt_source_identity: {
              connection_id: 'warehouse-prod',
              database_user: 'warehouse_reader',
            },
          },
          original_file_path: 'models\\sources\\src_raw.yml',
          depends_on: { nodes: [] },
          columns: {},
          tags: [],
        },
      },
      exposures: {},
      metrics: {},
      macros: {
        'macro.analytics.normalize_order': {
          unique_id: 'macro.analytics.normalize_order',
          resource_type: 'macro',
          name: 'normalize_order',
          package_name: 'analytics',
          original_file_path: 'macros\\normalize_order.sql',
          depends_on: { macros: [] },
        },
      },
    });

    expect(projection.resources.map((resource) => resource.uniqueId)).toEqual(
      ['model.dbt_utils.orders', 'model.analytics.orders', 'source.analytics.raw.orders'].sort()
    );
    expect(projection.adapterType).toBe('postgres');
    expect(projection.projectName).toBe('analytics');
    expect(projection.resources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          uniqueId: 'model.analytics.orders',
          originalFilePath: 'models/orders.sql',
          descriptionFilePath: 'models/schema.yml',
          description: 'Curated customer orders',
        }),
        expect.objectContaining({
          uniqueId: 'source.analytics.raw.orders',
          identifier: 'orders-physical',
          originalFilePath: 'models/sources/src_raw.yml',
          descriptionFilePath: 'models/sources/src_raw.yml',
          sourceTableDeclaration: {
            uniqueId: 'source.analytics.raw.orders',
            filePath: 'models/sources/src_raw.yml',
            sourceName: 'raw',
            tableName: 'orders',
            database: 'analytics',
            schema: 'raw',
            identifier: 'orders-physical',
          },
          sourceIdentityRef: {
            database: 'analytics',
            connectionId: 'warehouse-prod',
            schema: 'raw',
            databaseUser: 'warehouse_reader',
          },
        }),
      ])
    );
    expect(
      projection.resources.find((resource) => resource.uniqueId === 'model.dbt_utils.orders')
    ).not.toHaveProperty('descriptionFilePath');
    expect(projection.dependencies).toEqual([
      {
        sourceUniqueId: 'source.analytics.raw.orders',
        targetUniqueId: 'model.analytics.orders',
        relation: 'dependency',
      },
    ]);
    expect(projection.identities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          uniqueId: 'model.analytics.orders',
          dependencyUniqueIds: ['source.analytics.raw.orders'],
          macroUniqueIds: ['macro.analytics.normalize_order'],
        }),
        expect.objectContaining({
          uniqueId: 'macro.analytics.normalize_order',
          resourceType: 'macro',
          originalFilePath: 'macros/normalize_order.sql',
        }),
      ])
    );
    expect(projection.identities.map((identity) => identity.uniqueId)).toEqual(
      [...projection.identities.map((identity) => identity.uniqueId)].sort()
    );
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
        metadata: { dbt_version: '1.10.0', project_name: 'analytics' },
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

  it('preserves empty DBT resource descriptions as exact editable baselines', () => {
    const projection = projectDbtManifest({
      metadata: { dbt_version: '1.10.0', project_name: 'analytics' },
      nodes: {
        'model.analytics.empty_description': {
          unique_id: 'model.analytics.empty_description',
          resource_type: 'model',
          name: 'empty_description',
          package_name: 'analytics',
          patch_path: 'analytics://models/schema.yml',
          description: '',
          depends_on: { nodes: [] },
          columns: {},
          tags: [],
        },
        'model.analytics.whitespace_description': {
          unique_id: 'model.analytics.whitespace_description',
          resource_type: 'model',
          name: 'whitespace_description',
          package_name: 'analytics',
          patch_path: 'analytics://models/schema.yml',
          description: '  ',
          depends_on: { nodes: [] },
          columns: {},
          tags: [],
        },
      },
      sources: {},
    });

    expect(
      projection.resources.find(
        (resource) => resource.uniqueId === 'model.analytics.empty_description'
      )?.description
    ).toBe('');
    expect(
      projection.resources.find(
        (resource) => resource.uniqueId === 'model.analytics.whitespace_description'
      )?.description
    ).toBe('  ');
  });
});
