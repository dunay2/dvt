/**
 * @file packages/@dvt/contracts/src/ports/artifact-store.ts
 * @decision IArtifactStore formal hexagonal port — write and read sides segregated (ISP).
 * @decision Ports live in @dvt/contracts (shared kernel) not in feature packages (G-1, VIOLATION-1).
 * @decision validateArtifactIntegrity is a single source of truth called by both write and read
 *           adapters — prevents invariant duplication across layers (G-1).
 */
import { ArtifactStoreError } from '../errors.js';

// ─── Segregated port interfaces ───────────────────────────────────────────────

export interface IArtifactWriter {
  /**
   * Upload artifact bytes. Returns the canonical storageUri.
   * MUST be idempotent: uploading the same (tenantId, sha256) twice MUST NOT throw.
   * Throws ArtifactStoreError(ARTIFACT_UPLOAD_FAILED) on infrastructure failure.
   */
  upload(tenantId: string, sha256: string, content: Buffer): Promise<string>;
}

export interface IArtifactReader {
  /**
   * Retrieve artifact bytes by tenant + content hash.
   * Throws ArtifactStoreError(ARTIFACT_NOT_FOUND) if not present.
   */
  read(tenantId: string, sha256: string): Promise<Buffer>;

  /** Returns true if artifact exists for this tenant. Never throws for missing artifact. */
  exists(tenantId: string, sha256: string): Promise<boolean>;
}

/**
 * Combined port for adapters that implement both read and write.
 * IArtifactStore is a composition type only — it MUST NOT define new methods directly.
 * Any new capability requires a new segregated port interface and an ADR (G-4).
 */
export interface IArtifactStore extends IArtifactWriter, IArtifactReader {}

// ─── Integrity validation (G-1: single shared implementation) ─────────────────

export interface ArtifactIntegrityInput {
  sha256: string;
  sizeBytes: number;
}

/**
 * Validates that a resolved artifact matches its reference.
 * MUST be the single implementation called by both upload-side and read-side adapters.
 * Throws ArtifactStoreError(ARTIFACT_INTEGRITY_ERROR) on mismatch.
 */
export function validateArtifactIntegrity(
  expected: ArtifactIntegrityInput,
  actual: ArtifactIntegrityInput
): void {
  if (actual.sha256 !== expected.sha256) {
    throw new ArtifactStoreError(
      `Artifact digest mismatch: expected ${expected.sha256}, got ${actual.sha256}`,
      'ARTIFACT_INTEGRITY_ERROR'
    );
  }
  if (actual.sizeBytes !== expected.sizeBytes) {
    throw new ArtifactStoreError(
      `Artifact size mismatch: expected ${expected.sizeBytes}B, got ${actual.sizeBytes}B`,
      'ARTIFACT_INTEGRITY_ERROR'
    );
  }
}
