/** Expression type and field dependencies only; function admission remains a separate concern. */
import type {
  Expression,
  FunctionArgument,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';

import { deriveLiteralType } from './schemaLiteral.js';
import {
  invalidSchema,
  requireSchemaType,
  schemaFieldAt,
  type SchemaField,
} from './schemaTypes.js';

export function argumentExpressions(args: readonly FunctionArgument[]): Expression[] {
  return args.flatMap((argument) =>
    argument.argType.case === 'value' ? [argument.argType.value] : []
  );
}

function expressionParts(
  expression: Expression,
  input: readonly SchemaField[]
): Readonly<{
  field: SchemaField;
  children: readonly Expression[];
}> {
  const rex = expression.rexType;
  switch (rex.case) {
    case 'selection': {
      const reference = rex.value;
      const segment =
        reference.referenceType.case === 'directReference'
          ? reference.referenceType.value.referenceType
          : undefined;
      if (
        reference.rootType.case !== 'rootReference' ||
        segment?.case !== 'structField' ||
        segment.value.child != null
      ) {
        return invalidSchema('Only fields in the current flat input scope are supported.');
      }
      return { field: schemaFieldAt(input, segment.value.field), children: [] };
    }
    case 'literal':
      return { field: { type: deriveLiteralType(rex.value), sourceFieldIds: [] }, children: [] };
    case 'scalarFunction':
      return {
        field: { type: requireSchemaType(rex.value.outputType), sourceFieldIds: [] },
        children: argumentExpressions(rex.value.arguments),
      };
    case 'windowFunction':
      return {
        field: { type: requireSchemaType(rex.value.outputType), sourceFieldIds: [] },
        children: [
          ...argumentExpressions(rex.value.arguments),
          ...rex.value.partitions,
          ...rex.value.sorts.map(
            (sort) => sort.expr ?? invalidSchema('Window sort expression is missing.')
          ),
        ],
      };
    default:
      return invalidSchema('Expression is outside the supported schema profile.');
  }
}

export function deriveExpressionSchema(
  expression: Expression,
  input: readonly SchemaField[]
): SchemaField {
  const root = expressionParts(expression, input);
  const dependencies = new Set(root.field.sourceFieldIds);
  const pending = [...root.children].reverse();
  while (pending.length > 0) {
    const current = expressionParts(pending.pop()!, input);
    for (const id of current.field.sourceFieldIds) dependencies.add(id);
    for (let index = current.children.length - 1; index >= 0; index -= 1)
      pending.push(current.children[index]!);
  }
  return { type: root.field.type, sourceFieldIds: [...dependencies] };
}
