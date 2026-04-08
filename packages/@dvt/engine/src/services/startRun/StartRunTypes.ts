import type { TraceableAdapter } from '../../core/lifecycle/coreDomainConstants.js';

export interface StartRunTraceContext {
  readonly tenantId: string;
  readonly projectId: string;
  readonly environmentId: string;
  readonly runId: string;
  readonly planId?: string;
  readonly adapter?: TraceableAdapter;
}

export interface StartRunErrorContext {
  intentId?: string;
}
