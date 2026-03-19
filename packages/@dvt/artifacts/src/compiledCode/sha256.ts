import { createHash } from 'node:crypto';

/** Computes SHA-256 hex digest of a Buffer. */
export function computeSha256(content: Buffer): string {
  return createHash('sha256').update(content).digest('hex');
}
