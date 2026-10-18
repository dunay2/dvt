/**
 * Owned concern: validate a single acquisition attempt and its completion correspondence.
 * @baseline ADR-0035: Planner Public Contract Evolution Protocol
 * @decision Terminal attempts cannot restart; dataset WorkingDataState remains owned by DataAccess.v1.
 * @consequence Retry allocates a new capture; completion must match an actual generation manifest.
 * @version 1.0.0
 */
import { z } from 'zod';

import { LocalDataGenerationManifestV1Schema } from './LocalDataGeneration.v1.js';
import {
  LocalDatasetIdV1Schema,
  LocalDataCaptureIdV1Schema,
  LocalDataGenerationIdV1Schema,
} from './LocalDataIdentity.v1.js';
import { localDataCaptureTransition, localDataCompletionMatches } from './localDataInvariants.js';
import { LocalDataSha256Schema, LocalDataTimestampSchema } from './localDataPrimitives.js';

const CaptureBaseSchema = z
  .object({
    schemaVersion: z.literal('local-data-capture.v1'),
    localDatasetId: LocalDatasetIdV1Schema,
    captureId: LocalDataCaptureIdV1Schema,
    requestFingerprint: LocalDataSha256Schema,
    requestedAt: LocalDataTimestampSchema,
    updatedAt: LocalDataTimestampSchema,
  })
  .strict();

export const LocalDataCaptureRecordV1Schema = z
  .discriminatedUnion('status', [
    CaptureBaseSchema.extend({ status: z.literal('requested') }).strict(),
    CaptureBaseSchema.extend({ status: z.literal('capturing') }).strict(),
    CaptureBaseSchema.extend({
      status: z.literal('completed'),
      generationId: LocalDataGenerationIdV1Schema,
    }).strict(),
    CaptureBaseSchema.extend({
      status: z.literal('failed'),
      failureCode: z.enum([
        'admission-rejected',
        'source-failed',
        'integrity-failed',
        'budget-exceeded',
        'storage-failed',
      ]),
    }).strict(),
    CaptureBaseSchema.extend({ status: z.literal('cancelled') }).strict(),
  ])
  .superRefine((capture, context) => {
    if (capture.updatedAt < capture.requestedAt) {
      context.addIssue({
        code: 'custom',
        path: ['updatedAt'],
        message: 'An attempt update cannot precede its request.',
      });
    }
  });
export type LocalDataCaptureRecordV1 = z.infer<typeof LocalDataCaptureRecordV1Schema>;

export function isLocalDataCaptureTransitionAllowedV1(previous: unknown, next: unknown): boolean {
  const before = LocalDataCaptureRecordV1Schema.safeParse(previous);
  const after = LocalDataCaptureRecordV1Schema.safeParse(next);
  return before.success && after.success && localDataCaptureTransition(before.data, after.data);
}

/** Structural correspondence only: calling this is not an atomic commit or a permission check. */
export function matchesLocalDataCaptureCompletionV1(
  capture: unknown,
  generation: unknown
): boolean {
  const attempt = LocalDataCaptureRecordV1Schema.safeParse(capture);
  const manifest = LocalDataGenerationManifestV1Schema.safeParse(generation);
  return (
    attempt.success && manifest.success && localDataCompletionMatches(attempt.data, manifest.data)
  );
}
