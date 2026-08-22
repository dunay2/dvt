/** Owned concern: prefix cryptographically random browser command identities. */
import { randomUuidV4 } from '@dvt/crypto';

export function createBrowserIdempotencyKey(prefix: string): string {
  try {
    return `${prefix}:${randomUuidV4()}`;
  } catch (error) {
    if (error instanceof Error && error.message === 'CRYPTO_SECURE_RANDOM_UNAVAILABLE') {
      throw new Error('Browser cryptographic entropy is required for command idempotency.', {
        cause: error,
      });
    }
    throw error;
  }
}
