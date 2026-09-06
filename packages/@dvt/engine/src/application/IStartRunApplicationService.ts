import type { EngineRunRef, PlanRef, ResolvedRunContext } from '@dvt/contracts';

import type { IProviderAdapter } from '../adapters/IProviderAdapter.js';
import type { StartRunTraceContext } from '../core/lifecycle/StartRunTraceContext.js';
import type { StartRunPreparation } from '../services/startRun/StartRunTypes.js';

export interface IStartRunApplicationService {
  startRun(
    planRef: PlanRef,
    resolvedContext: ResolvedRunContext,
    traceContext: StartRunTraceContext
  ): Promise<EngineRunRef>;
  startPreparedRun(
    planRef: PlanRef,
    resolvedContext: ResolvedRunContext,
    traceContext: StartRunTraceContext,
    preparation: StartRunPreparation,
    admittedAdapter: IProviderAdapter
  ): Promise<EngineRunRef>;
}
