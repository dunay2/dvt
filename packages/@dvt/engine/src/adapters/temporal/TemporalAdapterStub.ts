/**
 * @file packages/@dvt/engine/src/adapters/temporal/TemporalAdapterStub.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @decision Decision — The Temporal provider remains encapsulated behind an adapter stub while full integration is implemented
 * @consequence The engine API stays stable and traceable during the transition to the real Temporal runtime
 * @version 1.0.0
 * @date 2026-02-21
 */
import {
  CURRENT_SIGNAL_SEMANTICS_VERSION,
  type EngineRunRef,
  type PlanRef,
  type ResolvedRunContext,
  type RunStatusSnapshot,
  type SignalRequest,
  type SignalSemanticsVersion,
} from '@dvt/contracts';

import type { IProviderAdapter } from '../IProviderAdapter.js';

/**
 * Stub for Phase 1 engine-core integration.
 * Phase 2+ should wire Temporal SDK client/workers.
 * References:
 * - Temporal TS SDK: https://docs.temporal.io/develop/typescript
 */
export class TemporalAdapterStub implements IProviderAdapter {
  readonly provider = 'temporal' as const;

  async startRun(_planRef: PlanRef, _ctx: ResolvedRunContext): Promise<EngineRunRef> {
    throw new Error('NotImplemented: TemporalAdapter (Phase 2+)');
  }
  async cancelRun(_runRef: EngineRunRef): Promise<void> {
    throw new Error('NotImplemented: TemporalAdapter (Phase 2+)');
  }
  async getRunStatus(_runRef: EngineRunRef): Promise<RunStatusSnapshot> {
    throw new Error('NotImplemented: TemporalAdapter (Phase 2+)');
  }
  async signal(_runRef: EngineRunRef, _request: SignalRequest): Promise<void> {
    throw new Error('NotImplemented: TemporalAdapter (Phase 2+)');
  }

  signalSemanticsVersions(): readonly SignalSemanticsVersion[] {
    return [CURRENT_SIGNAL_SEMANTICS_VERSION];
  }
}
