import { createHash } from 'node:crypto';

import { readArtifactBytes, type ReadArtifactBytesOptions } from './readArtifactBytes.js';
import {
  validateArtifactIntegrity,
  type ArtifactIntegrityInput,
} from './validateArtifactIntegrity.js';

/**
 * Canonical artifact read + integrity path.
 * Consumers provide only a generic immutable artifact reference and runtime read options.
 */
export async function readVerifiedArtifactBytes(
  ref: ArtifactIntegrityInput & Readonly<{ storageUri: string }>,
  options: ReadArtifactBytesOptions
): Promise<Uint8Array> {
  const bytes = await readArtifactBytes(ref.storageUri, {
    ...options,
    ...(options.maxBytes === undefined && ref.sizeBytes !== undefined
      ? { maxBytes: ref.sizeBytes }
      : {}),
  });
  validateArtifactIntegrity(ref, {
    sha256: createHash('sha256').update(bytes).digest('hex'),
    sizeBytes: bytes.byteLength,
  });
  return bytes;
}
