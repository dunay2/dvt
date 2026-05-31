import { describe, expect, it } from 'vitest';

import { buildWarehouseSourceYamlUpdates } from '../../../src/application/services/warehouseSourceYaml.js';

describe('warehouse source YAML builder', () => {
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
});
