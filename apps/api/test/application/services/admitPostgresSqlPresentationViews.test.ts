/** Native view definitions remain opaque inputs; one existing admission profile certifies their syntax. */
import { describe, expect, it } from 'vitest';

import { admitPostgresSqlPresentationViews } from '../../../src/application/services/admitPostgresSqlPresentationViews.js';
const evidence = {
  currentDatabase: 'warehouse',
  scalarSemantics: 'pg_catalog' as const,
  resolvedColumns: [{ schema: 'raw', table: 'client', columns: ['client_id', 'country'] }],
};
describe('Opaque native view admission', () => {
  it('admits a whole direct projection/filter without requiring a rewrite of the view', async () => {
    expect(
      await admitPostgresSqlPresentationViews({
        ...evidence,
        viewDefinitions: [
          {
            schema: 'public',
            table: 'clientes',
            sql: 'select client_id, country from raw.client where client_id is not null',
          },
        ],
      })
    ).toBe(true);
  });
  it.each([
    'select random() as value from raw.client',
    'select client_id from raw.client order by country',
    'select client_id from another.raw.client',
    'select missing from raw.client',
    'with x as (select client_id from raw.client) select client_id from x',
  ])('retains a whole unsupported view instead of pruning it into validity: %s', async (sql) => {
    expect(
      await admitPostgresSqlPresentationViews({
        ...evidence,
        viewDefinitions: [{ schema: 'public', table: 'clientes', sql }],
      })
    ).toBe(false);
  });
  it('retains cyclic view references without an unbounded native traversal', async () => {
    const cyclic = {
      ...evidence,
      resolvedColumns: [
        { schema: 'public', table: 'a', columns: ['id'] },
        { schema: 'public', table: 'b', columns: ['id'] },
      ],
      viewDefinitions: [
        { schema: 'public', table: 'a', sql: 'select id from public.b' },
        { schema: 'public', table: 'b', sql: 'select id from public.a' },
      ],
    };
    expect(await admitPostgresSqlPresentationViews(cyclic)).toBe(false);
    expect(
      await admitPostgresSqlPresentationViews({
        ...cyclic,
        viewDefinitions: [{ schema: 'public', table: 'a', sql: 'select id from public.a' }],
      })
    ).toBe(false);
  });
});
