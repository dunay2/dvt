import { describe, expect, it } from 'vitest';

import {
  DBT_SOURCE_YAML_ARTIFACT_DESCRIPTOR,
  InvalidWarehouseSourceYamlError,
  buildWarehouseSourceYamlPath,
  buildWarehouseSourceYamlUpdates,
  readExistingSourceDocument,
} from '../../../src/application/services/warehouseSourceYaml.js';

describe('warehouse source YAML builder', () => {
  it('declares dbt source artifact ownership and path semantics in one descriptor', () => {
    expect(DBT_SOURCE_YAML_ARTIFACT_DESCRIPTOR).toMatchObject({
      pluginId: 'dbt',
      artifactKind: 'dbt-source-yaml',
    });
    expect(
      buildWarehouseSourceYamlPath(
        {
          database: 'analytics',
          schema: 'ERP',
          table: 'ORDERS',
        },
        'schema'
      )
    ).toBe('models/sources/src_erp.yml');
    expect(
      buildWarehouseSourceYamlPath(
        {
          database: 'ANALYTICS',
          schema: 'erp',
          table: 'orders',
        },
        'database'
      )
    ).toBe('models/sources/src_analytics.yml');
  });

  it('rejects malformed existing YAML instead of rewriting it as an empty source file', () => {
    expect(() => readExistingSourceDocument('version: 2\nsources:\n  - name: [')).toThrow(
      InvalidWarehouseSourceYamlError
    );
  });

  it('creates deterministic dbt source YAML with columns, tests, and freshness', () => {
    const updates = buildWarehouseSourceYamlUpdates({
      existingFiles: new Map(),
      groupingStrategy: 'schema',
      includeColumns: true,
      addTests: true,
      addFreshness: true,
      tables: [
        {
          database: 'analytics',
          schema: 'erp',
          table: 'orders',
          columns: [
            { name: 'id', type: 'integer', nullable: false },
            { name: 'created_at', type: 'timestamp', nullable: false },
            { name: 'notes', type: 'text', nullable: true },
          ],
        },
      ],
    });

    expect(updates).toEqual([
      {
        path: 'models/sources/src_erp.yml',
        content: [
          'version: 2',
          '',
          'sources:',
          '  - name: erp',
          '    database: analytics',
          '    schema: erp',
          '    freshness:',
          '      warn_after:',
          '        count: 24',
          '        period: hour',
          '      error_after:',
          '        count: 48',
          '        period: hour',
          '    tables:',
          '      - name: orders',
          '        columns:',
          '          - name: id',
          '            data_type: integer',
          '            tests:',
          '              - not_null',
          '          - name: created_at',
          '            data_type: timestamp',
          '            tests:',
          '              - not_null',
          '          - name: notes',
          '            data_type: text',
          '',
        ].join('\n'),
      },
    ]);
  });

  it('merges new tables into existing source YAML without duplicating known tables', () => {
    const updates = buildWarehouseSourceYamlUpdates({
      existingFiles: new Map([
        [
          'models/sources/src_erp.yml',
          [
            'version: 2',
            '',
            'sources:',
            '  - name: erp',
            '    database: analytics',
            '    schema: erp',
            '    tables:',
            '      - name: orders',
            '',
          ].join('\n'),
        ],
      ]),
      groupingStrategy: 'schema',
      includeColumns: false,
      addTests: false,
      addFreshness: false,
      tables: [
        { database: 'analytics', schema: 'erp', table: 'orders' },
        { database: 'analytics', schema: 'erp', table: 'customers' },
      ],
    });

    expect(updates).toEqual([
      {
        path: 'models/sources/src_erp.yml',
        content: [
          'version: 2',
          '',
          'sources:',
          '  - name: erp',
          '    database: analytics',
          '    schema: erp',
          '    tables:',
          '      - name: customers',
          '      - name: orders',
          '',
        ].join('\n'),
      },
    ]);
  });

  it('preserves existing dbt metadata when adding tables to a source file', () => {
    const updates = buildWarehouseSourceYamlUpdates({
      existingFiles: new Map([
        [
          'models/sources/src_erp.yml',
          [
            'version: 2',
            '',
            'sources:',
            '  - name: erp',
            '    database: "{{ env_var(\'RAW_DATABASE\') }}"',
            '    schema: ERP_CUSTOM',
            '    description: ERP source metadata maintained by analytics',
            '    meta:',
            '      owner: finance',
            '    freshness:',
            '      warn_after:',
            '        count: 12',
            '        period: hour',
            "      filter: loaded_at >= current_timestamp - interval '7 days'",
            '    tables:',
            '      - name: orders',
            '        description: Existing orders table description',
            '        tests:',
            '          - dbt_utils.unique_combination_of_columns:',
            '              combination_of_columns:',
            '                - id',
            '                - created_at',
            '        config:',
            '          tags:',
            '            - critical',
            '        columns:',
            '          - name: id',
            '            description: Stable order id',
            '            tests:',
            '              - not_null',
            '              - unique',
            '',
          ].join('\n'),
        ],
      ]),
      groupingStrategy: 'schema',
      includeColumns: false,
      addTests: false,
      addFreshness: true,
      tables: [{ database: 'analytics', schema: 'erp', table: 'customers' }],
    });

    const content = updates[0]?.content ?? '';
    expect(content).toContain("database: '{{ env_var(''RAW_DATABASE'') }}'");
    expect(content).toContain('schema: ERP_CUSTOM');
    expect(content).toContain('description: ERP source metadata maintained by analytics');
    expect(content).toContain('owner: finance');
    expect(content).toContain('count: 12');
    expect(content).toContain('filter:');
    expect(content).toContain('description: Existing orders table description');
    expect(content).toContain('dbt_utils.unique_combination_of_columns:');
    expect(content).toContain('tags:');
    expect(content).toContain('description: Stable order id');
    expect(content).toContain('- name: customers');
  });

  it('updates existing disambiguated source names when re-importing one side of a database collision', () => {
    const updates = buildWarehouseSourceYamlUpdates({
      existingFiles: new Map([
        [
          'models/sources/src_erp.yml',
          [
            'version: 2',
            '',
            'sources:',
            '  - name: analytics_erp',
            '    database: analytics',
            '    schema: erp',
            '    tables:',
            '      - name: orders',
            '  - name: finance_erp',
            '    database: finance',
            '    schema: erp',
            '    tables:',
            '      - name: orders',
            '',
          ].join('\n'),
        ],
      ]),
      groupingStrategy: 'schema',
      includeColumns: true,
      addTests: false,
      addFreshness: false,
      tables: [
        {
          database: 'finance',
          schema: 'erp',
          table: 'orders',
          columns: [{ name: 'id', type: 'number', nullable: false }],
        },
      ],
    });

    expect(updates).toEqual([
      {
        path: 'models/sources/src_erp.yml',
        content: [
          'version: 2',
          '',
          'sources:',
          '  - name: analytics_erp',
          '    database: analytics',
          '    schema: erp',
          '    tables:',
          '      - name: orders',
          '  - name: finance_erp',
          '    database: finance',
          '    schema: erp',
          '    tables:',
          '      - name: orders',
          '        columns:',
          '          - name: id',
          '            data_type: number',
          '',
        ].join('\n'),
      },
    ]);
  });
});
