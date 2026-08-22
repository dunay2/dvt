import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';

import { requireBytes, utf8Bytes } from './encoding.js';

export interface Sha256Hasher {
  update(bytes: Uint8Array): Sha256Hasher;
  digestHex(): string;
}

export function sha256Hex(bytes: Uint8Array): string {
  return bytesToHex(sha256(requireBytes(bytes)));
}

export function sha256HexUtf8(text: string): string {
  return sha256Hex(utf8Bytes(text));
}

export function createSha256Hasher(): Sha256Hasher {
  const hasher = sha256.create();
  let finalized = false;

  const assertOpen = (): void => {
    if (finalized) {
      throw new Error('SHA256_HASHER_FINALIZED');
    }
  };

  const api: Sha256Hasher = {
    update(bytes) {
      assertOpen();
      hasher.update(requireBytes(bytes));
      return api;
    },
    digestHex() {
      assertOpen();
      finalized = true;
      return bytesToHex(hasher.digest());
    },
  };

  return api;
}
