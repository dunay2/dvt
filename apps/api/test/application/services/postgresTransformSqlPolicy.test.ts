import { describe, expect, it } from 'vitest';

import { validatePostgresTransformSqlStructure } from '../../../src/application/services/postgresTransformSqlPolicy.js';

describe('validatePostgresTransformSqlStructure', () => {
  it('accepts one PostgreSQL SELECT statement', async () => {
    await expect(
      validatePostgresTransformSqlStructure(
        'select order_id, customer, amount from public.source_1'
      )
    ).resolves.toEqual({ status: 'valid' });
  });

  it('accepts a SELECT statement introduced by a CTE', async () => {
    await expect(
      validatePostgresTransformSqlStructure(
        'with source_rows as (select * from public.source_1) select * from source_rows'
      )
    ).resolves.toEqual({ status: 'valid' });
  });

  it('rejects more than one statement', async () => {
    await expect(
      validatePostgresTransformSqlStructure('select 1; select 2;')
    ).resolves.toMatchObject({
      status: 'invalid',
      diagnostics: [{ code: 'multiple_statements', source: 'policy' }],
    });
  });

  it('rejects statements outside the SQL-first SELECT policy', async () => {
    await expect(
      validatePostgresTransformSqlStructure('delete from public.source_1')
    ).resolves.toMatchObject({
      status: 'invalid',
      diagnostics: [{ code: 'unsupported_statement', source: 'policy' }],
    });
  });

  it('returns the PostgreSQL parser position for invalid syntax', async () => {
    const result = await validatePostgresTransformSqlStructure('select from ;');

    expect(result).toMatchObject({
      status: 'invalid',
      diagnostics: [{ code: 'syntax_error', source: 'parser' }],
    });
    if (result.status === 'invalid') {
      expect(result.diagnostics[0]?.startOffset).toBeGreaterThanOrEqual(0);
    }
  });
});
