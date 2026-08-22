import { md5 } from '@noble/hashes/legacy.js';
import { bytesToHex } from '@noble/hashes/utils.js';

import { requireBytes, utf8Bytes } from './encoding.js';

/** Compatibility-only MD5. Do not use for security or integrity decisions. */
export function md5Hex(bytes: Uint8Array): string {
  return bytesToHex(md5(requireBytes(bytes)));
}

/** Compatibility-only MD5. Do not use for security or integrity decisions. */
export function md5HexUtf8(text: string): string {
  return md5Hex(utf8Bytes(text));
}
