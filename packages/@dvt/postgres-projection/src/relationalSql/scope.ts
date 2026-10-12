/** SQL-local column bindings, not a second relational or expression model. */
import type { Plan } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import type { SchemaField } from '@dvt/substrait-analysis';

import { DvtSubstraitPostgresProjectionError } from '../dvtProjection.js';
import { pgQualifiedColumnRef, pgRangeSubselect, type PostgresAstNode } from '../postgresAst.js';
import type { DvtPostgresOrderKey } from '../sortFetchPostgresProjection.js';

export type SqlInput = Readonly<{
  ast: PostgresAstNode;
  fields: readonly SchemaField[];
  orderBy: readonly DvtPostgresOrderKey[];
}>;
export type ExpressionScope = Readonly<{
  plan: Plan;
  fields: readonly SchemaField[];
  columns: readonly PostgresAstNode[];
}>;
export const columnName = (ordinal: number): string => `c${ordinal}`;
export function unsupported(message: string): never {
  throw new DvtSubstraitPostgresProjectionError('unsupported_shape', message);
}
export function inputColumns(input: SqlInput, alias: string): PostgresAstNode[] {
  return input.fields.map((_field, ordinal) => pgQualifiedColumnRef(alias, columnName(ordinal)));
}
export function inputRange(input: SqlInput, alias: string): PostgresAstNode {
  return pgRangeSubselect(input.ast, alias);
}
export function selectAst(
  columns: readonly PostgresAstNode[],
  from: readonly PostgresAstNode[],
  clauses: PostgresAstNode = {}
): PostgresAstNode {
  return {
    SelectStmt: {
      targetList: columns.map((val, ordinal) => ({
        ResTarget: { name: columnName(ordinal), val },
      })),
      fromClause: from,
      op: 'SETOP_NONE',
      limitOption: 'LIMIT_OPTION_DEFAULT',
      ...clauses,
    },
  };
}
