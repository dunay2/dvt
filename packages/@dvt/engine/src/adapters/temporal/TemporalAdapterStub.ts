import type { EngineRunRef, RunContext, RunStatusSnapshot, SignalRequest } from '@dvt/contracts';

import type { ExecutionPlan } from '../../contracts/executionPlan.js';
import type { IProviderAdapter } from '../IProviderAdapter.js';

/**
 * Stub for Phase 1 engine-core integration.
 * Phase 2+ should wire Temporal SDK client/workers.
 * References:
 * - Temporal TS SDK: https://docs.temporal.io/develop/typescript
 */
export class TemporalAdapterStub implements IProviderAdapter {
  readonly provider = 'temporal' as const;

  async startRun(_plan: ExecutionPlan, _ctx: RunContext): Promise<EngineRunRef> {
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
}
