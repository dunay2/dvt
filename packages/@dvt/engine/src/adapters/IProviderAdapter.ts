/**
 * @file packages/@dvt/engine/src/adapters/IProviderAdapter.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @decision Decision — Define an adapter contract oriented to run-driven execution and explicit signaling
 * @consequence The engine retains semantic control and allows swapping runtimes without breaking the domain
 * @version 1.0.0
 * @date 2026-02-21
 */
import type { EngineRunRef, RunContext, RunStatusSnapshot, SignalRequest } from '@dvt/contracts';

import type { ExecutionPlan } from '../contracts/executionPlan.js';

export interface IProviderAdapter {
  readonly provider: EngineRunRef['provider'];

  /**
   * Starts the run using the fully-resolved ExecutionPlan.
   * The engine owns plan fetching; adapters receive the plan, not just a URI.
   */
  startRun(plan: ExecutionPlan, ctx: RunContext): Promise<EngineRunRef>;
  cancelRun(runRef: EngineRunRef): Promise<void>;
  getRunStatus(runRef: EngineRunRef): Promise<RunStatusSnapshot>;
  signal(runRef: EngineRunRef, request: SignalRequest): Promise<void>;
  ping?(): Promise<void>;
}
