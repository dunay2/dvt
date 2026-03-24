/**
 * @file packages/@dvt/adapter-postgres/src/runStateCommandPortBridge.ts
 * @baseline ADR-0003: Execution Model
 * @baseline ADR-0004: Event Sourcing Strategy (Extended)
 * @baseline ADR-0017: State Write Boundary for Engine Adapters
 * @baseline ADR-0019: Dungeon Master Orchestration Component
 * @decision Run-state writes are exposed via command port bridge, avoiding direct adapter/runtime coupling to concrete persistence callers.
 * @consequence Temporal and future adapters can target a stable write boundary while Postgres remains an infrastructure implementation.
 * @version 1.0.0
 * @date 2026-02-25
 */
import type {
  AppendResult,
  EventInput,
  IRunStateStoreWrite,
  RunId,
  RunBootstrapInput,
  RunStateCommandPort,
} from './types.js';

/**
 * Bridge that adapts the Postgres transactional state store to the
 * RunStateCommandPort write boundary.
 */
export class PostgresRunStateCommandPortBridge implements RunStateCommandPort {
  constructor(private readonly store: IRunStateStoreWrite) {}

  bootstrapRun(input: RunBootstrapInput): Promise<AppendResult> {
    return this.store.bootstrapRunTx(input);
  }

  appendTransitions(runId: RunId, events: EventInput[]): Promise<AppendResult> {
    return this.store.appendAndEnqueueTx(runId, events);
  }
}
