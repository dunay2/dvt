/** Prove JOIN null extension, source occurrences and nested SQL scope boundaries. */
import { deriveSubstraitSchemas, isSchemaTypeNullable } from '@dvt/substrait-analysis';
import { describe, expect, it } from 'vitest';

import {
  pgQualifiedColumnRef,
  pgRangeSubselect,
  pgRangeVar,
  pgString,
  type PostgresAstNode,
} from '../src/postgresAst.js';
import { pgComparison } from '../src/postgresPredicateAst.js';
import { compileModelSqlSource } from '../src/sqlSource/compile.js';

import { modelSqlContext, sqlField, sqlSelect, sqlTarget } from './modelSqlSource.fixture.js';

const join = (jointype: string): PostgresAstNode => ({
  JoinExpr: {
    jointype,
    larg: pgRangeVar({ table: 'client', alias: 'c' }),
    rarg: pgRangeVar({ table: 'orders', alias: 'o' }),
    quals: pgComparison(
      '=',
      pgQualifiedColumnRef('c', 'client_id'),
      pgQualifiedColumnRef('o', 'client_id')
    ),
  },
});

describe('Model SQL source JOIN and SELECT scopes', () => {
  it.each([
    ['JOIN_INNER', [false, false]],
    ['JOIN_LEFT', [false, true]],
    ['JOIN_RIGHT', [true, false]],
    ['JOIN_FULL', [true, true]],
  ])('retains the actual nullability of %s', (kind, nullable) => {
    const result = compileModelSqlSource(
      sqlSelect(
        [
          sqlTarget(pgQualifiedColumnRef('c', 'client_id'), 'client'),
          sqlTarget(pgQualifiedColumnRef('o', 'order_id'), 'order'),
        ],
        [join(String(kind))]
      ),
      modelSqlContext()
    );
    const analysis = deriveSubstraitSchemas(result.document);
    expect(
      analysis.schemas.get(analysis.index.rootId)!.map((field) => isSchemaTypeNullable(field.type))
    ).toEqual(nullable);
    expect(result.inputAdditions).toEqual(
      expect.arrayContaining([
        { nodeId: 'client-node', columnId: 'client_id' },
        { nodeId: 'orders-node', columnId: 'client_id' },
        { nodeId: 'orders-node', columnId: 'order_id' },
      ])
    );
  });

  it('assigns distinct opaque Read occurrences to a self join', () => {
    const statement = sqlSelect(
      [
        sqlTarget(pgQualifiedColumnRef('a', 'country'), 'left_country'),
        sqlTarget(pgQualifiedColumnRef('b', 'country'), 'right_country'),
      ],
      [
        {
          JoinExpr: {
            jointype: 'JOIN_INNER',
            larg: pgRangeVar({ table: 'client', alias: 'a' }),
            rarg: pgRangeVar({ table: 'client', alias: 'b' }),
            quals: pgComparison(
              '=',
              pgQualifiedColumnRef('a', 'client_id'),
              pgQualifiedColumnRef('b', 'client_id')
            ),
          },
        },
      ]
    );
    const { document } = compileModelSqlSource(statement, modelSqlContext());
    const reads = [...deriveSubstraitSchemas(document).index.relations.values()].filter(
      (entry) => entry.relation.relType.case === 'read'
    );
    expect(reads).toHaveLength(2);
    expect(reads[0]!.binding.relationId).not.toBe(reads[1]!.binding.relationId);
    expect(reads[0]!.fields[0]!.fieldId).not.toBe(reads[1]!.fields[0]!.fieldId);
  });

  it('uses the actual subquery output scope and rejects correlated outer references', () => {
    const subquery = sqlSelect([sqlTarget(sqlField('country'), 'market')]);
    expect(() =>
      compileModelSqlSource(
        sqlSelect(
          [sqlTarget(pgQualifiedColumnRef('s', 'market'))],
          [pgRangeSubselect(subquery, 's')]
        ),
        modelSqlContext()
      )
    ).not.toThrow();
    expect(() =>
      compileModelSqlSource(
        sqlSelect(
          [sqlTarget(pgQualifiedColumnRef('s', 'country'))],
          [pgRangeSubselect(subquery, 's')]
        ),
        modelSqlContext()
      )
    ).toThrow(expect.objectContaining({ code: 'unknown_column' }));
    const correlated = sqlSelect([sqlTarget(sqlField('country'))], undefined, {
      whereClause: pgComparison(
        '=',
        sqlField('client_id'),
        pgQualifiedColumnRef('outer', 'client_id')
      ),
    });
    expect(() =>
      compileModelSqlSource(
        sqlSelect(
          [sqlTarget(pgQualifiedColumnRef('outer', 'country'))],
          [pgRangeVar({ table: 'client', alias: 'outer' }), pgRangeSubselect(correlated, 's')]
        ),
        modelSqlContext()
      )
    ).toThrow(expect.objectContaining({ code: 'unknown_column' }));
  });

  it('validates unprojected branches before any field pruning', () => {
    const forbidden = sqlSelect([
      sqlTarget(
        { FuncCall: { funcname: [pgString('upper')], args: [sqlField('country')] } },
        'unused'
      ),
    ]);
    expect(() =>
      compileModelSqlSource(
        sqlSelect(
          [sqlTarget(pgQualifiedColumnRef('c', 'country'))],
          [pgRangeVar({ table: 'client', alias: 'c' }), pgRangeSubselect(forbidden, 's')]
        ),
        modelSqlContext()
      )
    ).toThrow(expect.objectContaining({ code: 'unsupported_sql' }));
  });
});
