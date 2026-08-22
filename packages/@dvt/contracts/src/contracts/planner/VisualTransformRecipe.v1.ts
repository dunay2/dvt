/**
 * Owned concern: define the versioned visual transformation recipe and its
 * mutually exclusive DVT authoring authority state.
 *
 * The recipe is authoring intent persisted inside Workspace Graph Draft node
 * metadata. It does not own rendered lineage edges, SQL generation, SQL
 * validation, planning, or runtime execution.
 *
 * @decision Keep visual intent as one small, strict value object and derive presentation from it.
 * @consequence Existing SQL nodes remain SQL-authoritative while visual nodes persist no editable SQL.
 * @baseline ADR-0035: Planner Public Contract Evolution Protocol
 * @version 1.0.0
 */
import { z } from 'zod';

const NonBlankStringSchema = z.string().trim().min(1);
const JsonScalarSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);

export const VISUAL_TRANSFORM_RECIPE_VERSION = 'v1' as const;
export const DVT_TRANSFORM_AUTHORING_MODE = {
  sql: 'sql',
  visual: 'visual',
} as const;
export const VISUAL_TRANSFORM_FUNCTION_ID = {
  trim: 'trim',
  upper: 'upper',
  lower: 'lower',
  coalesce: 'coalesce',
  concat: 'concat',
} as const;
export const VISUAL_TRANSFORM_AGGREGATE_FUNCTION_ID = {
  count: 'count',
  sum: 'sum',
  avg: 'avg',
  min: 'min',
  max: 'max',
} as const;
export const VISUAL_TRANSFORM_FILTER_OPERATOR = {
  equals: 'equals',
  notEquals: 'not_equals',
  greaterThan: 'greater_than',
  greaterThanOrEqual: 'greater_than_or_equal',
  lessThan: 'less_than',
  lessThanOrEqual: 'less_than_or_equal',
  isNull: 'is_null',
  isNotNull: 'is_not_null',
} as const;

const ValueComparisonOperatorSchema = z.enum([
  VISUAL_TRANSFORM_FILTER_OPERATOR.equals,
  VISUAL_TRANSFORM_FILTER_OPERATOR.notEquals,
  VISUAL_TRANSFORM_FILTER_OPERATOR.greaterThan,
  VISUAL_TRANSFORM_FILTER_OPERATOR.greaterThanOrEqual,
  VISUAL_TRANSFORM_FILTER_OPERATOR.lessThan,
  VISUAL_TRANSFORM_FILTER_OPERATOR.lessThanOrEqual,
]);
const NullComparisonOperatorSchema = z.enum([
  VISUAL_TRANSFORM_FILTER_OPERATOR.isNull,
  VISUAL_TRANSFORM_FILTER_OPERATOR.isNotNull,
]);

export const VisualTransformColumnInputRefV1Schema = z
  .object({
    nodeId: NonBlankStringSchema,
    columnName: NonBlankStringSchema,
  })
  .strict();

const VisualTransformPassthroughOperationV1Schema = z
  .object({ kind: z.literal('passthrough') })
  .strict();
const VisualTransformCastOperationV1Schema = z
  .object({
    kind: z.literal('cast'),
    targetType: NonBlankStringSchema,
  })
  .strict();
const VisualTransformFunctionOperationV1Schema = z
  .object({
    kind: z.literal('function'),
    functionId: z.enum([
      VISUAL_TRANSFORM_FUNCTION_ID.trim,
      VISUAL_TRANSFORM_FUNCTION_ID.upper,
      VISUAL_TRANSFORM_FUNCTION_ID.lower,
      VISUAL_TRANSFORM_FUNCTION_ID.coalesce,
      VISUAL_TRANSFORM_FUNCTION_ID.concat,
    ]),
    args: z.array(JsonScalarSchema),
  })
  .strict();
const VisualTransformConstantOperationV1Schema = z
  .object({
    kind: z.literal('constant'),
    value: JsonScalarSchema,
  })
  .strict();
const VisualTransformAggregateOperationV1Schema = z
  .object({
    kind: z.literal('aggregate'),
    functionId: z.enum([
      VISUAL_TRANSFORM_AGGREGATE_FUNCTION_ID.count,
      VISUAL_TRANSFORM_AGGREGATE_FUNCTION_ID.sum,
      VISUAL_TRANSFORM_AGGREGATE_FUNCTION_ID.avg,
      VISUAL_TRANSFORM_AGGREGATE_FUNCTION_ID.min,
      VISUAL_TRANSFORM_AGGREGATE_FUNCTION_ID.max,
    ]),
    distinct: z.literal(true).optional(),
  })
  .strict();

export const VisualTransformOperationV1Schema = z.discriminatedUnion('kind', [
  VisualTransformPassthroughOperationV1Schema,
  VisualTransformCastOperationV1Schema,
  VisualTransformFunctionOperationV1Schema,
  VisualTransformConstantOperationV1Schema,
  VisualTransformAggregateOperationV1Schema,
]);

