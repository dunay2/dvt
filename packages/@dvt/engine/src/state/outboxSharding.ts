/**
 * @file packages/@dvt/engine/src/state/outboxSharding.ts
 * Owned concern: expose engine-local outbox sharding facade while Delivery owns policy semantics.
 * @baseline ADR-0004: Event Sourcing Strategy
 * @baseline ADR-0033: Outbox Worker Sharding And Fencing Model
 * @decision Delegate stable outbox shard assignment to the Delivery-owned tenant-aware policy
 * @consequence Engine in-memory state keeps test parity without duplicating outbox sharding
 * semantics
 * @version 1.0.0
 */
import {
  buildOutboxStreamOrderingKey as buildDeliveryOutboxStreamOrderingKey,
  resolveOutboxShardId as resolveDeliveryOutboxShardId,
  type OutboxShardAssignmentKey,
} from '@dvt/delivery';

export type { OutboxShardAssignmentKey };

export function resolveOutboxShardId(key: OutboxShardAssignmentKey, shardCount: number): number {
  return resolveDeliveryOutboxShardId(key, shardCount);
}

export function buildOutboxStreamOrderingKey(key: OutboxShardAssignmentKey): string {
  return buildDeliveryOutboxStreamOrderingKey(key);
}
