import { describe, expect, it } from 'vitest';

import {
  buildOutboxStreamOrderingKey,
  resolveOutboxShardId,
} from '../src/outboxShardAssignment.js';

describe('OutboxShardAssignment', () => {
  it('keeps one tenant bounded to one shard across many run ids', () => {
    const shardCount = 8;
    const tenantId = 'tenant-noisy';

    const assignedShards = new Set(
      Array.from({ length: 64 }, (_, index) =>
        resolveOutboxShardId({ tenantId, runId: `run-${index}` }, shardCount)
      )
    );

    expect(assignedShards.size).toBe(1);
  });

  it('keeps same run ids from different tenants independently shardable', () => {
    const shardCount = 4;
    const tenantForShard0 = findTenantIdForShard(0, shardCount);
    const tenantForShard1 = findTenantIdForShard(1, shardCount);
    const runId = 'shared-run-id';

    expect(resolveOutboxShardId({ tenantId: tenantForShard0, runId }, shardCount)).toBe(0);
    expect(resolveOutboxShardId({ tenantId: tenantForShard1, runId }, shardCount)).toBe(1);
  });

  it('rejects invalid identity and shard-count inputs before routing', () => {
    expect(() => resolveOutboxShardId({ tenantId: '', runId: 'run-1' }, 2)).toThrow(
      'INVALID_OUTBOX_SHARD_ASSIGNMENT_TENANT'
    );
    expect(() => resolveOutboxShardId({ tenantId: 'tenant-1', runId: '' }, 2)).toThrow(
      'INVALID_OUTBOX_SHARD_ASSIGNMENT_RUN'
    );
    expect(() => resolveOutboxShardId({ tenantId: 'tenant-1', runId: 'run-1' }, 0)).toThrow(
      'INVALID_OUTBOX_SHARD_COUNT'
    );
  });

  it('builds tenant and run scoped stream ordering keys without delimiter collisions', () => {
    expect(buildOutboxStreamOrderingKey({ tenantId: 'ab', runId: 'c|d' })).toBe('2:ab|3:c|d');
    expect(buildOutboxStreamOrderingKey({ tenantId: 'a|b', runId: 'cd' })).toBe('3:a|b|2:cd');
  });
});

function findTenantIdForShard(targetShardId: number, shardCount: number): string {
  for (let index = 0; index < 512; index += 1) {
    const candidate = `tenant-shard-${targetShardId}-${index}`;
    if (
      resolveOutboxShardId({ tenantId: candidate, runId: 'probe-run' }, shardCount) ===
      targetShardId
    ) {
      return candidate;
    }
  }

  throw new Error(`Unable to find tenant id for shard ${targetShardId}`);
}
