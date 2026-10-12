/** Iterative expression schema derivation over the original protobuf messages. */
import type {
  Expression,
  FunctionArgument,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import {
  TypeSchema,
  Type_Nullability,
} from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import { create } from '@bufbuild/protobuf';

import { deriveLiteralType } from './schemaLiteral.js';
import {
  invalidSchema,
  isSchemaTypeNullable,
  requireSchemaType,
  schemaFieldAt,
  withSchemaNullability,
  type SchemaField,
} from './schemaTypes.js';

export function argumentExpressions(args: readonly FunctionArgument[]): Expression[] {
  return args.flatMap((argument) =>
    argument.argType.case === 'value' ? [argument.argType.value] : []
  );
}

function childrenOf(expression: Expression): readonly Expression[] {
  const rex = expression.rexType;
  switch (rex.case) {
    case 'scalarFunction':
      return argumentExpressions(rex.value.arguments);
    case 'windowFunction':
      return [
        ...argumentExpressions(rex.value.arguments),
        ...rex.value.partitions,
        ...rex.value.sorts.map(
          (sort) => sort.expr ?? invalidSchema('Window sort expression is missing.')
        ),
      ];
    case 'nested':
      if (rex.value.nestedType.case !== 'struct')
        return invalidSchema('Nested constructor is outside the schema profile.');
      return rex.value.nestedType.value.fields;
    default:
      return [];
  }
}

function deriveValue(
  expression: Expression,
  input: readonly SchemaField[],
  children: readonly SchemaField[]
): SchemaField {
  const rex = expression.rexType;
  const sourceFieldIds = [...new Set(children.flatMap((field) => field.sourceFieldIds))];
  switch (rex.case) {
    case 'selection': {
      const reference = rex.value;
      if (
        reference.rootType.case !== 'rootReference' ||
        reference.referenceType.case !== 'directReference'
      )
        return invalidSchema('Only fields in the current input scope are supported.');
      let segment = reference.referenceType.value;
      let siblings = input;
      let nullableParent = false;
      while (true) {
        if (segment.referenceType.case !== 'structField')
          return invalidSchema('Expected struct field reference.');
        const { field: ordinal, child } = segment.referenceType.value;
        const field = schemaFieldAt(siblings, ordinal);
        if (child == null) return nullableParent ? withSchemaNullability(field, true) : field;
        if (field.children == null)
          return invalidSchema('A field reference descends into a non-struct value.');
        nullableParent ||= isSchemaTypeNullable(field.type);
        siblings = field.children;
        segment = child;
      }
    }
    case 'literal':
      return { type: deriveLiteralType(rex.value), sourceFieldIds: [] };
    case 'scalarFunction':
    case 'windowFunction':
      return { type: requireSchemaType(rex.value.outputType), sourceFieldIds };
    case 'nested':
      return {
        type: create(TypeSchema, {
          kind: {
            case: 'struct',
            value: {
              types: children.map((field) => field.type),
              nullability: rex.value.nullable
                ? Type_Nullability.NULLABLE
                : Type_Nullability.REQUIRED,
            },
          },
        }),
        sourceFieldIds,
        children,
      };
    default:
      return invalidSchema('Expression is outside the supported schema profile.');
  }
}

export function deriveExpressionSchema(
  expression: Expression,
  input: readonly SchemaField[]
): SchemaField {
  const results = new Map<Expression, SchemaField>();
  const pending = [{ expression, ready: false }];
  while (pending.length > 0) {
    const item = pending.pop()!;
    if (results.has(item.expression)) continue;
    const children = childrenOf(item.expression);
    if (!item.ready) {
      pending.push({ ...item, ready: true });
      for (let i = children.length - 1; i >= 0; i -= 1)
        pending.push({ expression: children[i]!, ready: false });
    } else
      results.set(
        item.expression,
        deriveValue(
          item.expression,
          input,
          children.map((child) => results.get(child)!)
        )
      );
  }
  return results.get(expression)!;
}
