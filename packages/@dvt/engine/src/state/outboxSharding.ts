/**
 * @file packages/@dvt/engine/src/state/outboxSharding.ts
 * @baseline ADR-0004: Event Sourcing Strategy
 * @baseline ADR-0033: Outbox Worker Sharding And Fencing Model
 * @decision Delegate stable outbox shard assignment to the Delivery-owned tenant-aware policy
 * @consequence Engine in-memory state keeps test parity without duplicating outbox sharding semantics
 * @version 1.0.0
 */
export {
  buildOutboxStreamOrderingKey,
  resolveOutboxShardId,
  type OutboxShardAssignmentKey,
} from '@dvt/delivery';
