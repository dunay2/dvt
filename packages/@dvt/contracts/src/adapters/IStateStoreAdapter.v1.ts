/**
 * @file packages/@dvt/contracts/src/adapters/IStateStoreAdapter.v1.ts
 * @baseline ADR-0004: Event Sourcing Strategy (Extended)
 * @baseline ADR-0005: Contract Formalization Tooling
 * @decision Section 2.1 — State-store read/write semantics are formalized with tenant scoping and idempotency keys
 * @consequence Persistent state adapters implement a deterministic contract aligned with event-sourced workflows
 * @version 1.0.0
 * @date 2026-02-21
 */
import { TenantId, IdempotencyKey } from '../types/contracts.js';

export interface IStateStoreAdapter {
  read<T>(tenantId: TenantId, key: string): Promise<T | undefined>;
  write<T>(
    tenantId: TenantId,
    key: string,
    value: T,
    idempotencyKey?: IdempotencyKey
  ): Promise<void>;
  health(): Promise<boolean>;
  close(): Promise<void>;
}
