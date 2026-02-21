export type IsoUtcString = string;
export type TenantId = string & {
  readonly __brand: 'TenantId';
};
export type RunId = string & {
  readonly __brand: 'RunId';
};
export type StepId = string & {
  readonly __brand: 'StepId';
};
export type EventId = string & {
  readonly __brand: 'EventId';
};
export type IdempotencyKey = string & {
  readonly __brand: 'IdempotencyKey';
};
export type Provider = 'temporal' | 'conductor' | 'mock';
export type RunStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'RUNNING'
  | 'PAUSED'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';
export type RunSubstatus =
  | 'DRAINING'
  | 'RETRYING'
  | 'CONTINUE_AS_NEW'
  | 'WAITING_APPROVAL'
  | 'RECOVERING';
export type AdapterScopedSubstatus = `${Provider}/${string}`;
export interface RunStatusSnapshot {
  runId: string;
  status: RunStatus;
  substatus?: RunSubstatus | AdapterScopedSubstatus;
  message?: string;
  startedAt?: IsoUtcString;
  completedAt?: IsoUtcString;
  /**
   * Deterministic hash of the logical snapshot state. Implemented using RFC8785 canonical JSON + SHA-256.
   */
  hash?: string;
}
export interface PlanRef {
  uri: string;
  sha256: string;
  schemaVersion: string;
  planId: string;
  planVersion: string;
  sizeBytes?: number;
  expiresAt?: IsoUtcString;
}
export interface RunContext {
  tenantId: string;
  projectId: string;
  environmentId: string;
  runId: string;
  targetAdapter: Exclude<Provider, 'mock'> | 'mock';
}
export type EngineRunRef =
  | {
      provider: 'temporal';
      namespace: string;
      workflowId: string;
      runId: string;
      taskQueue?: string;
    }
  | {
      provider: 'conductor';
      workflowId: string;
      runId: string;
      conductorUrl: string;
    }
  | {
      provider: 'mock';
      workflowId: string;
      runId: string;
    };
export type SignalType = 'PAUSE' | 'RESUME' | 'CANCEL' | 'RETRY_STEP' | 'RETRY_RUN';
export interface SignalRequest {
  signalId: string;
  type: SignalType;
  stepId?: string;
  reason?: string;
  requestedAt?: IsoUtcString;
}
//# sourceMappingURL=contracts.d.ts.map
