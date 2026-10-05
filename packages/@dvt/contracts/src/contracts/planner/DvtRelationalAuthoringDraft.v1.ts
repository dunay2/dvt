/**
 * Owned concern: persist incomplete relational authoring without pretending it is executable
 * Substrait semantics.
 *
 * @baseline ADR-0064: Substrait semantic reference and bounded logical profile
 * @decision Store occurrence identity, operation ports and layout as a versioned authoring DTO.
 * @version 1.0.0
 */
import { z } from 'zod';

import {
  DVT_RELATIONAL_OPERATION_INPUTS,
  acceptsDvtRelationalOperationInputCount,
  type DvtRelationalOperationKind,
} from './DvtRelationalOperationInputs.js';
import { decodeDvtSubstraitPlanV1 } from './DvtSubstraitPlanBinary.v1.js';
import { validateDvtSubstraitReadFieldCoverageV1 } from './DvtSubstraitReadFieldCoverage.v1.js';
import { DvtSubstraitSemanticDocumentV1Schema } from './DvtSubstraitSemanticDocument.v1.js';

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
const OperationSchema = z.enum(
  Object.keys(DVT_RELATIONAL_OPERATION_INPUTS) as [
    DvtRelationalOperationKind,
    ...DvtRelationalOperationKind[],
  ]
);
const SourceSchema = z
  .object({
    relationId: NonBlankStringSchema,
    sourceNodeId: NonBlankStringSchema,
    displayName: NonBlankStringSchema,
    semanticDocument: DvtSubstraitSemanticDocumentV1Schema,
  })
  .strict();
const OperationDraftSchema = z
  .object({
    relationId: NonBlankStringSchema,
    operation: OperationSchema,
    inputs: z.array(NonBlankStringSchema.nullable()).min(1),
    semanticDocument: DvtSubstraitSemanticDocumentV1Schema.optional(),
    configurationDocument: DvtSubstraitSemanticDocumentV1Schema.optional(),
  })
  .strict();

export const DvtRelationalAuthoringDraftV1Schema = z
  .object({
    version: z.literal(DVT_RELATIONAL_AUTHORING_DRAFT_VERSION),
    sources: z.array(SourceSchema),
    operations: z.array(OperationDraftSchema),
    outputRelationId: NonBlankStringSchema.nullable().optional(),
    positions: z.record(NonBlankStringSchema, PositionSchema),
  })
  .strict()
  .superRefine((draft, context) => {
    if (
      draft.outputRelationId === undefined &&
      (draft.sources.length > 0 || draft.operations.length > 0)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['outputRelationId'],
        message: 'Pending authoring requires explicit terminal intent.',
      });
    }
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
      const document = source.semanticDocument;
      let validRead = false;
      try {
        const plan = decodeDvtSubstraitPlanV1(document);
        const root = plan.relations[0]?.relType;
        const relation = root?.case === 'root' ? root.value.input : null;
        validRead = plan.relations.length === 1 && relation?.relType.case === 'read';
        if (validRead && relation?.relType.case === 'read') {
          const error = validateDvtSubstraitReadFieldCoverageV1(
            relation.relType.value.baseSchema?.struct?.types ?? [],
            document.sidecar.fields
          );
          if (error != null)
            context.addIssue({
              code: 'custom',
              path: ['sources', index, 'semanticDocument', 'sidecar', 'fields'],
              message: error,
            });
        }
      } catch {
        // The nested semantic-document parser reports corrupt bytes; never throw from safeParse.
      }
      if (
        !validRead ||
        document.sidecar.relations.length !== 1 ||
        document.sidecar.relations[0]?.relationId !== source.relationId ||
        document.sidecar.fields.length === 0 ||
        (document.sidecar.relations[0]?.sourceRef == null &&
          document.sidecar.relations[0]?.producerRef == null) ||
        (document.sidecar.relations[0]?.producerRef != null &&
          document.sidecar.relations[0].producerRef.nodeId !== source.sourceNodeId)
      )
        context.addIssue({
          code: 'custom',
          path: ['sources', index, 'semanticDocument'],
          message: 'A pending source must own one canonical Read with matching provenance.',
        });
    });
    draft.operations.forEach((operation, index) => {
      if (operation.configurationDocument != null) {
        if (
          operation.semanticDocument != null ||
          !operation.configurationDocument.sidecar.relations.some(
            (relation) => relation.relationId === operation.relationId
          )
        )
          context.addIssue({
            code: 'custom',
            path: ['operations', index, 'configurationDocument'],
            message:
              'Retained configuration must own this operation and cannot be executable simultaneously.',
          });
      }
      if (!acceptsDvtRelationalOperationInputCount(operation.operation, operation.inputs.length))
        context.addIssue({
          code: 'custom',
          path: ['operations', index, 'inputs'],
          message: `Operation ${operation.operation} has invalid input cardinality.`,
        });
      if (operation.semanticDocument != null && operation.inputs.some((input) => input == null))
        context.addIssue({
          code: 'custom',
          path: ['operations', index, 'semanticDocument'],
          message: 'A semantic staged operation requires every input port.',
        });
      if (
        operation.semanticDocument != null &&
        !operation.semanticDocument.sidecar.relations.some(
          (relation) => relation.relationId === operation.relationId
        )
      )
        context.addIssue({
          code: 'custom',
          path: ['operations', index, 'semanticDocument'],
          message: 'A semantic staged operation must own its output relation identity.',
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
  });

export type DvtRelationalAuthoringDraftV1 = z.infer<typeof DvtRelationalAuthoringDraftV1Schema>;
