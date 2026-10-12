/** Schema for the existing single-grouping profile; no aggregate function catalogue. */
import type { AggregateRel } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';

import { argumentExpressions, deriveExpressionSchema } from './schemaExpression.js';
import { invalidSchema, requireSchemaType, type SchemaField } from './schemaTypes.js';

export function deriveAggregateSchema(
  aggregate: AggregateRel,
  input: readonly SchemaField[]
): readonly SchemaField[] {
  if (aggregate.groupings.length > 1)
    return invalidSchema('Multiple grouping sets are outside the supported schema profile.');
  const references = aggregate.groupings[0]?.expressionReferences ?? [];
  if (
    new Set(references).size !== aggregate.groupingExpressions.length ||
    references.some((ordinal) => aggregate.groupingExpressions[ordinal] == null)
  ) {
    return invalidSchema('Aggregate grouping references do not cover its grouping expressions.');
  }
  const groups = aggregate.groupingExpressions.map((expression) =>
    deriveExpressionSchema(expression, input)
  );
  const measures = aggregate.measures.map(({ measure }) => {
    if (measure == null) return invalidSchema('Aggregate measure is absent.');
    const dependencies = argumentExpressions(measure.arguments).flatMap(
      (expression) => deriveExpressionSchema(expression, input).sourceFieldIds
    );
    return {
      type: requireSchemaType(measure.outputType),
      sourceFieldIds: [...new Set(dependencies)],
    };
  });
  return [...groups, ...measures];
}
