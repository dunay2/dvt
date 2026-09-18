import { createDvtPostgresOutputSchemaDigestV1 } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import { projectDvtPostgresOutputSchemaV1 } from '../src/index.js';

describe('DVT PostgreSQL output schema projection', () => {
  it('normalizes the admitted semantic types without changing output order', () => {
    const schema = projectDvtPostgresOutputSchemaV1([
      { name: 'order_id', dataType: 'i64', outputOrdinal: 0 },
      { name: 'country', dataType: 'string', outputOrdinal: 1 },
      { name: 'active', dataType: 'bool', outputOrdinal: 2 },
      { name: 'amount', dataType: 'fp64', outputOrdinal: 3 },
      { name: 'ordered_at', dataType: 'precisionTimestampTz', outputOrdinal: 4 },
    ]);

    expect(schema?.columns.map(({ name, postgresType }) => ({ name, postgresType }))).toEqual([
      { name: 'order_id', postgresType: 'bigint' },
      { name: 'country', postgresType: 'text' },
      { name: 'active', postgresType: 'boolean' },
      { name: 'amount', postgresType: 'double precision' },
      { name: 'ordered_at', postgresType: 'timestamp with time zone' },
    ]);
    expect(schema && createDvtPostgresOutputSchemaDigestV1(schema)).toMatch(/^[0-9a-f]{64}$/u);
  });

  it.each([
    ['an unknown type', [{ name: 'order_id', dataType: 'unknown', outputOrdinal: 0 }]],
    ['a missing ordinal', [{ name: 'order_id', dataType: 'i64', outputOrdinal: 1 }]],
    [
      'a duplicate name',
      [
        { name: 'order_id', dataType: 'i64', outputOrdinal: 0 },
        { name: 'order_id', dataType: 'i64', outputOrdinal: 1 },
      ],
    ],
  ])('cannot fingerprint %s', (_label, outputs) => {
    expect(projectDvtPostgresOutputSchemaV1(outputs)).toBeNull();
  });
});
