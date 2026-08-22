export function utf8Bytes(text: string): Uint8Array {
  if (typeof text !== 'string') {
    throw new TypeError('CRYPTO_UTF8_TEXT_REQUIRED');
  }

  return new globalThis.TextEncoder().encode(text);
}
