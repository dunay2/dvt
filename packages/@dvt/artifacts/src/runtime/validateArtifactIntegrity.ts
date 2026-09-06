import { ArtifactStoreError } from '@dvt/contracts';

export interface ArtifactIntegrityInput {
  sha256: string;
  sizeBytes?: number;
}

/**
 * Validates that a resolved artifact matches its immutable reference.
 * Digest validation is mandatory. Size validation is applied when the reference
 * contract carries an exact size.
 */
export function validateArtifactIntegrity(
  expected: ArtifactIntegrityInput,
  actual: Required<ArtifactIntegrityInput>
): void {
  if (actual.sha256 !== expected.sha256) {
    throw ArtifactStoreError.integrityDigestMismatch(expected.sha256, actual.sha256);
  }
  if (expected.sizeBytes !== undefined && actual.sizeBytes !== expected.sizeBytes) {
    throw ArtifactStoreError.integritySizeMismatch(expected.sizeBytes, actual.sizeBytes);
  }
}
