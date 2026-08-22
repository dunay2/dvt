const MAX_RANDOM_BYTES_PER_REQUEST = 65_536;

export function secureRandomBytes(length: number): Uint8Array {
  if (!Number.isSafeInteger(length) || length < 0 || length > MAX_RANDOM_BYTES_PER_REQUEST) {
    throw new RangeError('CRYPTO_RANDOM_LENGTH_INVALID');
  }

  const cryptoApi = globalThis.crypto;
  if (!cryptoApi || typeof cryptoApi.getRandomValues !== 'function') {
    throw new Error('CRYPTO_SECURE_RANDOM_UNAVAILABLE');
  }

  return cryptoApi.getRandomValues(new Uint8Array(length));
}
