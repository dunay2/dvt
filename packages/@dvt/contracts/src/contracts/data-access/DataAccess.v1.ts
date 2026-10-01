/**
 * Owned concern: distinguish remote LIVE reads from pinned LOCAL working-data generations.
 * @baseline ADR-0058: Warehouse Source Import Rails
 * @baseline ADR-0064: Substrait Semantic Reference And Bounded Logical Profile
 * @decision Mode, provisional state and preview provenance are explicit values, not UI inference.
 * @consequence Preview/Run adapters must authorize and resolve a requested READY generation before LOCAL execution.
 * @version 1.0.0
 */
import { z } from 'zod';

import { isIsoUtcString } from '../../utils/contractPrimitives.js';
import { ConnectedSourceRefSchema } from '../source-import/ConnectedSourceRef.v1.js';

const OpaqueIdSchema = z
  .string()
  .refine(
    (value) => value.length > 0 && value.length <= 256 && value === value.trim(),
    'Expected a bounded, non-blank opaque identifier without exterior whitespace.'
  );
const CapturedAtSchema = z.string().refine(isIsoUtcString, 'Expected a canonical UTC timestamp.');
const PositiveRowLimitSchema = z.number().int().positive();

const LiveSelectionSchema = z.object({ mode: z.literal('live') }).strict();
const LocalSelectionSchema = z
  .object({
    mode: z.literal('local'),
    localDatasetId: OpaqueIdSchema,
    generationId: OpaqueIdSchema,
  })
  .strict();

export const DataAccessSelectionSchema = z.discriminatedUnion('mode', [
  LiveSelectionSchema,
  LocalSelectionSchema,
]);

const ProvisionalStateSchema = z
  .object({
    status: z.enum(['seed', 'building']),
    captureId: OpaqueIdSchema,
    previousReadyGenerationId: OpaqueIdSchema.optional(),
  })
  .strict();
const InterruptedStateSchema = z
  .object({
    status: z.enum(['failed', 'cancelled']),
    captureId: OpaqueIdSchema,
    previousReadyGenerationId: OpaqueIdSchema.optional(),
  })
  .strict();

export const WorkingDataStateSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('absent') }).strict(),
  ProvisionalStateSchema,
  z
    .object({ status: z.literal('ready'), captureId: OpaqueIdSchema, generationId: OpaqueIdSchema })
    .strict(),
  InterruptedStateSchema,
]);

export const WorkingDataCoverageSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('sample') }).strict(),
  z.object({ kind: z.literal('full'), eofObserved: z.literal(true) }).strict(),
]);

export const DataPreviewProvenanceSchema = z.discriminatedUnion('mode', [
  z
    .object({
      mode: z.literal('live'),
      sourceRefs: z.array(ConnectedSourceRefSchema).min(1),
      queriedAt: CapturedAtSchema,
      limit: PositiveRowLimitSchema,
      navigation: z.enum(['bounded-first-page', 'cursor', 'keyset', 'unavailable']),
    })
    .strict(),
  LocalSelectionSchema.safeExtend({
    capturedAt: CapturedAtSchema,
    limit: PositiveRowLimitSchema,
    coverage: WorkingDataCoverageSchema,
  }).strict(),
]);

export type DataAccessSelection = z.infer<typeof DataAccessSelectionSchema>;
export type WorkingDataState = z.infer<typeof WorkingDataStateSchema>;
export type WorkingDataCoverage = z.infer<typeof WorkingDataCoverageSchema>;
export type DataPreviewProvenance = z.infer<typeof DataPreviewProvenanceSchema>;

/** Structural admission only; authorization, integrity and atomic promotion remain server-owned. */
export function isWorkingDataTransitionAllowed(previous: unknown, next: unknown): boolean {
  const parsedPrevious = WorkingDataStateSchema.safeParse(previous);
  const parsedNext = WorkingDataStateSchema.safeParse(next);
  if (!parsedPrevious.success || !parsedNext.success) return false;

  const before = parsedPrevious.data;
  const after = parsedNext.data;
  const readyGeneration =
    before.status === 'ready'
      ? before.generationId
      : before.status === 'absent'
        ? undefined
        : before.previousReadyGenerationId;

  if (before.status === 'absent') {
    return (
      (after.status === 'seed' || after.status === 'building') &&
      after.previousReadyGenerationId === undefined
    );
  }

  if (before.status === 'ready' || before.status === 'failed' || before.status === 'cancelled') {
    return (
      (after.status === 'seed' || after.status === 'building') &&
      after.captureId !== before.captureId &&
      after.previousReadyGenerationId === readyGeneration
    );
  }

  if (
    after.status !== 'building' &&
    after.status !== 'ready' &&
    after.status !== 'failed' &&
    after.status !== 'cancelled'
  ) {
    return false;
  }
  if (after.status === 'building' && before.status !== 'seed') return false;
  return (
    after.captureId === before.captureId &&
    (after.status === 'ready'
      ? after.generationId !== readyGeneration
      : after.previousReadyGenerationId === readyGeneration)
  );
}
