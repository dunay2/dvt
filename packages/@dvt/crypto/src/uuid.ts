import { v4 as uuidV4, v7 as uuidV7 } from 'uuid';

import { secureRandomBytes } from './random.js';

export interface RandomUuidV7Options {
  readonly nowMs?: number;
  readonly randomBytes?: Uint8Array;
}

export function randomUuidV4(): string {
  return uuidV4({ random: secureRandomBytes(16) });
}

export function randomUuidV7(options: RandomUuidV7Options = {}): string {
  const random = options.randomBytes ?? secureRandomBytes(16);
  if (random.length !== 16) {
    throw new RangeError('UUID_V7_RANDOM_BYTES_INVALID');
  }
  if (options.nowMs !== undefined && (!Number.isSafeInteger(options.nowMs) || options.nowMs < 0)) {
    throw new RangeError('UUID_V7_TIMESTAMP_INVALID');
  }

  return uuidV7({
    random,
    ...(options.nowMs === undefined ? {} : { msecs: options.nowMs }),
  });
}
