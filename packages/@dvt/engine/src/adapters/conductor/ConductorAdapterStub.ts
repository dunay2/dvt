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

/**
 * Stub for Phase 1 engine-core integration.
 * Phase 2+ should wire Netflix Conductor client.
 * References:
 * - Conductor: https://github.com/netflix/conductor/wiki
 */
export class ConductorAdapterStub implements IProviderAdapter {
  readonly provider = 'conductor' as const;

  async startRun(_planRef: PlanRef, _ctx: RunContext): Promise<EngineRunRef> {
    throw new Error('NotImplemented: ConductorAdapter (Phase 2+)');
  }
  async cancelRun(_runRef: EngineRunRef): Promise<void> {
    throw new Error('NotImplemented: ConductorAdapter (Phase 2+)');
  }
  async getRunStatus(_runRef: EngineRunRef): Promise<RunStatusSnapshot> {
    throw new Error('NotImplemented: ConductorAdapter (Phase 2+)');
  }
  async signal(_runRef: EngineRunRef, _request: SignalRequest): Promise<void> {
    throw new Error('NotImplemented: ConductorAdapter (Phase 2+)');
  }
}
