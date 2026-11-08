/** Read-only SQL inspection for one protected canonical Transform revision. */
import { z } from 'zod';

import { isSha256HexString } from '../../utils/contractPrimitives.js';
import { ConnectedSourceRefSchema } from '../source-import/ConnectedSourceRef.v1.js';

const NonBlankStringSchema = z.string().trim().min(1);
const Sha256Schema = z.string().refine(isSha256HexString);

export const TransformSqlProjectionRequestSchema = z
  .object({
    canvasId: NonBlankStringSchema,
    transformNodeId: NonBlankStringSchema,
    semanticPlanSha256: Sha256Schema,
  })
  .strict();

export const TransformSqlProjectionResponseSchema = z
  .object({
    schemaVersion: z.literal('canvas-transform-sql-projection.v1'),
    canvasId: NonBlankStringSchema,
    transformNodeId: NonBlankStringSchema,
    draftRevision: NonBlankStringSchema,
    semanticPlanSha256: Sha256Schema,
    sql: z.string().refine((value) => value.trim().length > 0),
    provenance: z
      .object({
        sourceRefs: z.array(ConnectedSourceRefSchema),
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
      .refine((value) => value.sourceRefs.length > 0 || (value.modelRefs?.length ?? 0) > 0, {
        message: 'SQL projection requires an authorized physical source or model revision.',
      }),
  })
  .strict();

export type TransformSqlProjectionRequest = z.infer<typeof TransformSqlProjectionRequestSchema>;
export type TransformSqlProjectionResponse = z.infer<typeof TransformSqlProjectionResponseSchema>;
