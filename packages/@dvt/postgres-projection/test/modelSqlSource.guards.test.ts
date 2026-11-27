/** Prove whole-query rejection at the source namespace and profile boundaries. */
import { describe, expect, it } from 'vitest';

import {
  pgColumnRef,
  pgQualifiedColumnRef,
  pgRangeVar,
  pgString,
  type PostgresAstNode,
} from '../src/postgresAst.js';
import { sourceFieldType } from '../src/postgresInputType.js';
import { compileModelSqlSource } from '../src/sqlSource/compile.js';

import {
  modelSqlContext,
  firstRead,
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

  it('does not resolve physical tables outside the prepared inputs', () => {
    for (const from of [
      pgRangeVar({ table: 'missing' }),
      pgRangeVar({ schema: 'other', table: 'client' }),
    ])
      expect(() =>
        compileModelSqlSource(sqlSelect([sqlTarget(sqlStar())], [from]), modelSqlContext())
      ).toThrow();
  });

  it('binds a qualified physical table to the same prepared publication as its logical name', () => {
    const context = modelSqlContext();
    const input = { ...context.inputs[0]!, sqlName: 'customers' };
    const prepared = { ...context, inputs: [input] };
    const target = sqlTarget(pgQualifiedColumnRef('client', 'country'));
    const physical = compileModelSqlSource(
      sqlSelect([target], [pgRangeVar({ schema: 'public', table: 'client' })]),
      prepared
    );
    expect(firstRead(physical.document).binding.sourceRef).toEqual(
      firstRead(
        compileModelSqlSource(
          sqlSelect([sqlTarget(sqlField('country'))], [pgRangeVar({ table: 'customers' })]),
          prepared
        ).document
      ).binding.sourceRef
    );
    expect(physical.inputAdditions).toEqual([{ nodeId: input.nodeId, columnId: 'country' }]);
  });

  it('requires a matching logical alias to select between prepared reads of the same physical table', () => {
    const first = { ...modelSqlContext().inputs[0]!, sqlName: 'customers' };
    const second = { ...first, nodeId: 'other-read', sqlName: 'buyers' };
    const context = { inputs: [first, second] };
    const target = sqlTarget(sqlField('country'));
    expect(() =>
      compileModelSqlSource(
        sqlSelect([target], [pgRangeVar({ schema: 'public', table: 'client' })]),
        context
      )
    ).toThrow(expect.objectContaining({ code: 'ambiguous_reference' }));
    expect(
      compileModelSqlSource(
        sqlSelect([target], [pgRangeVar({ schema: 'public', table: 'client', alias: 'buyers' })]),
        context
      ).inputAdditions
    ).toEqual([{ nodeId: second.nodeId, columnId: 'country' }]);
  });

  it('checks the catalog qualifier against the exact connected Source identity', () => {
    const ast = (catalog: string): PostgresAstNode =>
      sqlSelect(
        [sqlTarget(sqlField('country'))],
        [{ RangeVar: { catalogname: catalog, schemaname: 'public', relname: 'client' } }]
      );
    const context = modelSqlContext();
    expect(compileModelSqlSource(ast('database'), context).inputAdditions).toEqual([
      { nodeId: 'client-node', columnId: 'country' },
    ]);
    expect(() => compileModelSqlSource(ast('other_database'), context)).toThrow(
      expect.objectContaining({ code: 'unknown_input' })
    );
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
