/**
 * Owned concern: define revision-bound SQL inspection contracts for one protected Canvas Transform.
 * @baseline ADR-0064: Substrait Semantic Reference And Bounded Logical Profile
 * @decision Exchange target identity, expected semantic digest, authorized SQL and exact producer provenance.
 * @consequence SQL remains a derived read model without granting row execution or semantic write authority.
 * @version 1.0.0
 */
import { z } from 'zod';

import { isSha256HexString } from '../../utils/contractPrimitives.js';
import { ConnectedSourceRefSchema } from '../source-import/ConnectedSourceRef.v1.js';

import {
  CanvasLiteralModelProvenanceSchema,
  hasCanvasModelProvenance,
  matchesCanvasLiteralPlan,
} from './CanvasLiteralModelProvenance.v1.js';

const NonBlankStringSchema = z.string().trim().min(1);
const Sha256Schema = z.string().refine(isSha256HexString);
const SqlTextSchema = z.string().refine((value) => value.trim().length > 0);
const PresentationStepSchema = z
  .object({
    rule: z.enum([
      'SQLREAD1.PROJECTION_FUSION',
      'SQLREAD1.PREDICATE_PUSHDOWN',
      'SQLREAD1.COLUMN_PRUNING',
      'SQLREAD1.TRANSPARENT_SUBQUERY',
    ]),
    path: NonBlankStringSchema,
  })
  .strict();

export const TransformSqlPresentationSchema = z.discriminatedUnion('status', [
  z
    .object({
      status: z.literal('rewritten'),
      sql: SqlTextSchema,
      steps: z.array(PresentationStepSchema).min(1).max(256),
    })
    .strict(),
  z
    .object({
      status: z.literal('unchanged'),
      sql: SqlTextSchema,
      steps: z.array(PresentationStepSchema).max(0),
    })
    .strict(),
  z
    .object({
      status: z.literal('retained'),
      diagnostic: z.object({ code: NonBlankStringSchema, path: NonBlankStringSchema }).strict(),
    })
    .strict(),
]);

export const TransformSqlProjectionRequestSchema = z
  .object({
    canvasId: NonBlankStringSchema,
    transformNodeId: NonBlankStringSchema,
    semanticPlanSha256: Sha256Schema,
    relationId: NonBlankStringSchema.optional(),
    presentation: z.literal('readable').optional(),
  })
  .strict();

export const TransformSqlProjectionResponseSchema = z
  .object({
    schemaVersion: z.literal('canvas-transform-sql-projection.v1'),
    canvasId: NonBlankStringSchema,
    transformNodeId: NonBlankStringSchema,
    draftRevision: NonBlankStringSchema,
    semanticPlanSha256: Sha256Schema,
    relationId: NonBlankStringSchema.optional(),
    sql: SqlTextSchema,
    presentation: TransformSqlPresentationSchema.optional(),
    provenance: z
      .object({
        sourceRefs: z.array(ConnectedSourceRefSchema),
        literalModel: CanvasLiteralModelProvenanceSchema.optional(),
        modelRefs: z
          .array(
            z
              .object({
                canvasId: NonBlankStringSchema,
                uniqueId: NonBlankStringSchema,
                contentSetSha256: Sha256Schema,
                analysisSha256: Sha256Schema,
              })
              .strict()
          )
          .min(1)
          .optional(),
      })
      .strict()
      .refine(hasCanvasModelProvenance, {
        message:
          'SQL projection requires exact physical, file-model or literal execution authority.',
      }),
  })
  .strict()
  .refine(matchesCanvasLiteralPlan, {
    message: 'Literal provenance must match the selected semantic plan.',
    path: ['provenance', 'literalModel'],
  });

export type TransformSqlProjectionRequest = z.infer<typeof TransformSqlProjectionRequestSchema>;
export type TransformSqlProjectionResponse = z.infer<typeof TransformSqlProjectionResponseSchema>;
export type TransformSqlPresentation = z.infer<typeof TransformSqlPresentationSchema>;
