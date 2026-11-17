/** Prove whole-query rejection at the source namespace and profile boundaries. */
import { describe, expect, it } from 'vitest';

import { pgColumnRef, pgRangeVar, pgString } from '../src/postgresAst.js';
import { sourceFieldType } from '../src/postgresInputType.js';
import { compileModelSqlSource } from '../src/sqlSource/compile.js';

import {
  modelSqlContext,
  sqlField,
  sqlSelect,
  sqlStar,
  sqlTarget,
} from './modelSqlSource.fixture.js';

describe('Model SQL source admission', () => {
  it.each([
    { distinctClause: [{}] },
    { groupClause: [pgColumnRef('country')] },
    { withClause: { ctes: [] } },
    { valuesLists: [[]] },
    { lockingClause: [{}] },
    { intoClause: {} },
    { op: 'SETOP_UNION' },
    { limitOption: 'LIMIT_OPTION_WITH_TIES' },
  ])('rejects unsupported SELECT clauses without returning a partial document: %j', (clause) => {
    expect(() =>
      compileModelSqlSource(sqlSelect([sqlTarget(sqlStar())], undefined, clause), modelSqlContext())
    ).toThrow();
  });

  it('does not fall back to physical tables or another schema', () => {
    for (const from of [
      pgRangeVar({ table: 'missing' }),
      pgRangeVar({ schema: 'public', table: 'client' }),
    ])
      expect(() =>
        compileModelSqlSource(sqlSelect([sqlTarget(sqlStar())], [from]), modelSqlContext())
      ).toThrow();
  });

  it('rejects absent, ambiguous and duplicate output names', () => {
    expect(() =>
      compileModelSqlSource(sqlSelect([sqlTarget(sqlField('missing'))]), modelSqlContext())
    ).toThrow();
    expect(() =>
      compileModelSqlSource(
        sqlSelect([sqlTarget(sqlField('country')), sqlTarget(sqlField('country'))]),
        modelSqlContext()
      )
    ).toThrow();
    expect(() =>
      compileModelSqlSource(
        sqlSelect(
          [sqlTarget(sqlField('client_id'))],
          [pgRangeVar({ table: 'client' }), pgRangeVar({ table: 'orders' })]
        ),
        modelSqlContext()
      )
    ).toThrow();
  });

  it('never invents string meaning for an unknown publication type', () => {
    const context = modelSqlContext();
    const input = context.inputs[0]!;
    expect(() =>
      compileModelSqlSource(sqlSelect([sqlTarget(sqlField('country'))]), {
        ...context,
        inputs: [
          {
            ...input,
            columns: input.columns.map((column) => ({
              ...column,
              type: sourceFieldType(null, true),
            })),
          },
        ],
      })
    ).toThrow();
  });

  it('rejects computed projections, casts and parameters outside the source profile', () => {
    for (const expression of [
      { FuncCall: { funcname: [pgString('upper')], args: [sqlField('country')] } },
      { TypeCast: { arg: sqlField('country'), typeName: { names: [pgString('text')] } } },
      { ParamRef: { number: 1 } },
    ])
      expect(() =>
        compileModelSqlSource(sqlSelect([sqlTarget(expression)]), modelSqlContext())
      ).toThrow();
  });
});
