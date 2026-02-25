/**
 * @file packages/@dvt/engine/src/adapters/temporal/TemporalAdapterStub.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @decision Decision — The Temporal provider remains encapsulated behind an adapter stub while full integration is implemented
 * @consequence The engine API stays stable and traceable during the transition to the real Temporal runtime
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
import type { IProviderAdapter } from '../IProviderAdapter.js';
/**
 * Stub for Phase 1 engine-core integration.
 * Phase 2+ should wire Temporal SDK client/workers.
 * References:
 * - Temporal TS SDK: https://docs.temporal.io/develop/typescript
 */
export declare class TemporalAdapterStub implements IProviderAdapter {
  readonly provider: 'temporal';
  startRun(_planRef: PlanRef, _ctx: RunContext): Promise<EngineRunRef>;
  cancelRun(_runRef: EngineRunRef): Promise<void>;
  getRunStatus(_runRef: EngineRunRef): Promise<RunStatusSnapshot>;
  signal(_runRef: EngineRunRef, _request: SignalRequest): Promise<void>;
}
//# sourceMappingURL=TemporalAdapterStub.d.ts.map
