/** Address collection has its own finite IO budget; the existing engine still owns binding. */
import { describe, expect, it } from 'vitest';

import { collectPostgresSqlPresentationRelations } from '../../../src/application/services/collectPostgresSqlPresentationRelations.js';

describe('SQL presentation physical requirements', () => {
  const address = { RangeVar: { schemaname: 'raw', relname: 'client' } };
  it('deduplicates literal addresses, including repeated AST nodes', () => {
    expect(collectPostgresSqlPresentationRelations({ inputs: [address, address] })).toEqual([
      { schema: 'raw', table: 'client' },
    ]);
  });
  it.each([
    { RangeVar: { relname: 'contextual' } },
    { RangeVar: { schemaname: 'raw', relname: 'client', catalogname: 42 } },
    { RangeVar: null },
    {
      inputs: Array.from({ length: 129 }, (_, i) => ({
        RangeVar: { schemaname: 'raw', relname: String(i) },
      })),
    },
  ])('does not infer unresolved or over-budget physical addresses', (ast) => {
    expect(collectPostgresSqlPresentationRelations(ast)).toBeNull();
  });
  it('terminates cyclic input without metadata IO', () => {
    const ast: Record<string, unknown> = {};
    ast.self = ast;
    expect(collectPostgresSqlPresentationRelations(ast)).toBeNull();
  });
});
