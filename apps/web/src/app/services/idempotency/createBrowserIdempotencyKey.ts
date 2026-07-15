/** Owned concern: create cryptographically random browser command identities. */

function createUuidFromRandomBytes(cryptoApi: Crypto): string {
  const bytes = cryptoApi.getRandomValues(new Uint8Array(16));
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;

  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function createBrowserIdempotencyKey(prefix: string): string {
  const cryptoApi = globalThis.crypto;
  if (typeof cryptoApi?.randomUUID === 'function') {
    return `${prefix}:${cryptoApi.randomUUID()}`;
  }
  if (typeof cryptoApi?.getRandomValues !== 'function') {
    throw new Error('Browser cryptographic entropy is required for command idempotency.');
  }

  return `${prefix}:${createUuidFromRandomBytes(cryptoApi)}`;
}
