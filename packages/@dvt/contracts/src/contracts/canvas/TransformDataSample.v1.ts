/**
 * Owned concern: define a bounded, display-safe sample of one protected Canvas Transform.
 * @baseline ADR-0064: Substrait Semantic Reference And Bounded Logical Profile
 * @decision Explore a protected Transform through semantic identity and server-owned bounds, never client SQL.
 * @consequence API and Web exchange only the Transform identity, bounded rows, and display-safe values.
 * @version 1.0.0
 */
import { z } from 'zod';

import { isSha256HexString } from '../../utils/contractPrimitives.js';
import { SourceObjectColumnSchema } from '../source-import/SourceObjectCatalog.js';

export const TRANSFORM_DATA_SAMPLE_CONTRACT_VERSION = 1 as const;
export const TRANSFORM_DATA_SAMPLE_DEFAULT_LIMIT = 20 as const;
export const TRANSFORM_DATA_SAMPLE_MAX_LIMIT = 50 as const;
export const TRANSFORM_DATA_SAMPLE_MAX_COLUMNS = 512 as const;

const NonBlankStringSchema = z.string().trim().min(1);
const CanonicalIsoTimestampSchema = z
  .string()
  .refine(
    (value) => Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value,
    'Expected a canonical ISO-8601 timestamp.'
  );

export const TransformDataSampleRequestSchema = z
  .object({
    canvasId: NonBlankStringSchema,
    transformNodeId: NonBlankStringSchema,
    limit: z
      .number()
      .int()
      .positive()
      .max(TRANSFORM_DATA_SAMPLE_MAX_LIMIT)
      .default(TRANSFORM_DATA_SAMPLE_DEFAULT_LIMIT),
  })
  .strict();

export const TransformDataSampleRowSchema = z
  .object({
    values: z.array(z.string().nullable()).max(TRANSFORM_DATA_SAMPLE_MAX_COLUMNS),
  })
  .strict();

export const TransformDataSampleResponseSchema = z
  .object({
    contractVersion: z.literal(TRANSFORM_DATA_SAMPLE_CONTRACT_VERSION),
    canvasId: NonBlankStringSchema,
    transformNodeId: NonBlankStringSchema,
    draftRevision: NonBlankStringSchema,
    semanticPlanSha256: NonBlankStringSchema.refine(isSha256HexString, {
      message: 'Expected a lowercase SHA-256 semantic plan digest.',
    }),
    columns: z.array(SourceObjectColumnSchema).max(TRANSFORM_DATA_SAMPLE_MAX_COLUMNS),
    rows: z.array(TransformDataSampleRowSchema).max(TRANSFORM_DATA_SAMPLE_MAX_LIMIT),
    limit: z.number().int().positive().max(TRANSFORM_DATA_SAMPLE_MAX_LIMIT),
    truncated: z.boolean(),
    sampledAt: CanonicalIsoTimestampSchema,
  })
  .strict()
  .superRefine((sample, context) => {
    sample.rows.forEach((row, rowIndex) => {
      if (row.values.length !== sample.columns.length) {
        context.addIssue({
          code: 'custom',
          message: 'Transform data sample row values must match the projected columns.',
          path: ['rows', rowIndex, 'values'],
        });
      }
    });
    if (sample.rows.length > sample.limit) {
      context.addIssue({
        code: 'custom',
        message: 'Transform data sample rows must not exceed the requested limit.',
        path: ['rows'],
      });
    }
  });

export type TransformDataSampleRequest = z.infer<typeof TransformDataSampleRequestSchema>;
export type TransformDataSampleRow = z.infer<typeof TransformDataSampleRowSchema>;
export type TransformDataSampleResponse = z.infer<typeof TransformDataSampleResponseSchema>;
