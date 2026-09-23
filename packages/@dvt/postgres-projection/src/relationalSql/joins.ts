import {
  JoinRel_JoinType,
  type JoinRel,
  type CrossRel,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';

import type { PostgresAstNode } from '../postgresAst.js';

import { predicateSql } from './expressions.js';
import {
  inputColumns,
  inputRange,
  unsupported,
  type SqlInput,
  type ExpressionScope,
} from './scope.js';

type JoinBinding = Readonly<{ sql?: string; retained?: 0 | 1; anti?: boolean }>;
const joins: Partial<Record<JoinRel_JoinType, JoinBinding>> = {
  [JoinRel_JoinType.INNER]: { sql: 'JOIN_INNER' },
  [JoinRel_JoinType.LEFT]: { sql: 'JOIN_LEFT' },
  [JoinRel_JoinType.RIGHT]: { sql: 'JOIN_RIGHT' },
  [JoinRel_JoinType.OUTER]: { sql: 'JOIN_FULL' },
  [JoinRel_JoinType.LEFT_SEMI]: { retained: 0 },
  [JoinRel_JoinType.RIGHT_SEMI]: { retained: 1 },
  [JoinRel_JoinType.LEFT_ANTI]: { retained: 0, anti: true },
  [JoinRel_JoinType.RIGHT_ANTI]: { retained: 1, anti: true },
};
export function joinSql(
  join: JoinRel | CrossRel,
  inputs: readonly SqlInput[],
  scope: ExpressionScope
): Readonly<{
  columns: readonly PostgresAstNode[];
  from: readonly PostgresAstNode[];
  clauses: PostgresAstNode;
}> {
  const ranges = inputs.map((input, side) => inputRange(input, `i${side}`));
  if (join.$typeName === 'substrait.CrossRel')
    return {
      columns: scope.columns,
      from: [{ JoinExpr: { jointype: 'JOIN_INNER', larg: ranges[0], rarg: ranges[1] } }],
      clauses: {},
    };
  if (join.postJoinFilter != null)
    return unsupported('JOIN post-filter must be expressed as its own Filter relation.');
  const binding = joins[join.type];
  if (binding == null) return unsupported('JOIN kind is not admitted.');
  const condition = predicateSql(join.expression, scope);
  if (binding.retained != null) {
    const retained = binding.retained;
    const exists = {
      SubLink: {
        subLinkType: 'EXISTS_SUBLINK',
        subselect: {
          SelectStmt: {
            targetList: [{ ResTarget: { val: { A_Const: { ival: { ival: 1 } } } } }],
            fromClause: [ranges[1 - retained]],
            whereClause: condition,
            op: 'SETOP_NONE',
            limitOption: 'LIMIT_OPTION_DEFAULT',
          },
        },
      },
    };
    return {
      columns: inputColumns(inputs[retained]!, `i${retained}`),
      from: [ranges[retained]!],
      clauses: {
        whereClause: binding.anti ? { BoolExpr: { boolop: 'NOT_EXPR', args: [exists] } } : exists,
      },
    };
  }
  return {
    columns: scope.columns,
    from: [
      { JoinExpr: { jointype: binding.sql, larg: ranges[0], rarg: ranges[1], quals: condition } },
    ],
    clauses: {},
  };
}
