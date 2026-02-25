/**
 * @file packages/@dvt/engine/src/adapters/IProviderAdapter.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @baseline ADR-0012: Plan Integrity Ownership (adapter receives PlanRef, not ExecutionPlan)
 * @baseline ADR-0014: Run-Driven Adapter Model
 * @decision Decision — Define an adapter contract oriented to run-driven execution and explicit signaling
 * @decision ADR-0012: Adapter owns plan bytes fetch + SHA-256 verification; engine must not fetch bytes
 * @consequence The engine retains semantic control and allows swapping runtimes without breaking the domain
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
export interface IProviderAdapter {
  readonly provider: EngineRunRef['provider'];
  /**
   * Starts the run using the PlanRef (not the resolved ExecutionPlan).
   *
   * ADR-0012: Adapter owns plan bytes fetch + SHA-256 verification.
   * ADR-0014: Run-driven adapter model — adapter receives PlanRef and initiates workflow.
   *
   * The engine MUST NOT fetch plan bytes before calling startRun.
   * Adapters are the plan-bytes trust boundary.
   */
  startRun(planRef: PlanRef, ctx: RunContext): Promise<EngineRunRef>;
  cancelRun(runRef: EngineRunRef): Promise<void>;
  getRunStatus(runRef: EngineRunRef): Promise<RunStatusSnapshot>;
  signal(runRef: EngineRunRef, request: SignalRequest): Promise<void>;
  ping?(): Promise<void>;
  /**
   * Returns the capability identifiers this adapter implements.
   * Used by the engine to enforce `PlanRef.requiresCapabilities` before starting a run.
   * Strings MUST be from capabilities.schema.json.
   * Optional: adapters that omit this method skip capability validation.
   */
  capabilities?(): readonly string[];
}
//# sourceMappingURL=IProviderAdapter.d.ts.map
