/** One dispatch over original protobuf variants and already derived, ordered inputs. */
import type { Rel } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';

import type { IndexedRelation } from './relationIndex.js';
import { deriveAggregateSchema } from './schemaAggregate.js';
import { deriveExpressionSchema } from './schemaExpression.js';
import { deriveJoinSchema, deriveSetSchema } from './schemaMultiInput.js';
import { invalidSchema, requireSchemaType, type SchemaField } from './schemaTypes.js';

type Variant = Exclude<Rel['relType'], { case: undefined }>;
type SchemaInputs = readonly (readonly SchemaField[])[];
type SchemaHandlers = {
  [K in Variant['case']]?: (
    message: Extract<Variant, { case: K }>['value'],
    inputs: SchemaInputs,
    entry: IndexedRelation
  ) => readonly SchemaField[];
};

const handlers = {
  read: (read, _inputs, entry) => {
    if (read.projection != null || read.common?.emitKind.case === 'emit')
      return invalidSchema(
        'Read projection requires physical field bindings before schema derivation.'
      );
    const types = read.baseSchema?.struct?.types;
    if (types == null || read.baseSchema?.names.length !== types.length)
      return invalidSchema('A flat Read schema is required.');
    const bindings = new Map(entry.fields.map((field) => [field.outputOrdinal, field]));
    return types.map((type, ordinal) => {
      const binding = bindings.get(ordinal);
      if (binding == null) return invalidSchema('A Read field has no stable identity binding.');
      return { type: requireSchemaType(type), sourceFieldIds: [binding.fieldId] };
    });
  },
  project: (project, [input]) => [
    ...input!,
    ...project.expressions.map((expression) => deriveExpressionSchema(expression, input!)),
  ],
  filter: (_filter, [input]) => input!,
  sort: (_sort, [input]) => input!,
  fetch: (_fetch, [input]) => input!,
  cross: (_cross, inputs) => inputs.flat(),
  join: deriveJoinSchema,
  set: deriveSetSchema,
  aggregate: (aggregate, [input]) => deriveAggregateSchema(aggregate, input!),
} satisfies SchemaHandlers;

export function deriveOperatorSchema(
  entry: IndexedRelation,
  inputs: SchemaInputs
): readonly SchemaField[] {
  const variant = entry.relation.relType;
  if (variant.case === undefined || !Object.hasOwn(handlers, variant.case)) {
    return invalidSchema('Relation has no output schema handler.');
  }
  // The protobuf discriminant selects the matching message signature in the registry.
  const handler = handlers[variant.case as keyof typeof handlers] as (
    message: Variant['value'],
    inputs: SchemaInputs,
    entry: IndexedRelation
  ) => readonly SchemaField[];
  return handler(variant.value, inputs, entry);
}
