/**
 * Owned concern: fingerprint the requested source acquisition, not graph layout or an attempt.
 * @baseline ADR-0058: Warehouse Source Import Rails
 * @decision Admit only FULL and FIRST N; source/schema/context changes alter the fingerprint.
 * @consequence A new graph edit does not invalidate raw source data; a provider-context change does.
 * @version 1.0.0
 */
import { jcsCanonicalize, sha256HexUtf8 } from '@dvt/crypto';
import { z } from 'zod';

import { ConnectedSourceRefSchema } from '../source-import/ConnectedSourceRef.v1.js';
import { LocalDataPositiveCountSchema, LocalDataSha256Schema } from './localDataPrimitives.js';
import { LocalDataSchemaV1Schema } from './LocalDataSchema.v1.js';

export const LocalDataAcquisitionPolicyV1Schema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('full') }).strict(),
  z.object({
    kind: z.literal('sample'),
    method: z.literal('first'),
    requestedRows: LocalDataPositiveCountSchema,
  }).strict(),
]);
export const LocalDataAcquisitionRequestV1Schema = z.object({
  schemaVersion: z.literal('local-data-acquisition-request.v1'),
  sourceRef: ConnectedSourceRefSchema,
  policy: LocalDataAcquisitionPolicyV1Schema,
  schema: LocalDataSchemaV1Schema,
  // Digest of admitted result-affecting context, never a credential or reusable authorization.
  providerContextSha256: LocalDataSha256Schema,
}).strict();
export type LocalDataAcquisitionPolicyV1 = z.infer<typeof LocalDataAcquisitionPolicyV1Schema>;
export type LocalDataAcquisitionRequestV1 = z.infer<typeof LocalDataAcquisitionRequestV1Schema>;

/** Parse a strict request: accidental layout, secrets, IDs or times are rejected, not ignored. */
export function createLocalDataRequestFingerprintV1(request: unknown): string {
  return sha256HexUtf8(jcsCanonicalize(LocalDataAcquisitionRequestV1Schema.parse(request)));
}
