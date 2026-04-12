import type { EngineRunRef, PlanRef, ResolvedRunContext } from '@dvt/contracts';

import type { StartRunTraceContext } from '../core/lifecycle/StartRunTraceContext.js';

export interface IStartRunApplicationService {
  startRun(
    planRef: PlanRef,
    resolvedContext: ResolvedRunContext,
    traceContext: StartRunTraceContext
  ): Promise<EngineRunRef>;
}
