/**
 * @file packages/@dvt/engine/src/adapters/mock/MockAdapter.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @baseline ADR-0004: Event Sourcing Strategy (Extended)
 * @decision Decision — The mock adapter executes steps and emits canonical events to validate engine semantics without an external runtime
 * @consequence Tests and local development verify run/step lifecycle using the same domain event model
 * @version 1.0.0
 * @date 2026-02-21
 */
import type {
  EngineRunRef,
  PlanRef,
  RunContext,
  RunStatusSnapshot,
  SignalRequest,
} from '@dvt/contracts';
import type { ExecutionPlan } from '../../contracts/executionPlan.js';
import { IdempotencyKeyBuilder } from '../../core/idempotency.js';
import { SnapshotProjector } from '../../core/SnapshotProjector.js';
import type { IRunStateStore } from '../../state/IRunStateStore.js';
import type { IClock } from '../../utils/clock.js';
import type { IProviderAdapter } from '../IProviderAdapter.js';
export interface MockAdapterDeps {
  stateStore: IRunStateStore;
  /** @deprecated Mock adapter no longer appends events directly; retained for compatibility. */
  clock?: IClock;
  /** @deprecated Mock adapter no longer appends events directly; retained for compatibility. */
  idempotency?: IdempotencyKeyBuilder;
  projector: SnapshotProjector;
  planFetcher?: {
    fetch(planRef: PlanRef): Promise<ExecutionPlan>;
  };
}
export declare class MockAdapter implements IProviderAdapter {
  private readonly deps;
  readonly provider: 'mock';
  constructor(deps: MockAdapterDeps);
  startRun(planRef: PlanRef, ctx: RunContext): Promise<EngineRunRef>;
  cancelRun(_runRef: EngineRunRef): Promise<void>;
  getRunStatus(runRef: EngineRunRef): Promise<RunStatusSnapshot>;
  signal(_runRef: EngineRunRef, _request: SignalRequest): Promise<void>;
  capabilities(): readonly string[];
}
//# sourceMappingURL=MockAdapter.d.ts.map
