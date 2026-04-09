/**
 * @file packages/@dvt/contracts/src/types/contracts.ts
 * @baseline ADR-0005: Contract Formalization Tooling
 * @baseline ADR-0006: Contract Tooling Governance
 * @decision Section 2 — Canonical core contract primitives (tenant/run/provider/status) are versioned in a single type module
 * @consequence All adapters and engine components share deterministic compile-time contract vocabulary
 * @version 1.0.0
 * @date 2026-02-21
 */
// Contracts: types.ts
// Version: v1.1.1 (subset needed for this implementation)

export type IsoUtcString = string;

// Branded primitive aliases
export type TenantId = string & { readonly __brand: 'TenantId' };
export type RunId = string & { readonly __brand: 'RunId' };
export type StepId = string & { readonly __brand: 'StepId' };
export type EventId = string & { readonly __brand: 'EventId' };
export type IdempotencyKey = string & { readonly __brand: 'IdempotencyKey' };

export type Provider = 'temporal' | 'conductor' | 'mock';
export type TransformationExecutor = 'postgres' | 'dbt';

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
}

export interface MaterializationEvidence {
  executor: TransformationExecutor;
  environmentId: string;
  sinkTable: string;
  rowsWritten: number;
  startedAt: IsoUtcString;
  completedAt: IsoUtcString;
  durationMs: number;
}

export interface TransformationFlowRuntimeBinding {
  previewProfile: string;
  executor: TransformationExecutor;
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

export interface RunExecutionPolicy {
  /**
   * Deterministic fingerprint of the plan-level plugin compatibility surface.
   * When present, admission-time runExecutionContext artifacts MUST align with
   * this value.
   */
  pluginCompatibilityFingerprint?: string | undefined;
  /**
   * Capabilities this run requires from the selected adapter.
   * Strings MUST be drawn from the normative enum in capabilities.schema.json.
   */
  requiresCapabilities?: string[] | undefined;
}

export interface RunExecutionContextRef {
  uri: string;
  sha256: string;
  schemaVersion: string;
  planId: string;
  planVersion: string;
  /**
   * Optional echoed compatibility fingerprint bound to the referenced context.
   * If supplied, it MUST match the governing plan-level fingerprint.
   */
  pluginCompatibilityFingerprint?: string | undefined;
}

export interface RunExecutionContext {
  schemaVersion: string;
  planId: string;
  planVersion: string;
  planSha256: string;
  /**
   * Deterministic fingerprint used to verify plugin/runtime compatibility
   * against the governing plan artifact at admission and replay boundaries.
   */
  pluginCompatibilityFingerprint?: string | undefined;
  tenantId: string;
  projectId: string;
  environmentId: string;
  targetAdapter: Exclude<Provider, 'mock'> | 'mock';
  createdAtIso: IsoUtcString;
  createdBy: string;
  pluginContexts: Record<string, Record<string, string>>;
}

export interface RunContext {
  tenantId: string;
  projectId: string;
  environmentId: string;
  runId: string;
  targetAdapter: Exclude<Provider, 'mock'> | 'mock';
  runExecutionContextRef?: RunExecutionContextRef;
}

/**
 * Engine-resolved execution context passed to provider adapters.
 *
 * Public callers MUST NOT supply `logicalAttemptId` directly. The engine or
 * application layer resolves logical retry lineage before dispatch.
 */
export interface ResolvedRunContext extends RunContext {
  /**
   * Business retry counter for the recovery chain.
   * `1` = first business execution, `2+` = recovered execution in the same chain.
   */
  logicalAttemptId: number;
  /**
   * Immediate source run for a recovery/retry-created run.
   * Undefined for the first run in a chain.
   */
  parentRunId?: string;
  /**
   * First run in the recovery chain.
   * For an initial run this SHOULD equal `runId`.
   */
  originRunId?: string;
}

/**
 * Dedicated recovery command boundary (ADR-0049).
 * Recovery is NOT part of generic signal(...) semantics.
 */
export interface RecoverRunCommand {
  sourceRunId: string;
  planRef: PlanRef;
  context: RunContext;
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

export type SignalType = 'PAUSE' | 'RESUME' | 'CANCEL';

export interface SignalRequest {
  signalId: string; // caller-provided idempotency id
  type: SignalType;
  reason?: string;
  requestedAt?: IsoUtcString;
}
