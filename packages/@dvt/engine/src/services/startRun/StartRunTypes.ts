/**
 * @ownedConcern Declare shared start-run application phase context types.
 */
import type { EngineRunRef, PlanRef, ResolvedRunContext } from '@dvt/contracts';

import type { IProviderAdapter } from '../../adapters/IProviderAdapter.js';
import type { StartRunTraceContext } from '../../core/lifecycle/StartRunTraceContext.js';

export interface StartRunErrorContext {
  intentId?: string;
}

export interface StartRunExecutionInput {
  adapter: IProviderAdapter;
  planRef: PlanRef;
  resolvedContext: ResolvedRunContext;
  traceContext: StartRunTraceContext;
  intentId: string;
}

export interface IStartRunExecutionService {
  executeStartRun(input: StartRunExecutionInput): Promise<EngineRunRef>;
}

export interface IStartRunFailurePolicy {
  markIntentResolvedBestEffort(input: {
    intentId: string;
    tenantId: string;
    runId: string;
    provider: EngineRunRef['provider'];
    traceContext: StartRunTraceContext;
  }): Promise<void>;

  handleStartRunError(input: {
    error: unknown;
    resolvedContext: ResolvedRunContext;
    metricTags: Record<string, string>;
    traceContext: StartRunTraceContext;
    errorContext: StartRunErrorContext;
  }): Promise<never>;
}
