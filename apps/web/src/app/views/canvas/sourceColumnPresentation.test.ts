import { describe, expect, it } from 'vitest';

import type { NodePropertiesReadModel } from '../../components/inspector/nodePropertiesReadModel';
import { classifySourceColumnType, projectSourceColumns } from './sourceColumnPresentation';

const model: NodePropertiesReadModel = {
  nodeId: 'source-1',
  nodeName: 'Orders Source',
  sections: [
    {
      id: 'columns',
      label: 'Columns',
      rows: [],
      tableRows: [
        {
          id: 'order_id',
          cells: {
            name: 'order_id',
            type: 'uuid',
            nullable: 'not null',
            key: 'PK',
            default: 'gen_random_uuid()',
            comment: 'Stable order identifier',
          },
        },
        {
          id: 'customer_id',
          cells: {
            name: 'customer_id',
            type: 'bigint',
            nullable: 'not null',
            key: '',
            default: '',
            comment: '',
          },
        },
        {
          id: 'external_code',
          cells: {
            name: 'external_code',
            type: 'varchar(80)',
            nullable: 'nullable',
            key: '',
            default: '',
            comment: '',
          },
        },
      ],
    },
    {
      id: 'keys',
      label: 'Keys',
      rows: [],
      tableRows: [
        {
          id: 'pk:order_id',
          cells: { name: 'Primary key', columns: 'order_id', type: 'primary' },
        },
        {
          id: 'unique:orders_external_code',
          cells: {
            name: 'orders_external_code',
            columns: 'external_code',
            type: 'unique',
          },
        },
      ],
    },
    {
      id: 'indexes',
      label: 'Indexes',
      rows: [],
      tableRows: [
        {
          id: 'idx_orders_customer',
          cells: {
            name: 'idx_orders_customer',
            type: 'btree',
            columns: 'customer_id',
            unique: 'no',
          },
        },
      ],
    },
    {
      id: 'foreign-keys',
      label: 'Foreign keys',
      rows: [],
      tableRows: [
        {
          id: 'orders_customer_fk',
          cells: {
            name: 'orders_customer_fk',
            localColumns: 'customer_id',
            referencedTable: 'crm.customers',
            referencedColumns: 'id',
          },
        },
      ],
    },
    {
      id: 'constraints',
      label: 'Constraints',
      rows: [],
      tableRows: [
        {
          id: 'orders_amount_check',
          cells: {
            name: 'orders_amount_check',
            type: 'check',
            expression: 'amount >= 0',
          },
        },
      ],
    },
  ],
};

describe('projectSourceColumns', () => {
  it('derives PK/FK/UK/IDX/NN only from explicit read-model facts', () => {
    const columns = projectSourceColumns(model);

    expect(columns.find((column) => column.name === 'order_id')).toMatchObject({
      physicalType: 'uuid',
      typeFamily: 'uuid',
      nullability: 'not-null',
      badges: ['PK'],
      defaultValue: 'gen_random_uuid()',
      databaseComment: 'Stable order identifier',
    });
    expect(columns.find((column) => column.name === 'customer_id')).toMatchObject({
      typeFamily: 'number',
      badges: ['FK', 'IDX', 'NN'],
      foreignKeyTargets: ['crm.customers.id'],
      indexNames: ['idx_orders_customer'],
    });
    expect(columns.find((column) => column.name === 'external_code')).toMatchObject({
      typeFamily: 'text',
      nullability: 'nullable',
      badges: ['UK'],
      uniqueKeyNames: ['orders_external_code'],
    });
  });

  it('does not infer a column constraint from a free-form constraint expression', () => {
    const customer = projectSourceColumns(model).find((column) => column.name === 'customer_id');

    expect(customer?.badges).not.toContain('UK');
    expect(customer?.badges).not.toContain('PK');
  });
});

describe('classifySourceColumnType', () => {
  it.each([
    ['text', 'text'],
    ['varchar(80)', 'text'],
    ['numeric(12,2)', 'number'],
    ['boolean', 'boolean'],
    ['jsonb', 'structured'],
    ['uuid', 'uuid'],
    ['timestamp with time zone', 'datetime'],
    ['inet', 'network'],
    ['geometry', 'generic'],
  ] as const)('classifies %s as %s for visual scanning only', (type, expected) => {
    expect(classifySourceColumnType(type)).toBe(expected);
  });
});
