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
/** Capabilities declared by the Conductor adapter. Must stay in sync with adapters.capabilities.json. */
const CONDUCTOR_CAPABILITIES = [
  'basic-execution',
  'signal.pause.emulated',
  'cancel.forced',
  'workflow.fan.parallel',
  'query.task.state',
  'replay.task',
  'signals.rate.limit',
] as const;

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

  capabilities(): readonly string[] {
    return CONDUCTOR_CAPABILITIES;
  }

  /** ADR-0030 §3.3: Stub — returns null until Phase 2+ Conductor integration. */
  async lookupRunRef(_runId: string, _tenantId: string): Promise<EngineRunRef | null> {
    return null;
  }
}