export const VisualTransformExpressionV1Schema = z
  .object({
    inputs: z.array(VisualTransformColumnInputRefV1Schema),
    operations: z.array(VisualTransformOperationV1Schema).min(1),
  })
  .strict()
  .superRefine((expression, context) => {
    const aggregateIndexes = expression.operations.flatMap((operation, index) =>
      operation.kind === 'aggregate' ? [index] : []
    );
    if (aggregateIndexes.length > 1) {
      context.addIssue({
        code: 'custom',
        message: 'A visual output can contain at most one aggregate operation.',
        path: ['operations'],
      });
      return;
    }
    const aggregateIndex = aggregateIndexes[0];
    if (aggregateIndex == null) return;
    if (aggregateIndex !== expression.operations.length - 1) {
      context.addIssue({
        code: 'custom',
        message: 'Aggregate operation must be the final output operation.',
        path: ['operations', aggregateIndex],
      });
    }

    const aggregate = expression.operations[aggregateIndex];
    if (aggregate?.kind !== 'aggregate') return;
    if (aggregate.functionId === VISUAL_TRANSFORM_AGGREGATE_FUNCTION_ID.count) {
      if (expression.inputs.length > 1) {
        context.addIssue({
          code: 'custom',
          message: 'COUNT accepts at most one input expression.',
          path: ['inputs'],
        });
      }
      if (aggregate.distinct === true && expression.inputs.length !== 1) {
        context.addIssue({
          code: 'custom',
          message: 'COUNT DISTINCT requires exactly one input expression.',
          path: ['operations', aggregateIndex, 'distinct'],
        });
      }
      if (expression.inputs.length === 0 && expression.operations.length !== 1) {
        context.addIssue({
          code: 'custom',
          message: 'COUNT(*) cannot be combined with scalar operations.',
          path: ['operations'],
        });
      }
      return;
    }

    if (aggregate.distinct === true) {
      context.addIssue({
        code: 'custom',
        message: 'DISTINCT is supported only by COUNT in the VTX2 MVP.',
        path: ['operations', aggregateIndex, 'distinct'],
      });
    }
    if (expression.inputs.length !== 1) {
      context.addIssue({
        code: 'custom',
        message: `${aggregate.functionId.toUpperCase()} requires exactly one input expression.`,
        path: ['inputs'],
      });
    }
  });

export const VisualTransformOutputColumnV1Schema = z
  .object({
    id: NonBlankStringSchema,
    name: NonBlankStringSchema,
    dataType: NonBlankStringSchema.optional(),
    expression: VisualTransformExpressionV1Schema,
  })
  .strict();

function createValueComparisonSchema<T extends z.ZodRawShape>(targetShape: T) {
  return z
    .object({
      id: NonBlankStringSchema,
      ...targetShape,
      operator: ValueComparisonOperatorSchema,
      value: JsonScalarSchema,
    })
    .strict();
}

function createNullComparisonSchema<T extends z.ZodRawShape>(targetShape: T) {
  return z
    .object({
      id: NonBlankStringSchema,
      ...targetShape,
      operator: NullComparisonOperatorSchema,
    })
    .strict();
}

const ValueComparisonFilterV1Schema = createValueComparisonSchema({
  input: VisualTransformColumnInputRefV1Schema,
});
const NullComparisonFilterV1Schema = createNullComparisonSchema({
  input: VisualTransformColumnInputRefV1Schema,
});

export const VisualTransformFilterV1Schema = z.union([
  ValueComparisonFilterV1Schema,
  NullComparisonFilterV1Schema,
]);

const ValueComparisonHavingFilterV1Schema = createValueComparisonSchema({
  outputId: NonBlankStringSchema,
});
const NullComparisonHavingFilterV1Schema = createNullComparisonSchema({
  outputId: NonBlankStringSchema,
});

export const VisualTransformHavingFilterV1Schema = z.union([
  ValueComparisonHavingFilterV1Schema,
  NullComparisonHavingFilterV1Schema,
]);

function addDuplicateIdIssues(
  values: readonly { id: string }[],
  path: readonly (string | number)[],
  context: z.RefinementCtx
): void {
  const seen = new Set<string>();
  values.forEach((value, index) => {
    if (seen.has(value.id)) {
      context.addIssue({
        code: 'custom',
        message: `Duplicate stable id ${value.id}.`,
        path: [...path, index, 'id'],
      });
    }
    seen.add(value.id);
  });
}

function isAggregateOutput(output: z.infer<typeof VisualTransformOutputColumnV1Schema>): boolean {
  return output.expression.operations.some((operation) => operation.kind === 'aggregate');
}

