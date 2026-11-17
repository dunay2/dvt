/** Prove row constraints keep native type meaning, output sorting and exact bounds. */
import { SortField_SortDirection } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { deriveSubstraitSchemas } from '@dvt/substrait-analysis';
import { describe, expect, it } from 'vitest';

import { pgQualifiedColumnRef, pgRangeVar, pgStringLiteral } from '../src/postgresAst.js';
import { pgAnd, pgComparison, pgNullTest } from '../src/postgresPredicateAst.js';
import { projectSubstraitToPostgresSql } from '../src/relationalSql/project.js';
import { compileModelSqlSource } from '../src/sqlSource/compile.js';

import { modelSqlContext, sqlField, sqlSelect, sqlTarget } from './modelSqlSource.fixture.js';

describe('Model SQL source predicates and row constraints', () => {
  it('compiles nullable comparisons and negation without inventing scalar functions', async () => {
    const predicate = {
      BoolExpr: {
        boolop: 'NOT_EXPR',
        args: [
          pgAnd([
            pgComparison('=', sqlField('country'), pgStringLiteral('ES')),
            pgNullTest(sqlField('country'), true),
          ]),
        ],
      },
    };
    const { document, inputAdditions } = compileModelSqlSource(
      sqlSelect([sqlTarget(sqlField('client_id'))], undefined, { whereClause: predicate }),
      modelSqlContext()
    );
    expect(inputAdditions).toEqual(
      expect.arrayContaining([{ nodeId: 'client-node', columnId: 'country' }])
    );
    expect((await projectSubstraitToPostgresSql(document)).sql).toMatch(/<>/u);
  });

  it('rejects implicit type coercion and unsupported native numeric literal meaning', () => {
    const from = [pgRangeVar({ table: 'orders' })];
    for (const right of [pgStringLiteral('1'), { A_Const: { ival: { ival: 1 } } }])
      expect(() =>
        compileModelSqlSource(
          sqlSelect([sqlTarget(sqlField('order_id'))], from, {
            whereClause: pgComparison('=', sqlField('order_id'), right),
          }),
          modelSqlContext()
        )
      ).toThrow();
  });

  it('gives output aliases precedence and preserves hidden ordering inputs', async () => {
    const statement = sqlSelect([sqlTarget(sqlField('client_id'), 'country')], undefined, {
      sortClause: [
        { SortBy: { node: sqlField('country'), sortby_dir: 'SORTBY_DESC' } },
        { SortBy: { node: pgQualifiedColumnRef('client', 'country'), sortby_dir: 'SORTBY_ASC' } },
      ],
    });
    const { document } = compileModelSqlSource(statement, modelSqlContext());
    const analysis = deriveSubstraitSchemas(document);
    const sort = [...analysis.index.relations.values()].find(
      (entry) => entry.relation.relType.case === 'sort'
    )!;
    expect(sort.relation.relType).toMatchObject({
      case: 'sort',
      value: {
        sorts: [
          { sortKind: { case: 'direction', value: SortField_SortDirection.DESC_NULLS_FIRST } },
          { sortKind: { case: 'direction', value: SortField_SortDirection.ASC_NULLS_LAST } },
        ],
      },
    });
    expect((await projectSubstraitToPostgresSql(document)).orderBy).toBeNull();
  });

  it('keeps Fetch constants exact beyond JavaScript safe integer precision', async () => {
    const { document } = compileModelSqlSource(
      sqlSelect([sqlTarget(sqlField('country'))], undefined, {
        limitCount: { A_Const: { fval: { fval: '9007199254740993' } } },
        limitOffset: { A_Const: { ival: { ival: 0 } } },
      }),
      modelSqlContext()
    );
    expect((await projectSubstraitToPostgresSql(document)).sql).toContain('9007199254740993');
    for (const value of ['9223372036854775808', '-1', '1.5'])
      expect(() =>
        compileModelSqlSource(
          sqlSelect([sqlTarget(sqlField('country'))], undefined, {
            limitCount: { A_Const: { fval: { fval: value } } },
          }),
          modelSqlContext()
        )
      ).toThrow();
  });
});
