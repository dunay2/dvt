/**
 * @file packages/@dvt/engine/src/adapters/conductor/ConductorAdapterStub.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @baseline ADR-0012: Plan Integrity Ownership
 * @baseline ADR-0014: Run-Driven Adapter Model
 * @decision Decision — The Conductor provider remains behind an adapter stub until full runtime integration is completed
 * @consequence The engine preserves the run-driven contract without prematurely coupling to the Conductor SDK
 * @version 2.0.0
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
export declare class ConductorAdapterStub implements IProviderAdapter {
  readonly provider: 'conductor';
  startRun(_planRef: PlanRef, _ctx: RunContext): Promise<EngineRunRef>;
  cancelRun(_runRef: EngineRunRef): Promise<void>;
  getRunStatus(_runRef: EngineRunRef): Promise<RunStatusSnapshot>;
  signal(_runRef: EngineRunRef, _request: SignalRequest): Promise<void>;
  capabilities(): readonly string[];
}
//# sourceMappingURL=ConductorAdapterStub.d.ts.map
