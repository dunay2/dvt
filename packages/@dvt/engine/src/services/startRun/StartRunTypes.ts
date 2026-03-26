export interface StartRunTraceContext {
  readonly tenantId: string;
  readonly projectId: string;
  readonly environmentId: string;
  readonly runId: string;
  readonly planId?: string;
  readonly adapter?: 'temporal' | 'conductor' | 'local';
}

export interface StartRunErrorContext {
  intentId?: string;
}