export const VisualTransformRecipeV1Schema = z
  .object({
    version: z.literal(VISUAL_TRANSFORM_RECIPE_VERSION),
    outputs: z.array(VisualTransformOutputColumnV1Schema),
    filters: z.array(VisualTransformFilterV1Schema),
    groupBy: z.array(NonBlankStringSchema).optional(),
    having: z.array(VisualTransformHavingFilterV1Schema).optional(),
  })
  .strict()
  .superRefine((recipe, context) => {
    addDuplicateIdIssues(recipe.outputs, ['outputs'], context);
    addDuplicateIdIssues(recipe.filters, ['filters'], context);
    addDuplicateIdIssues(recipe.having ?? [], ['having'], context);

    const outputsById = new Map(recipe.outputs.map((output) => [output.id, output] as const));
    const groupBy = recipe.groupBy ?? [];
    const groupedOutputIds = new Set<string>();
    groupBy.forEach((outputId, index) => {
      if (groupedOutputIds.has(outputId)) {
        context.addIssue({
          code: 'custom',
          message: `Duplicate group output ${outputId}.`,
          path: ['groupBy', index],
        });
      }
      groupedOutputIds.add(outputId);
      const output = outputsById.get(outputId);
      if (output == null) {
        context.addIssue({
          code: 'custom',
          message: `Unknown group output ${outputId}.`,
          path: ['groupBy', index],
        });
      } else if (isAggregateOutput(output)) {
        context.addIssue({
          code: 'custom',
          message: `Aggregate output ${outputId} cannot be a group key.`,
          path: ['groupBy', index],
        });
      }
    });

    const aggregateOutputs = recipe.outputs.filter(isAggregateOutput);
    if (aggregateOutputs.length > 0) {
      recipe.outputs.forEach((output, index) => {
        if (!isAggregateOutput(output) && !groupedOutputIds.has(output.id)) {
          context.addIssue({
            code: 'custom',
            message: `Non-aggregate output ${output.id} must be grouped in an aggregate recipe.`,
            path: ['outputs', index],
          });
        }
      });
    }

    (recipe.having ?? []).forEach((filter, index) => {
      const output = outputsById.get(filter.outputId);
      if (output == null) {
        context.addIssue({
          code: 'custom',
          message: `Unknown HAVING output ${filter.outputId}.`,
          path: ['having', index, 'outputId'],
        });
      } else if (!isAggregateOutput(output)) {
        context.addIssue({
          code: 'custom',
          message: `HAVING output ${filter.outputId} must reference an aggregate output in the VTX2 MVP.`,
          path: ['having', index, 'outputId'],
        });
      }
    });
    if ((recipe.having?.length ?? 0) > 0 && aggregateOutputs.length === 0) {
      context.addIssue({
        code: 'custom',
        message: 'HAVING requires at least one aggregate output.',
        path: ['having'],
      });
    }
  });

const SqlTransformAuthoringAuthorityV1Schema = z
  .object({
    version: z.literal(VISUAL_TRANSFORM_RECIPE_VERSION),
    mode: z.literal(DVT_TRANSFORM_AUTHORING_MODE.sql),
  })
  .strict();
const VisualTransformAuthoringAuthorityV1Schema = z
  .object({
    version: z.literal(VISUAL_TRANSFORM_RECIPE_VERSION),
    mode: z.literal(DVT_TRANSFORM_AUTHORING_MODE.visual),
    recipe: VisualTransformRecipeV1Schema,
  })
  .strict();

export const DvtTransformAuthoringAuthorityV1Schema = z.discriminatedUnion('mode', [
  SqlTransformAuthoringAuthorityV1Schema,
  VisualTransformAuthoringAuthorityV1Schema,
]);

export type VisualTransformColumnInputRefV1 = z.infer<typeof VisualTransformColumnInputRefV1Schema>;
export type VisualTransformOperationV1 = z.infer<typeof VisualTransformOperationV1Schema>;
export type VisualTransformExpressionV1 = z.infer<typeof VisualTransformExpressionV1Schema>;
export type VisualTransformOutputColumnV1 = z.infer<typeof VisualTransformOutputColumnV1Schema>;
export type VisualTransformFilterV1 = z.infer<typeof VisualTransformFilterV1Schema>;
export type VisualTransformHavingFilterV1 = z.infer<typeof VisualTransformHavingFilterV1Schema>;
export type VisualTransformRecipeV1 = z.infer<typeof VisualTransformRecipeV1Schema>;
export type DvtTransformAuthoringAuthorityV1 = z.infer<
  typeof DvtTransformAuthoringAuthorityV1Schema
>;

export function canonicalizeVisualTransformRecipeV1(input: unknown): VisualTransformRecipeV1 {
  return VisualTransformRecipeV1Schema.parse(input);
}

export function serializeVisualTransformRecipeV1(input: unknown): string {
  return JSON.stringify(canonicalizeVisualTransformRecipeV1(input));
}
