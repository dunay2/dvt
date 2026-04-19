import { createHash } from 'node:crypto';

export function resolveOutboxShardId(runId: string, shardCount: number): number {
  const normalizedShardCount = Math.max(1, shardCount);
  const hash = createHash('md5').update(runId, 'utf8').digest('hex').slice(0, 16);
  const shardCountBigInt = BigInt(normalizedShardCount);
  let hashValue = BigInt(`0x${hash}`);
  if (hashValue >= SIGNED_BIGINT_HIGH_BIT) {
    hashValue -= UINT64_MODULUS;
  }
  return Number(((hashValue % shardCountBigInt) + shardCountBigInt) % shardCountBigInt);
}

const SIGNED_BIGINT_HIGH_BIT = 1n << 63n;
const UINT64_MODULUS = 1n << 64n;
