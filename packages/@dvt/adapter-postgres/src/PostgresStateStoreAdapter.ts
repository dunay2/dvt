/**
 * @file packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts
 * @baseline ADR-0004: Event Sourcing Strategy (Extended)
 * @baseline ADR-0003: Execution Model
 * @baseline ADR-0031: Storage Adapter Tenant Isolation Strategy
 * @decision Keep a thin public facade while runtime composition/orchestration lives in PostgresStateStoreRuntime
 * @consequence Adapter boundary remains stable and implementation details are decoupled from public construction
 * @version 1.0.0
 * @date 2026-03-28
 */
import {
  PostgresStateStoreRuntime,
  type PostgresStateStoreRuntimeConfig,
} from './PostgresStateStoreRuntime.js';

export type PostgresAdapterConfig = PostgresStateStoreRuntimeConfig;

export class PostgresStateStoreAdapter extends PostgresStateStoreRuntime {
  constructor(config: PostgresAdapterConfig = {}) {
    super(config);
  }
}
