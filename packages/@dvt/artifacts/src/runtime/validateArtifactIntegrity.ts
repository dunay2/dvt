import { ArtifactStoreError } from '@dvt/contracts';

export interface ArtifactIntegrityInput {
  sha256: string;
  sizeBytes: number;
}

/**
 * Validates that a resolved artifact matches its immutable reference.
 * The generic shared-kernel artifact-store abstraction was retired in RC-G1-C;
 * this owner-local helper remains the single integrity check implementation.
 */
export function validateArtifactIntegrity(
  expected: ArtifactIntegrityInput,
  actual: ArtifactIntegrityInput
): void {
  if (actual.sha256 !== expected.sha256) {
    throw ArtifactStoreError.integrityDigestMismatch(expected.sha256, actual.sha256);
  }
  if (actual.sizeBytes !== expected.sizeBytes) {
    throw ArtifactStoreError.integritySizeMismatch(expected.sizeBytes, actual.sizeBytes);
  }
}
