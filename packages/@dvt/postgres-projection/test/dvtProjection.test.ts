import { describe, expect, it } from 'vitest';

import {
  buildConnectedFieldPostgresAst,
  buildPilotPostgresAst,
  DvtSubstraitPostgresProjectionError,
  renderPostgresAst,
} from '../src/index.js';

const normalize = (sql: string): string => sql.replace(/\s+/gu, ' ').trim();

describe('DVT PostgreSQL projection', () => {
  it('renders selected, calculated and aliased connected fields', async () => {
    const ast = buildConnectedFieldPostgresAst({
      source: {
        schema: 'raw',
        table: 'orders',
        fields: [{ name: 'order_id' }],
      },
      outputs: [
        { name: 'clean_id', sourceFieldName: 'order_id', operations: ['trim', 'upper'] },
        { name: 'loaded_at', calculation: { kind: 'timestamp-literal', value: '2026-09-03' } },
      ],
    });

    await expect(renderPostgresAst(ast).then(normalize)).resolves.toContain(
      'upper(trim(order_id)) AS clean_id'
    );
  });

  it('uses the governed physical source for the admitted pilot projection', async () => {
    const ast = buildPilotPostgresAst(
      {
        sourceName: 'browser_name',
        inputFieldName: 'customer',
        outputName: 'customer_clean',
        operations: ['trim', 'upper'],
        outputs: [{ name: 'customer_clean' }, { name: 'amount' }],
      },
      { schema: 'raw', table: 'orders' }
    );

    await expect(renderPostgresAst(ast).then(normalize)).resolves.toContain('FROM raw.orders');
  });

  it('rejects an incomplete physical source binding', () => {
    expect(() =>
      buildPilotPostgresAst(
        {
          sourceName: 'orders',
          inputFieldName: 'customer',
          outputName: 'customer_clean',
          operations: ['trim', 'upper'],
          outputs: [{ name: 'customer_clean' }],
        },
        { schema: ' ', table: 'orders' }
      )
    ).toThrow(
      expect.objectContaining<DvtSubstraitPostgresProjectionError>({
        code: 'invalid_source_binding',
      })
    );
  });
});
