/**
 * Owned concern: allocate and distinguish dataset, capture-attempt and generation identities.
 * @baseline ADR-0018: Shared Kernel Ownership Governance
 * @decision Assigned UUIDv7 identities never derive from names, timestamps or data hashes.
 * @consequence Equivalent fingerprints do not grant access or identify a stored generation.
 * @version 1.0.0
 */
import { randomUuidV7 } from '@dvt/crypto';
import { z } from 'zod';

const UUID_V7 = '[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
function identitySchema(prefix: string): z.ZodString {
  return z
    .string()
    .length(prefix.length + 36)
    .regex(new RegExp(`^${prefix}${UUID_V7}$`, 'u'));
}

export const LocalDatasetIdV1Schema = identitySchema('dvt_lds_').brand<'LocalDatasetIdV1'>();
export const LocalDataCaptureIdV1Schema =
  identitySchema('dvt_cap_').brand<'LocalDataCaptureIdV1'>();
export const LocalDataGenerationIdV1Schema =
  identitySchema('dvt_gen_').brand<'LocalDataGenerationIdV1'>();
export type LocalDatasetIdV1 = z.infer<typeof LocalDatasetIdV1Schema>;
export type LocalDataCaptureIdV1 = z.infer<typeof LocalDataCaptureIdV1Schema>;
export type LocalDataGenerationIdV1 = z.infer<typeof LocalDataGenerationIdV1Schema>;

export function createLocalDatasetIdV1(): LocalDatasetIdV1 {
  return LocalDatasetIdV1Schema.parse(`dvt_lds_${randomUuidV7()}`);
}
export function createLocalDataCaptureIdV1(): LocalDataCaptureIdV1 {
  return LocalDataCaptureIdV1Schema.parse(`dvt_cap_${randomUuidV7()}`);
}
export function createLocalDataGenerationIdV1(): LocalDataGenerationIdV1 {
  return LocalDataGenerationIdV1Schema.parse(`dvt_gen_${randomUuidV7()}`);
}
