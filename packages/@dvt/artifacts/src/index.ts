// ── Artifact bounded context — public surface ─────────────────────────────────
//
// Canonical owner package for compiled-code storage and enrichment concerns.
// Governing: ADR-0032, ADR-0034, planner-slice4-artifact-boundary-extraction-plan.md
//

export type { ICompiledCodeStorage } from './ports/ICompiledCodeStorage.js';
export type { IPlanStoreReader } from './ports/IPlanStoreReader.js';
export type { IPlanStoreWriter } from './ports/IPlanStoreWriter.js';
export { computeSha256 } from './compiledCode/sha256.js';
export {
  attachCompiledCodeRefs,
  type AttachCompiledCodeRefsOptions,
} from './compiledCode/attachCompiledCodeRefs.js';
export {
  S3CompiledCodeStorage,
  type S3CompiledCodeStorageOptions,
} from './compiledCode/adapters/S3CompiledCodeStorage.js';
export {
  MinioCompiledCodeStorage,
  type MinioCompiledCodeStorageOptions,
} from './compiledCode/adapters/MinioCompiledCodeStorage.js';
export {
  FileSystemCompiledCodeStorage,
  type FileSystemCompiledCodeStorageOptions,
} from './compiledCode/adapters/FileSystemCompiledCodeStorage.js';
export {
  InMemoryCompiledCodeStorage,
  type InMemoryCompiledCodeStorageOptions,
} from './compiledCode/adapters/InMemoryCompiledCodeStorage.js';
export { NoopCompiledCodeStorage } from './compiledCode/adapters/NoopCompiledCodeStorage.js';
