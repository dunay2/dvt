/**
 * @file packages/@dvt/contracts/src/adapters/IOutboxStorageAdapter.v1.ts
 * @baseline ADR-0005: Contract Formalization Tooling
 * @baseline ADR-0006: Contract Tooling Governance
 * @decision Section 2 — Outbox storage operations are formalized as a versioned adapter contract
 * @consequence Delivery infrastructure integrates through deterministic outbox append/pull/ack semantics
 * @version 1.0.0
 * @date 2026-02-21
 */
import { TenantId, EventId, IdempotencyKey } from '../types/contracts.js';

export interface OutboxEventRecord {
  readonly outboxId: string;
  readonly tenantId: TenantId;
  readonly eventId: EventId;
  readonly eventData: unknown;
  readonly targetSystem: string;
  readonly idempotencyKey: IdempotencyKey;
  readonly createdAt: number;
  readonly deliveredAt?: number;
  readonly status: 'pending' | 'delivered' | 'failed';
}

export interface IOutboxStorageAdapter {
  appendOutbox(
    tenantId: TenantId,
    eventId: EventId,
    eventData: unknown,
    targetSystem: string,
    idempotencyKey: IdempotencyKey
  ): Promise<OutboxEventRecord>;
  pullUndelivered(tenantId: TenantId, maxEvents: number): Promise<OutboxEventRecord[]>;
  markDelivered(outboxId: string): Promise<OutboxEventRecord>;
  health(): Promise<boolean>;
  close(): Promise<void>;
}
