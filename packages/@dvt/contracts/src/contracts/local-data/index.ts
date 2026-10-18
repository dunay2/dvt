/**
 * Owned concern: publish the shared LOCAL generation metadata contracts.
 * @baseline ADR-0018: Shared Kernel Ownership Governance
 * @decision Export serializable contracts and their boundary parsers through one shared-kernel surface.
 * @consequence Implementation-only refinements remain private to this contract family.
 * @version 1.0.0
 */
export {
  LocalDatasetIdV1Schema,
  LocalDataCaptureIdV1Schema,
  LocalDataGenerationIdV1Schema,
  createLocalDatasetIdV1,
  createLocalDataCaptureIdV1,
  createLocalDataGenerationIdV1,
  type LocalDatasetIdV1,
  type LocalDataCaptureIdV1,
  type LocalDataGenerationIdV1,
} from './LocalDataIdentity.v1.js';
export {
  LocalDataSchemaV1Schema,
  createLocalDataSchemaDigestV1,
  type LocalDataSchemaV1,
} from './LocalDataSchema.v1.js';
export {
  LocalDataAcquisitionPolicyV1Schema,
  LocalDataAcquisitionRequestV1Schema,
  createLocalDataRequestFingerprintV1,
  type LocalDataAcquisitionPolicyV1,
  type LocalDataAcquisitionRequestV1,
} from './LocalDataAcquisition.v1.js';
export {
  LocalDataGenerationManifestV1Schema,
  matchesLocalDataGenerationSelectionV1,
  type LocalDataGenerationManifestV1,
} from './LocalDataGeneration.v1.js';
export {
  LocalDataCaptureRecordV1Schema,
  isLocalDataCaptureTransitionAllowedV1,
  matchesLocalDataCaptureCompletionV1,
  type LocalDataCaptureRecordV1,
} from './LocalDataCapture.v1.js';
