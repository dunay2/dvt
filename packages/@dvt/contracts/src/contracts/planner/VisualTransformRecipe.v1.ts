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

import { DvtSubstraitSemanticDocumentV1Schema } from './DvtSubstraitProfile.v1.js';

const NonBlankStringSchema = z.string().trim().min(1);
const JsonScalarSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);

export const VISUAL_TRANSFORM_RECIPE_VERSION = 'v1' as const;
export const DVT_TRANSFORM_AUTHORING_MODE = {
  sql: 'sql',
  visual: 'visual',
  substrait: 'substrait',
} as const;
export const VISUAL_TRANSFORM_FUNCTION_ID = {
  trim: 'trim',
  upper: 'upper',
  lower: 'lower',
  coalesce: 'coalesce',
  concat: 'concat',
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

export const VisualTransformOperationV1Schema = z.discriminatedUnion('kind', [
  VisualTransformPassthroughOperationV1Schema,
  VisualTransformCastOperationV1Schema,
  VisualTransformFunctionOperationV1Schema,
  VisualTransformConstantOperationV1Schema,
]);

export const VisualTransformExpressionV1Schema = z
  .object({
    inputs: z.array(VisualTransformColumnInputRefV1Schema),
    operations: z.array(VisualTransformOperationV1Schema).min(1),
  })
  .strict();

export const VisualTransformOutputColumnV1Schema = z
  .object({
    id: NonBlankStringSchema,
    name: NonBlankStringSchema,
    dataType: NonBlankStringSchema.optional(),
    expression: VisualTransformExpressionV1Schema,
  })
  .strict();

const ValueComparisonFilterV1Schema = z
  .object({
    id: NonBlankStringSchema,
    input: VisualTransformColumnInputRefV1Schema,
    operator: z.enum([
      VISUAL_TRANSFORM_FILTER_OPERATOR.equals,
      VISUAL_TRANSFORM_FILTER_OPERATOR.notEquals,
      VISUAL_TRANSFORM_FILTER_OPERATOR.greaterThan,
      VISUAL_TRANSFORM_FILTER_OPERATOR.greaterThanOrEqual,
      VISUAL_TRANSFORM_FILTER_OPERATOR.lessThan,
      VISUAL_TRANSFORM_FILTER_OPERATOR.lessThanOrEqual,
    ]),
    value: JsonScalarSchema,
  })
  .strict();
const NullComparisonFilterV1Schema = z
  .object({
    id: NonBlankStringSchema,
    input: VisualTransformColumnInputRefV1Schema,
    operator: z.enum([
      VISUAL_TRANSFORM_FILTER_OPERATOR.isNull,
      VISUAL_TRANSFORM_FILTER_OPERATOR.isNotNull,
    ]),
  })
  .strict();

export const VisualTransformFilterV1Schema = z.discriminatedUnion('operator', [
  ValueComparisonFilterV1Schema,
  NullComparisonFilterV1Schema,
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

export const VisualTransformRecipeV1Schema = z
  .object({
    version: z.literal(VISUAL_TRANSFORM_RECIPE_VERSION),
    outputs: z.array(VisualTransformOutputColumnV1Schema),
    filters: z.array(VisualTransformFilterV1Schema),
  })
  .strict()
  .superRefine((recipe, context) => {
    addDuplicateIdIssues(recipe.outputs, ['outputs'], context);
    addDuplicateIdIssues(recipe.filters, ['filters'], context);
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
const SubstraitTransformAuthoringAuthorityV1Schema = z
  .object({
    version: z.literal(VISUAL_TRANSFORM_RECIPE_VERSION),
    mode: z.literal(DVT_TRANSFORM_AUTHORING_MODE.substrait),
    semanticDocument: DvtSubstraitSemanticDocumentV1Schema,
  })
  .strict();

export const DvtTransformAuthoringAuthorityV1Schema = z.discriminatedUnion('mode', [
  SqlTransformAuthoringAuthorityV1Schema,
  VisualTransformAuthoringAuthorityV1Schema,
  SubstraitTransformAuthoringAuthorityV1Schema,
]);

export type VisualTransformColumnInputRefV1 = z.infer<typeof VisualTransformColumnInputRefV1Schema>;
export type VisualTransformOperationV1 = z.infer<typeof VisualTransformOperationV1Schema>;
export type VisualTransformExpressionV1 = z.infer<typeof VisualTransformExpressionV1Schema>;
export type VisualTransformOutputColumnV1 = z.infer<typeof VisualTransformOutputColumnV1Schema>;
export type VisualTransformFilterV1 = z.infer<typeof VisualTransformFilterV1Schema>;
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
