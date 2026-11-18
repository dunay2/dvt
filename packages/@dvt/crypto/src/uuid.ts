/**
 * Owned concern: allocate portable UUIDs through the maintained provider and secure entropy.
 * Reason to change: supported provider versions or primitive input validation change.
 * Corner: injected inputs preserve their bytes and keep domain identity policy with callers.
 */
import { v4 as uuidV4, v7 as uuidV7 } from 'uuid';

import { secureRandomBytes } from './random.js';

export interface RandomUuidV7Options {
  readonly nowMs?: number;
  readonly randomBytes?: Uint8Array;
}

export function randomUuidV4(): string {
  return uuidV4({ random: secureRandomBytes(16) });
}

/**
 * Supplying both nowMs and 16 randomBytes makes a call reproducible within the selected provider.
 * Exact injected-byte mapping follows the provider version. The conformance golden targets
 * uuid 14.0.3, including its upstream default-sequence correction #965; upgrades review that golden.
 * @see https://github.com/uuidjs/uuid/commit/a67db57f7ae169e97c2573fd9d852b8364f89bf8
 */
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
