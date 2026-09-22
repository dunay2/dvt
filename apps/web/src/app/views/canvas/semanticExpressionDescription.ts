/** Describe canonical expression values without introducing an expression model. */
import type { Expression } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import type { Plan } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import { dvtSubstraitExpression } from './canvasDvtSubstraitExpression';

export function literalLabel(expression: Expression): string {
  if (expression.rexType.case !== 'literal') return 'literal';
  const value = dvtSubstraitExpression.literalValue(expression);
  if (value?.dataType === 'precisionTimestampTz') return value.value;
  const literal = expression.rexType.value.literalType;
  if (literal.case === 'string') return `'${literal.value.replaceAll("'", "''")}'`;
  if (literal.case === undefined) return 'NULL';
  return String(literal.value);
}

const OPERATORS: Readonly<Record<string, string>> = {
  equal: '=',
  not_equal: '!=',
  is_null: 'IS NULL',
  is_not_null: 'IS NOT NULL',
  gt: '>',
  gte: '>=',
  lt: '<',
  lte: '<=',
  add: '+',
  subtract: '-',
  multiply: '*',
  divide: '/',
  and: 'AND',
  or: 'OR',
  not: 'NOT',
};

export function createSemanticExpressionDescription(plan: Plan) {
  const names = new Map(
    plan.extensions.flatMap((entry) =>
      entry.mappingType.case === 'extensionFunction'
        ? [
            [
              entry.mappingType.value.functionAnchor,
              entry.mappingType.value.name.split(':', 1)[0]!,
            ] as const,
          ]
        : []
    )
  );
  const functionName = (reference: number): string => names.get(reference) ?? `fn#${reference}`;
  const operatorLabel = (name: string): string => OPERATORS[name] ?? name;
  function describeExpression(
    expression: Expression,
    fields: readonly string[],
    nested = false
  ): string {
    switch (expression.rexType.case) {
      case 'selection': {
        const ordinal = dvtSubstraitExpression.fieldOrdinal(expression);
        return ordinal == null ? 'field' : (fields[ordinal] ?? `field[${ordinal}]`);
      }
      case 'literal':
        return literalLabel(expression);
      case 'scalarFunction': {
        const scalar = expression.rexType.value;
        const name = functionName(scalar.functionReference);
        const operator = operatorLabel(name);
        const args = scalar.arguments.flatMap((argument) => {
          switch (argument.argType.case) {
            case 'value':
              return [describeExpression(argument.argType.value, fields, true)];
            case 'enum':
              return [argument.argType.value];
            default:
              return [];
          }
        });
        const detail =
          args.length === 1 && (name === 'is_null' || name === 'is_not_null')
            ? `${args[0]} ${operator}`
            : args.length === 2 && operator !== name
              ? `${args[0]} ${operator} ${args[1]}`
              : `${operator}(${args.join(', ')})`;
        return nested && (name === 'and' || name === 'or') ? `(${detail})` : detail;
      }
      default:
        return expression.rexType.case ?? 'expression';
    }
  }
  return { describeExpression, functionName, operatorLabel };
}
