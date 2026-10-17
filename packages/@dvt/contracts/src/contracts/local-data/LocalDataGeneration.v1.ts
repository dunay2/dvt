/**
 * Owned concern: validate the immutable metadata of one successful LOCAL generation.
 * @baseline ADR-0058: Warehouse Source Import Rails
 * @decision Reuse coverage/selection contracts; verify schema and request digests and completion facts.
 * @consequence The adapter must still prove EOF, authorization, data fidelity and atomic publication.
 * @version 1.0.0
 */
import { z } from 'zod';

import { DataAccessSelectionSchema, WorkingDataCoverageSchema } from '../data-access/DataAccess.v1.js';
import { LocalDataAcquisitionRequestV1Schema, createLocalDataRequestFingerprintV1 } from './LocalDataAcquisition.v1.js';
import { LocalDatasetIdV1Schema, LocalDataCaptureIdV1Schema, LocalDataGenerationIdV1Schema } from './LocalDataIdentity.v1.js';
import { createLocalDataSchemaDigestV1 } from './LocalDataSchema.v1.js';
import { localDataCoverageErrors } from './localDataInvariants.js';
import { LocalDataCountSchema, LocalDataLabelSchema, LocalDataSha256Schema, LocalDataTimestampSchema } from './localDataPrimitives.js';

export const LocalDataGenerationManifestV1Schema = z.object({
  schemaVersion: z.literal('local-data-generation.v1'),
  localDatasetId: LocalDatasetIdV1Schema,
  captureId: LocalDataCaptureIdV1Schema,
  generationId: LocalDataGenerationIdV1Schema,
  request: LocalDataAcquisitionRequestV1Schema,
  requestFingerprint: LocalDataSha256Schema,
  schemaSha256: LocalDataSha256Schema,
  coverage: WorkingDataCoverageSchema,
  completionReason: z.enum(['source-exhausted', 'sample-target-reached']),
  rowCount: LocalDataCountSchema,
  logicalByteCount: LocalDataCountSchema.optional(),
  sourceObservation: z.object({
    // Server observation during acquisition, not a remote business timestamp or a TTL.
    observedAt: LocalDataTimestampSchema,
    version: z.object({ kind: LocalDataLabelSchema, value: LocalDataLabelSchema }).strict().optional(),
  }).strict(),
  createdAt: LocalDataTimestampSchema,
}).strict().superRefine((manifest, context) => {
  // safeParse is necessary: outer refinements can run when an inner refinement emitted an issue.
  const request = LocalDataAcquisitionRequestV1Schema.safeParse(manifest.request);
  if (request.success) {
    if (manifest.requestFingerprint !== createLocalDataRequestFingerprintV1(request.data)) {
      context.addIssue({ code: 'custom', path: ['requestFingerprint'], message: 'Acquisition fingerprint mismatch.' });
    }
    if (manifest.schemaSha256 !== createLocalDataSchemaDigestV1(request.data.schema)) {
      context.addIssue({ code: 'custom', path: ['schemaSha256'], message: 'Ordered schema digest mismatch.' });
    }
    for (const issue of localDataCoverageErrors(request.data.policy, manifest.coverage, manifest.completionReason, manifest.rowCount)) {
      context.addIssue({ code: 'custom', path: [...issue.path], message: issue.message });
    }
  }
  if (manifest.sourceObservation.observedAt > manifest.createdAt) {
    context.addIssue({ code: 'custom', path: ['createdAt'], message: 'Generation creation must not precede the acquisition observation.' });
  }
});
export type LocalDataGenerationManifestV1 = Readonly<z.infer<typeof LocalDataGenerationManifestV1Schema>>;

/** Exact metadata match only. The caller MUST authorize the scope before resolving these IDs. */
export function matchesLocalDataGenerationSelectionV1(selection: unknown, generation: unknown): boolean {
  const selected = DataAccessSelectionSchema.safeParse(selection);
  const manifest = LocalDataGenerationManifestV1Schema.safeParse(generation);
  return selected.success && manifest.success && selected.data.mode === 'local' &&
    selected.data.localDatasetId === manifest.data.localDatasetId &&
    selected.data.generationId === manifest.data.generationId;
}
