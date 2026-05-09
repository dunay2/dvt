/**
 * Owned concern: assign persisted outbox shards from tenant-scoped delivery identity.
 *
 * The shard policy is tenant-affine on purpose: `runId` remains part of the
 * assignment key so callers pass the complete stream identity, but tenant id is
 * the partition input that keeps one noisy tenant from spreading across every
 * shared worker shard.
 */
import { createHash } from 'node:crypto';

export interface OutboxShardAssignmentKey {
  readonly tenantId: string;
  readonly runId: string;
}

export function buildOutboxShardAssignmentHashInput(key: OutboxShardAssignmentKey): string {
  const tenantId = normalizeTenantId(key.tenantId);
  normalizeRunId(key.runId);
  return `${tenantId.length}:${tenantId}`;
}

export function buildOutboxStreamOrderingKey(key: OutboxShardAssignmentKey): string {
  const tenantId = normalizeTenantId(key.tenantId);
  const runId = normalizeRunId(key.runId);
  return `${tenantId.length}:${tenantId}|${runId.length}:${runId}`;
}

export function resolveOutboxShardId(key: OutboxShardAssignmentKey, shardCount: number): number {
  if (!Number.isInteger(shardCount) || shardCount <= 0) {
    throw new Error(`INVALID_OUTBOX_SHARD_COUNT: ${shardCount}`);
  }

  const hash = createHash('md5')
    .update(buildOutboxShardAssignmentHashInput(key), 'utf8')
    .digest('hex')
    .slice(0, 16);
  const shardCountBigInt = BigInt(shardCount);
  let hashValue = BigInt(`0x${hash}`);
  const signedBigIntHighBit = 1n << 63n;
  const uint64Modulus = 1n << 64n;

  if (hashValue >= signedBigIntHighBit) {
    hashValue -= uint64Modulus;
  }

  return Number(((hashValue % shardCountBigInt) + shardCountBigInt) % shardCountBigInt);
}

function normalizeTenantId(tenantId: string): string {
  if (typeof tenantId !== 'string' || tenantId.trim().length === 0) {
    throw new Error('INVALID_OUTBOX_SHARD_ASSIGNMENT_TENANT');
  }
  return tenantId;
}

function normalizeRunId(runId: string): string {
  if (typeof runId !== 'string' || runId.trim().length === 0) {
    throw new Error('INVALID_OUTBOX_SHARD_ASSIGNMENT_RUN');
  }
  return runId;
}
