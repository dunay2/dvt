export function utf8Bytes(text: string): Uint8Array {
  if (typeof text !== 'string') {
    throw new TypeError('CRYPTO_UTF8_TEXT_REQUIRED');
  }

  return new globalThis.TextEncoder().encode(text);
}

export function requireBytes(bytes: Uint8Array): Uint8Array {
  if (
    !ArrayBuffer.isView(bytes) ||
    Object.prototype.toString.call(bytes) !== '[object Uint8Array]'
  ) {
    throw new TypeError('CRYPTO_BYTES_REQUIRED');
  }

  return bytes;
}
