import { md5 } from '@noble/hashes/legacy.js';
import { bytesToHex } from '@noble/hashes/utils.js';

import { utf8Bytes } from './encoding.js';

/** Compatibility-only MD5. Do not use for security or integrity decisions. */
export function md5Hex(bytes: Uint8Array): string {
  if (!(bytes instanceof Uint8Array)) {
    throw new TypeError('CRYPTO_BYTES_REQUIRED');
  }
  return bytesToHex(md5(bytes));
}

/** Compatibility-only MD5. Do not use for security or integrity decisions. */
export function md5HexUtf8(text: string): string {
  return md5Hex(utf8Bytes(text));
}
