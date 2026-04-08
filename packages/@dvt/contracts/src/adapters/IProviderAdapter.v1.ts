/**
 * @file packages/@dvt/contracts/src/adapters/IProviderAdapter.v1.ts
 * @baseline ADR-0003: Execution Model
 * @baseline ADR-0005: Contract Formalization Tooling
 * @decision Section 2 — Provider adapter lifecycle/status/signal operations are formalized as a stable contract
 * @consequence Engine orchestration can target heterogeneous providers through a deterministic interface boundary
 * @version 1.0.0
 * @date 2026-02-21
 */
import type { SignalSemanticsVersion } from '../contracts/engine/SignalSemantics.v1.js';
import type { ExecutionPlan } from '../contracts/planner/ExecutionPlan.v1.js';
import type {
  EngineRunRef,
  PlanRef,
  ResolvedRunContext,
  RunStatusSnapshot,
  SignalRequest,
} from '../types/contracts.js';

export interface IProviderAdapter {
  readonly provider: EngineRunRef['provider'];

  startRun(plan: ExecutionPlan, planRef: PlanRef, ctx: ResolvedRunContext): Promise<EngineRunRef>;
  cancelRun(runRef: EngineRunRef): Promise<void>;
  getRunStatus(runRef: EngineRunRef): Promise<RunStatusSnapshot>;
  signal(runRef: EngineRunRef, request: SignalRequest): Promise<void>;
  signalSemanticsVersions(): readonly SignalSemanticsVersion[];

  /**
   * Optional. Computes a deterministic EngineRunRef from RunContext WITHOUT a network call.
   * When implemented, WorkflowEngine bootstraps run_metadata before adapter.startRun(),
   * eliminating the dual-producer event ordering race.
   */
  estimateRunRef?(ctx: ResolvedRunContext): EngineRunRef;
}
