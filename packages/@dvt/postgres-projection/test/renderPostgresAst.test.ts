import { describe, expect, it } from 'vitest';

import { pgColumnRef, pgRangeVar, renderPostgresAst } from '../src/index.js';

describe('renderPostgresAst', () => {
  it('renders a bounded PostgreSQL select from typed AST constructors', async () => {
    const sql = await renderPostgresAst({
      SelectStmt: {
        targetList: [{ ResTarget: { name: 'order_id', val: pgColumnRef('order_id') } }],
        fromClause: [pgRangeVar({ schema: 'raw', table: 'orders' })],
        limitOption: 'LIMIT_OPTION_DEFAULT',
        op: 'SETOP_NONE',
      },
    });

    expect(sql.replace(/\s+/gu, ' ').trim()).toBe('SELECT order_id AS order_id FROM raw.orders');
  });
});
