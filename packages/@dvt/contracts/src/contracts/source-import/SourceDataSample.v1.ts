/**
 * Owned concern: define the bounded, display-safe warehouse source data sample contract.
 *
 * @baseline ADR-0058: Warehouse Source Import Rails
 * @decision Keep row samples separate from source-object catalog discovery and reject client SQL.
 * @consequence API and web exchange only governed object identity, bounded rows, and display values.
 * @version 1.0.0
 */
import { z } from 'zod';

import { SourceObjectColumnSchema } from './SourceObjectCatalog.v1.js';

export const SOURCE_DATA_SAMPLE_CONTRACT_VERSION = 1 as const;
export const SOURCE_DATA_SAMPLE_DEFAULT_LIMIT = 20 as const;
export const SOURCE_DATA_SAMPLE_MAX_LIMIT = 50 as const;

const NonBlankStringSchema = z.string().trim().min(1);
const CanonicalIsoTimestampSchema = z
  .string()
  .refine(
    (value) => Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value,
    'Expected a canonical ISO-8601 timestamp.'
  );

export const SourceDataSampleRequestSchema = z
  .object({
    connectionId: NonBlankStringSchema,
    objectId: NonBlankStringSchema.refine(
      (objectId) => objectId.startsWith('relation/'),
      'Source data samples require a relational source object ID.'
    ),
    limit: z
      .number()
      .int()
      .positive()
      .max(SOURCE_DATA_SAMPLE_MAX_LIMIT)
      .default(SOURCE_DATA_SAMPLE_DEFAULT_LIMIT),
  })
  .strict();

export const SourceDataSampleRowSchema = z
  .object({
    values: z.array(z.string().nullable()).max(SOURCE_DATA_SAMPLE_MAX_LIMIT),
  })
  .strict();

export const SourceDataSampleResponseSchema = z
  .object({
    contractVersion: z.literal(SOURCE_DATA_SAMPLE_CONTRACT_VERSION),
    connectionId: NonBlankStringSchema,
    objectId: NonBlankStringSchema,
    columns: z.array(SourceObjectColumnSchema).max(SOURCE_DATA_SAMPLE_MAX_LIMIT),
    rows: z.array(SourceDataSampleRowSchema).max(SOURCE_DATA_SAMPLE_MAX_LIMIT),
    limit: z.number().int().positive().max(SOURCE_DATA_SAMPLE_MAX_LIMIT),
    truncated: z.boolean(),
    sampledAt: CanonicalIsoTimestampSchema,
  })
  .strict()
  .superRefine((sample, context) => {
    sample.rows.forEach((row, rowIndex) => {
      if (row.values.length !== sample.columns.length) {
        context.addIssue({
          code: 'custom',
          message: 'Source data sample row values must match the projected columns.',
          path: ['rows', rowIndex, 'values'],
        });
      }
    });

    if (sample.rows.length > sample.limit) {
      context.addIssue({
        code: 'custom',
        message: 'Source data sample rows must not exceed the requested limit.',
        path: ['rows'],
      });
    }
  });

export type SourceDataSampleRequest = z.infer<typeof SourceDataSampleRequestSchema>;
export type SourceDataSampleRow = z.infer<typeof SourceDataSampleRowSchema>;
export type SourceDataSampleResponse = z.infer<typeof SourceDataSampleResponseSchema>;
