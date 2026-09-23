/** Iterative lowering of canonical expressions in one explicit input scope. */
import type { Expression } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import type { Type } from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import { deriveExpressionSchema } from '@dvt/substrait-analysis';

import {
  pgString,
  pgStringLiteral,
  pgTimestampTzLiteral,
  type PostgresAstNode,
} from '../postgresAst.js';
import { pgBooleanLiteral, pgI64Literal, pgFp64Literal } from '../postgresPredicateAst.js';
import { inspectFunctionProfile } from '../substrait-profile/functions.js';
import { rowNumberProfile } from '../substrait-profile/rowNumber.js';
import { dvtSubstraitExpressionReader } from '../substraitExpressionReader.js';

import { sortAst, sortDirection } from './ordering.js';
import { scalarSql } from './scalars.js';
import { unsupported, type ExpressionScope } from './scope.js';

type SqlValue = Readonly<{ ast: PostgresAstNode; type: Type }>;
function children(expression: Expression): readonly Expression[] {
  const rex = expression.rexType;
  if (rex.case === 'scalarFunction' || rex.case === 'windowFunction') {
    const args = rex.value.arguments.flatMap((argument) =>
      argument.argType.case === 'value' ? [argument.argType.value] : []
    );
    return rex.case === 'windowFunction'
      ? [
          ...args,
          ...rex.value.partitions,
          ...rex.value.sorts.map(
            (sort) => sort.expr ?? unsupported('Missing window sort expression.')
          ),
        ]
      : args;
  }
  return [];
}
function lower(
  expression: Expression,
  scope: ExpressionScope,
  values: ReadonlyMap<Expression, SqlValue>
): SqlValue {
  const rex = expression.rexType;
  if (rex.case === 'selection') {
    const ordinal = dvtSubstraitExpressionReader.fieldOrdinal(expression);
    const column = ordinal == null ? undefined : scope.columns[ordinal];
    const field = ordinal == null ? undefined : scope.fields[ordinal];
    if (column == null || field == null)
      return unsupported('Field reference is outside its input scope.');
    return { ast: column, type: field.type };
  }
  if (rex.case === 'literal') {
    if (rex.value.typeVariationReference !== 0)
      return unsupported('Literal type variation is outside the admitted PostgreSQL profile.');
    const type = deriveExpressionSchema(expression, scope.fields).type;
    const value = dvtSubstraitExpressionReader.literalValue(expression);
    if (value == null) return unsupported('Literal is outside the admitted PostgreSQL profile.');
    const renderers = {
      string: pgStringLiteral,
      bool: pgBooleanLiteral,
      i64: pgI64Literal,
      fp64: pgFp64Literal,
      precisionTimestampTz: pgTimestampTzLiteral,
    };
    const literal = value.value;
    const renderer = renderers[value.dataType] as (argument: typeof literal) => PostgresAstNode;
    return { ast: renderer(value.value), type };
  }
  if (rex.case === 'scalarFunction') {
    const args = children(expression).map((child) => values.get(child)!);
    return {
      ast: scalarSql(
        scope.plan,
        rex.value,
        args.map((arg) => arg.ast),
        args.map((arg) => arg.type)
      ),
      type: rex.value.outputType!,
    };
  }
  if (rex.case === 'windowFunction') {
    const fn = rex.value;
    const profile = inspectFunctionProfile(scope.plan, fn);
    if (!profile.ok || profile.value !== rowNumberProfile)
      return unsupported('Window invocation is outside the admitted profile.');
    return {
      type: fn.outputType!,
      ast: {
        FuncCall: {
          funcname: [pgString('row_number')],
          over: {
            ...(fn.partitions.length === 0
              ? {}
              : { partitionClause: fn.partitions.map((partition) => values.get(partition)!.ast) }),
            ...(fn.sorts.length === 0
              ? {}
              : {
                  orderClause: fn.sorts.map((sort) =>
                    sortAst(values.get(sort.expr!)!.ast, sortDirection(sort))
                  ),
                }),
          },
        },
      },
    };
  }
  return unsupported('Expression has no admitted PostgreSQL lowering.');
}
export function expressionSql(
  expression: Expression | undefined,
  scope: ExpressionScope
): SqlValue {
  if (expression == null) return unsupported('Required expression is missing.');
  const values = new Map<Expression, SqlValue>();
  const pending: Array<{ expression: Expression; ready: boolean }> = [{ expression, ready: false }];
  while (pending.length > 0) {
    const item = pending.pop()!;
    if (item.ready) values.set(item.expression, lower(item.expression, scope, values));
    else {
      pending.push({ ...item, ready: true });
      for (const child of [...children(item.expression)].reverse())
        pending.push({ expression: child, ready: false });
    }
  }
  return values.get(expression)!;
}
export function predicateSql(
  expression: Expression | undefined,
  scope: ExpressionScope
): PostgresAstNode {
  const result = expressionSql(expression, scope);
  if (result.type.kind.case !== 'bool') return unsupported('Predicate must return a boolean.');
  return result.ast;
}
