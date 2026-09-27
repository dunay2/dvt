/**
 * Owned concern: persist incomplete relational authoring without pretending it is executable
 * Substrait semantics.
 *
 * @baseline ADR-0064: Substrait semantic reference and bounded logical profile
 * @decision Store occurrence identity, operation ports and layout as a versioned authoring DTO.
 * @version 1.0.0
 */
import { z } from 'zod';

export const DVT_RELATIONAL_AUTHORING_DRAFT_METADATA_KEY = 'relationalAuthoringDraft' as const;
export const DVT_RELATIONAL_AUTHORING_DRAFT_VERSION = 'v1' as const;

const NonBlankStringSchema = z
  .string()
  .refine(
    (value) => value.length > 0 && value === value.trim(),
    'Expected a non-blank string without exterior whitespace.'
  );
const PositionSchema = z
  .object({ x: z.number().finite().nonnegative(), y: z.number().finite().nonnegative() })
  .strict();
const OperationSchema = z.enum([
  'projection',
  'field_transform',
  'filter',
  'aggregate',
  'window',
  'sort',
  'fetch',
  'inner_join',
  'left_join',
  'right_join',
  'full_outer_join',
  'left_semi_join',
  'left_anti_join',
  'right_semi_join',
  'right_anti_join',
  'cross_join',
  'union_all',
  'union_distinct',
  'intersect_distinct',
  'except_distinct',
  'intersect_all',
  'except_all',
]);
const BinaryOperations = new Set<string>([
  'inner_join',
  'left_join',
  'right_join',
  'full_outer_join',
  'left_semi_join',
  'left_anti_join',
  'right_semi_join',
  'right_anti_join',
  'cross_join',
  'union_all',
  'union_distinct',
  'intersect_distinct',
  'except_distinct',
  'intersect_all',
  'except_all',
]);

const SourceSchema = z
  .object({
    relationId: NonBlankStringSchema,
    sourceNodeId: NonBlankStringSchema,
    displayName: NonBlankStringSchema,
    fieldIds: z.array(NonBlankStringSchema).min(1),
  })
  .strict();
const OperationDraftSchema = z
  .object({
    relationId: NonBlankStringSchema,
    operation: OperationSchema,
    inputs: z.array(NonBlankStringSchema.nullable()).min(1).max(2),
  })
  .strict();

export const DvtRelationalAuthoringDraftV1Schema = z
  .object({
    version: z.literal(DVT_RELATIONAL_AUTHORING_DRAFT_VERSION),
    sources: z.array(SourceSchema),
    operations: z.array(OperationDraftSchema),
    outputRelationId: NonBlankStringSchema.nullable(),
    positions: z.record(NonBlankStringSchema, PositionSchema),
  })
  .strict()
  .superRefine((draft, context) => {
    const ids = [
      ...draft.sources.map((source) => source.relationId),
      ...draft.operations.map((operation) => operation.relationId),
    ];
    if (new Set(ids).size !== ids.length) {
      context.addIssue({
        code: 'custom',
        path: ['operations'],
        message: 'Draft relation identities must be unique.',
      });
    }
    draft.sources.forEach((source, index) => {
      if (new Set(source.fieldIds).size !== source.fieldIds.length)
        context.addIssue({
          code: 'custom',
          path: ['sources', index, 'fieldIds'],
          message: 'Occurrence field identities must be unique.',
        });
    });
    draft.operations.forEach((operation, index) => {
      const arity = BinaryOperations.has(operation.operation) ? 2 : 1;
      if (operation.inputs.length !== arity)
        context.addIssue({
          code: 'custom',
          path: ['operations', index, 'inputs'],
          message: `Operation ${operation.operation} requires ${arity} input port(s).`,
        });
    });
    const operationIds = new Set(draft.operations.map((operation) => operation.relationId));
    const byId = new Map(draft.operations.map((operation) => [operation.relationId, operation]));
    const visits = new Set<string>();
    const stack = new Set<string>();
    const cyclic = (id: string): boolean => {
      if (stack.has(id)) return true;
      if (visits.has(id)) return false;
      visits.add(id);
      stack.add(id);
      const found =
        byId
          .get(id)
          ?.inputs.some((input) => input != null && operationIds.has(input) && cyclic(input)) ??
        false;
      stack.delete(id);
      return found;
    };
    if (draft.operations.some((operation) => cyclic(operation.relationId)))
      context.addIssue({
        code: 'custom',
        path: ['operations'],
        message: 'Draft operation graph must be acyclic.',
      });
    const positioned = Object.keys(draft.positions);
    if (positioned.some((id) => !ids.includes(id)))
      context.addIssue({
        code: 'custom',
        path: ['positions'],
        message: 'Draft positions may reference only draft nodes.',
      });
  });

export type DvtRelationalAuthoringDraftV1 = z.infer<typeof DvtRelationalAuthoringDraftV1Schema>;
