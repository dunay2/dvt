/** Map the admitted Boolean SQL grammar directly to canonical expressions and extensions. */
import {
  ExpressionSchema,
  type Expression,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import {
  SimpleExtensionDeclarationSchema,
  SimpleExtensionURNSchema,
} from '@buf/substrait_substrait.bufbuild_es/substrait/extensions/extensions_pb.js';
import { Type_Nullability } from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import { create } from '@bufbuild/protobuf';
import { deriveExpressionSchema } from '@dvt/substrait-analysis';

import type { PostgresAstNode } from '../postgresAst.js';
import { comparable } from '../relationalSql/scalarArguments.js';

import {
  sourceBudget,
  sourceError,
  sqlList,
  sqlObject,
  type SqlCompilationState,
  type SqlNameScope,
} from './context.js';
import { resolveSourceOrdinal, sourceFieldExpression, sqlIdentifier } from './references.js';

function scalar(
  state: SqlCompilationState,
  family: string,
  name: string,
  args: readonly Expression[],
  required = false
): Expression {
  const urn = 'extension:io.substrait:' + family;
  let declaration = state.plan.extensionUrns.find((item) => item.urn === urn);
  if (declaration == null) {
    declaration = create(SimpleExtensionURNSchema, {
      urn,
      extensionUrnAnchor: state.plan.extensionUrns.length + 1,
    });
    state.plan.extensionUrns.push(declaration);
  }
  let reference = state.plan.extensions
    .flatMap((item) =>
      item.mappingType.case === 'extensionFunction' ? [item.mappingType.value] : []
    )
    .find(
      (item) => item.name === name && item.extensionUrnReference === declaration.extensionUrnAnchor
    );
  if (reference == null) {
    const extension = create(SimpleExtensionDeclarationSchema, {
      mappingType: {
        case: 'extensionFunction',
        value: {
          name,
          extensionUrnReference: declaration.extensionUrnAnchor,
          functionAnchor: state.plan.extensions.length + 1,
        },
      },
    });
    state.plan.extensions.push(extension);
    if (extension.mappingType.case !== 'extensionFunction')
      return sourceError('invalid_model', 'Missing function declaration.');
    reference = extension.mappingType.value;
  }
  return create(ExpressionSchema, {
    rexType: {
      case: 'scalarFunction',
      value: {
        functionReference: reference.functionAnchor,
        arguments: args.map((value) => ({ argType: { case: 'value' as const, value } })),
        outputType: {
          kind: {
            case: 'bool',
            value: {
              nullability: required ? Type_Nullability.REQUIRED : Type_Nullability.NULLABLE,
            },
          },
        },
      },
    },
  });
}
function operand(
  state: SqlCompilationState,
  scope: SqlNameScope,
  node: PostgresAstNode
): Expression {
  sourceBudget(state);
  if (Object.hasOwn(node, 'ColumnRef'))
    return sourceFieldExpression(resolveSourceOrdinal(state, scope, node));
  if (Object.hasOwn(node, 'A_Const')) {
    const value = sqlObject(node['A_Const']);
    if (value['sval'] != null) {
      // libpg-query omits protobuf scalar defaults inside a present literal node.
      const text = sqlObject(value['sval'])['sval'] ?? '';
      if (typeof text === 'string')
        return create(ExpressionSchema, {
          rexType: { case: 'literal', value: { literalType: { case: 'string', value: text } } },
        });
    }
    if (value['boolval'] != null) {
      const flag = sqlObject(value['boolval'])['boolval'] ?? false;
      if (typeof flag === 'boolean')
        return create(ExpressionSchema, {
          rexType: { case: 'literal', value: { literalType: { case: 'boolean', value: flag } } },
        });
    }
  }
  return sourceError(
    'unsupported_sql',
    'Predicate operands require direct fields or admitted text/Boolean literals.',
    node
  );
}

const comparisons: Readonly<Record<string, readonly [string, string]>> = {
  '=': ['equal', 'not_equal'],
  '<>': ['not_equal', 'equal'],
  '!=': ['not_equal', 'equal'],
  '>': ['gt', 'lte'],
  '>=': ['gte', 'lt'],
  '<': ['lt', 'gte'],
  '<=': ['lte', 'gt'],
};
export function sourcePredicate(
  state: SqlCompilationState,
  scope: SqlNameScope,
  node: PostgresAstNode,
  negated = false,
  depth = 0
): Expression {
  sourceBudget(state);
  if (depth > 64)
    return sourceError('unsupported_sql', 'Predicate nesting exceeds the source profile.', node);
  if (node['BoolExpr'] != null) {
    const value = sqlObject(node['BoolExpr']);
    const args = sqlList(value['args']);
    if (value['boolop'] === 'NOT_EXPR' && args.length === 1)
      return sourcePredicate(state, scope, sqlObject(args[0]), !negated, depth + 1);
    if (!['AND_EXPR', 'OR_EXPR'].includes(String(value['boolop'])) || args.length < 2)
      return sourceError('unsupported_sql', 'Unsupported Boolean predicate.', value);
    const name = (value['boolop'] === 'AND_EXPR') !== negated ? 'and' : 'or';
    return args
      .map((arg) => sourcePredicate(state, scope, sqlObject(arg), negated, depth + 1))
      .reduce((left, right) => scalar(state, 'functions_boolean', name, [left, right]));
  }
  if (node['A_Expr'] != null) {
    const value = sqlObject(node['A_Expr']);
    const names = sqlList(value['name']);
    const operator = names.length === 1 ? comparisons[sqlIdentifier(names[0])] : undefined;
    if (value['kind'] !== 'AEXPR_OP' || operator == null)
      return sourceError(
        'unsupported_sql',
        'Only admitted comparison operators are supported.',
        value
      );
    const args = [
      operand(state, scope, sqlObject(value['lexpr'])),
      operand(state, scope, sqlObject(value['rexpr'])),
    ];
    const input = scope.schema;
    if (!comparable(args.map((arg) => deriveExpressionSchema(arg, input).type)))
      return sourceError(
        'unknown_type',
        'Comparison operands require the same admitted native type.',
        value
      );
    return scalar(state, 'functions_comparison', operator[negated ? 1 : 0]!, args);
  }
  if (node['NullTest'] != null) {
    const value = sqlObject(node['NullTest']);
    if (
      value['argisrow'] === true ||
      !['IS_NULL', 'IS_NOT_NULL'].includes(String(value['nulltesttype']))
    )
      return sourceError('unsupported_sql', 'Only scalar NULL predicates are admitted.', value);
    const arg = operand(state, scope, sqlObject(value['arg']));
    const type = deriveExpressionSchema(arg, scope.schema).type;
    if (!comparable([type]))
      return sourceError('unknown_type', 'NULL predicate type is not admitted.', value);
    return scalar(
      state,
      'functions_comparison',
      (value['nulltesttype'] === 'IS_NULL') !== negated ? 'is_null' : 'is_not_null',
      [arg],
      true
    );
  }
  const value = operand(state, scope, node);
  if (deriveExpressionSchema(value, scope.schema).type.kind.case !== 'bool')
    return sourceError('unknown_type', 'WHERE and ON require a Boolean expression.', node);
  return negated
    ? scalar(state, 'functions_comparison', 'equal', [
        value,
        create(ExpressionSchema, {
          rexType: { case: 'literal', value: { literalType: { case: 'boolean', value: false } } },
        }),
      ])
    : value;
}
