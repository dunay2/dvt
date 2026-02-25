/**
 * @file packages/@dvt/engine/src/contracts/types.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @decision Decision — Canonical run/context/ref types govern execution semantics in the domain
 * @consequence Adapters and application layers share strong, consistent contracts across runtimes
 * @version 1.0.0
 * @date 2026-02-21
 */
export type IsoUtcString = string;
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
//# sourceMappingURL=types.d.ts.map
