import {
  ArtifactStoreError,
  CONTRACTS_ERROR_CODE,
  CONTRACTS_ERROR_MESSAGE_KEY,
} from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import { validateArtifactIntegrity } from '../src/runtime/validateArtifactIntegrity.js';

describe('@dvt/artifacts validateArtifactIntegrity', () => {
  it('throws the shared digest mismatch error contract', () => {
    expect(() =>
      validateArtifactIntegrity(
        { sha256: 'expected', sizeBytes: 10 },
        { sha256: 'actual', sizeBytes: 10 }
      )
    ).toThrowError(
      expect.objectContaining({
        code: CONTRACTS_ERROR_CODE.ARTIFACT_INTEGRITY_ERROR,
        messageKey: CONTRACTS_ERROR_MESSAGE_KEY.ARTIFACT_INTEGRITY_DIGEST_MISMATCH,
        messageParams: {
          expectedSha256: 'expected',
          actualSha256: 'actual',
        },
        message: 'Artifact digest mismatch: expected expected, actual actual',
      } satisfies Partial<ArtifactStoreError>)
    );
  });

  it('throws the shared size mismatch error contract', () => {
    expect(() =>
      validateArtifactIntegrity(
        { sha256: 'same', sizeBytes: 10 },
        { sha256: 'same', sizeBytes: 11 }
      )
    ).toThrowError(
      expect.objectContaining({
        code: CONTRACTS_ERROR_CODE.ARTIFACT_INTEGRITY_ERROR,
        messageKey: CONTRACTS_ERROR_MESSAGE_KEY.ARTIFACT_INTEGRITY_SIZE_MISMATCH,
        messageParams: {
          expectedBytes: 10,
          actualBytes: 11,
        },
        message: 'Artifact size mismatch: expected 10, actual 11',
      } satisfies Partial<ArtifactStoreError>)
    );
  });
});
