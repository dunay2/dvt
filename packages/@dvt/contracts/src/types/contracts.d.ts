/**
 * @file packages/@dvt/contracts/src/types/contracts.ts
 * @baseline ADR-0005: Contract Formalization Tooling
 * @baseline ADR-0006: Contract Tooling Governance
 * @decision Section 2 — Canonical core contract primitives (tenant/run/provider/status) are versioned in a single type module
 * @consequence All adapters and engine components share deterministic compile-time contract vocabulary
 * @version 1.0.0
 * @date 2026-02-21
 */
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
  | 'RECOVERING'
  | 'CANCELLING';
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
  /**
   * Capabilities this plan requires from the target adapter.
   * Strings MUST be drawn from the normative enum in capabilities.schema.json.
   * The engine rejects the run if the adapter does not declare all required capabilities.
   */
  requiresCapabilities?: string[];
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
      tenantId: string;
      namespace: string;
      workflowId: string;
      runId: string;
      taskQueue?: string;
    }
  | {
      provider: 'conductor';
      tenantId: string;
      workflowId: string;
      runId: string;
      conductorUrl: string;
    }
  | {
      provider: 'mock';
      tenantId: string;
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
