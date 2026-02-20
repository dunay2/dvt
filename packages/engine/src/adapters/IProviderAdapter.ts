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
