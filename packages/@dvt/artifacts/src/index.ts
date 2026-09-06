// ── Artifact bounded context — public surface ─────────────────────────────────
//
// Canonical owner package for immutable artifact storage/read and persisted-plan behavior ports.
// Governing: ADR-0034, ADR-0043.
//

export type {
  IContentAddressedArtifactStore,
  PublishContentAddressedArtifactInput,
  PublishedContentAddressedArtifact,
} from './contentAddressed/IContentAddressedArtifactStore.js';
export {
  createDefaultS3ContentAddressedArtifactStore,
  encodeS3TenantPathSegment,
  S3ContentAddressedArtifactStore,
  type S3ContentAddressedArtifactStoreOptions,
} from './contentAddressed/S3ContentAddressedArtifactStore.js';
export type {
  DbtProjectBundleReadOptions,
  IDbtProjectBundleReader,
} from './ports/IDbtProjectBundleReader.js';
export type { IPlanStoreReader, ScopedPlanExecutabilityQuery } from './ports/IPlanStoreReader.js';
export type {
  ArchivePlanInput,
  IPlanStoreWriter,
  MarkPlanSupersededInput,
} from './ports/IPlanStoreWriter.js';
export type {
  IStoredPlanArtifactReader,
  IStoredPlanArtifactStore,
  IStoredPlanArtifactWriter,
  IStoredPlanRefReader,
  MarkStoredPlanArtifactInvalidInput,
  StoredPlanArtifact,
  StorePlanArtifactInput,
} from './ports/IStoredPlanArtifactStore.js';
export type { IRunExecutionContextReader } from './ports/IRunExecutionContextReader.js';
export type {
  IRunExecutionContextReferenceStore,
  PutRunExecutionContextReferenceInput,
  RunExecutionContextReferenceIdentity,
} from './ports/IRunExecutionContextReferenceStore.js';
export { ArtifactReadError, type ArtifactReadErrorCode } from './runtime/ArtifactReadError.js';
export {
  ArtifactBackedDbtProjectBundleReader,
  type ArtifactBackedDbtProjectBundleReaderOptions,
} from './runtime/ArtifactBackedDbtProjectBundleReader.js';
export {
  assertDbtProjectBundleBinding,
  type DbtProjectBundleArtifactStore,
} from './runtime/assertDbtProjectBundleBinding.js';
export {
  ArtifactBackedRunExecutionContextReader,
  type ArtifactBackedRunExecutionContextReaderOptions,
} from './runtime/ArtifactBackedRunExecutionContextReader.js';
export {
  S3RunExecutionContextReferenceStore,
  type S3RunExecutionContextReferenceStoreOptions,
} from './runtime/S3RunExecutionContextReferenceStore.js';
export {
  validateArtifactIntegrity,
  type ArtifactIntegrityInput,
} from './runtime/validateArtifactIntegrity.js';
export {
  readArtifact,
  readArtifactBytes,
  type ArtifactReadRuntimeOptions,
  type ReadArtifactBytesOptions,
  type ReadArtifactResult,
} from './runtime/readArtifactBytes.js';
export { readVerifiedArtifactBytes } from './runtime/readVerifiedArtifactBytes.js';
export {
  resolveRunExecutionContextArtifactStore,
  type RunExecutionContextArtifactStoreConfig,
} from './runtime/resolveRunExecutionContextArtifactStore.js';
