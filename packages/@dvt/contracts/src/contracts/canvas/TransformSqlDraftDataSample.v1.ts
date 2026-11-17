/**
 * Owned concern: carry an explicit SQL-source Preview through the existing bounded row contract.
 * @baseline GH-3944: saved-Model Preview remains strict and never accepts SQL.
 * @decision Bind row results to the source buffer and protected context without graph mutation.
 */
import { z } from 'zod';

import { ModelSqlCompilationRequestSchema } from './ModelSqlCompilation.v1.js';
import { ModelSqlDigestSchema } from './ModelSqlContext.v1.js';
import {
  TRANSFORM_DATA_SAMPLE_DEFAULT_LIMIT,
  TRANSFORM_DATA_SAMPLE_MAX_LIMIT,
  TransformDataSampleResponseSchema,
} from './TransformDataSample.v1.js';

export const TransformSqlDraftDataSampleRequestSchema = ModelSqlCompilationRequestSchema.extend({
  schemaVersion: z.literal('canvas-transform-sql-draft-data-sample.v1'),
  limit: z
    .number()
    .int()
    .positive()
    .max(TRANSFORM_DATA_SAMPLE_MAX_LIMIT)
    .default(TRANSFORM_DATA_SAMPLE_DEFAULT_LIMIT),
}).strict();

export const TransformSqlDraftDataSampleResponseSchema = z
  .object({
    schemaVersion: z.literal('canvas-transform-sql-draft-data-sample.v1'),
    contextSha256: ModelSqlDigestSchema,
    sqlSha256: ModelSqlDigestSchema,
    sample: TransformDataSampleResponseSchema,
  })
  .strict();

export type TransformSqlDraftDataSampleRequest = z.infer<
  typeof TransformSqlDraftDataSampleRequestSchema
>;
export type TransformSqlDraftDataSampleResponse = z.infer<
  typeof TransformSqlDraftDataSampleResponseSchema
>;
