import { describe, expect, it } from 'vitest';

import { inspectWorksheetModelSql } from '../../../src/application/services/worksheetCanvasModelSql.js';
import { bindWorksheetModelSql } from '../../../src/application/services/worksheetCanvasModelSqlBindings.js';

describe('worksheet physical syntax binding', () => {
  it('binds an exact physical relation while preserving its SQL qualifier', async () => {
    const parsed = await inspectWorksheetModelSql('SELECT raw.orders.order_id FROM raw.orders', []);
    expect(parsed.relations.map((r) => [r.schema, r.name])).toEqual([['raw', 'orders']]);
    const sql = await bindWorksheetModelSql(
      parsed,
      new Map([[parsed.relations[0]!.key, 'Orders input']])
    );
    expect(sql).toContain('"Orders input"');
    expect(sql).toContain('orders.order_id');
  });
  it('requires a canonical match before replacing an observed Model subquery', async () => {
    const model = {
      alias: 'model_orders',
      sql: 'SELECT order_id FROM raw.orders',
      sqlName: 'Orders Model',
    };
    const parsed = await inspectWorksheetModelSql(
      'SELECT * FROM (SELECT order_id FROM raw.orders) AS model_orders',
      [model]
    );
    expect(parsed.relations).toHaveLength(0);
    expect(await bindWorksheetModelSql(parsed, new Map())).toContain(
      '"Orders Model" AS model_orders'
    );
    await expect(
      inspectWorksheetModelSql('SELECT * FROM (SELECT other FROM raw.orders) AS model_orders', [
        model,
      ])
    ).rejects.toMatchObject({ code: 'stale_context' });
  });
  it.each(['DELETE FROM raw.orders', 'SELECT 1; SELECT 2', 'SELECT * FROM raw.orders FOR UPDATE'])(
    'rejects non-read-only syntax before resolving relations: %s',
    async (sql) => {
      await expect(inspectWorksheetModelSql(sql, [])).rejects.toMatchObject({
        code: 'unsupported_sql',
      });
    }
  );
  it('does not silently retain an observed Model that disappeared from SQL', async () => {
    await expect(
      inspectWorksheetModelSql('SELECT * FROM raw.orders', [
        { alias: 'm', sqlName: 'Model', sql: 'SELECT * FROM raw.orders' },
      ])
    ).rejects.toMatchObject({ code: 'stale_context' });
  });
});
