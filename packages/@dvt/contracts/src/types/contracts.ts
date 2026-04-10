import type { $brand } from 'zod';

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

export type NonBlankString = string & $brand<'NonBlankString'>;
export type IsoUtcString = NonBlankString & $brand<'IsoUtcString'>;
export type Sha256HexString = NonBlankString & $brand<'Sha256HexString'>;

// Branded primitive aliases
export type TenantId = string & { readonly __brand: 'TenantId' };
export type RunId = string & { readonly __brand: 'RunId' };
export type StepId = NonBlankString & $brand<'StepId'>;
export type EventId = string & { readonly __brand: 'EventId' };
export type IdempotencyKey = string & { readonly __brand: 'IdempotencyKey' };

type Assert<T extends true> = T;
export type ContractPrimitiveBrandAssertions = [
  Assert<string extends NonBlankString ? false : true>,
  Assert<string extends StepId ? false : true>,
  Assert<StepId extends NonBlankString ? true : false>,
  Assert<IsoUtcString extends NonBlankString ? true : false>,
  Assert<Sha256HexString extends NonBlankString ? true : false>,
];

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

export interface RunFailureEvidence {
  stepId: StepId;
  reason?: NonBlankString;
  message?: NonBlankString;
  failedAt: IsoUtcString;
}

export interface RunExecutionEvidence {
  activeStepId?: StepId;
  failure?: RunFailureEvidence;
  materialization?: MaterializationEvidence;
}

export interface RunStatusSnapshot {
  runId: NonBlankString;
  status: RunStatus;
  substatus?: RunSubstatus | AdapterScopedSubstatus;
  message?: string;
  startedAt?: IsoUtcString;
  completedAt?: IsoUtcString;
  execution?: RunExecutionEvidence;
}

export interface MaterializationEvidence {
  executor: TransformationExecutor;
  environmentId: NonBlankString;
  sinkTable: NonBlankString;
  rowsWritten: number;
  startedAt: IsoUtcString;
  completedAt: IsoUtcString;
  durationMs: number;
}

export interface TransformationFlowRuntimeBinding {
  previewProfile: NonBlankString;
  executor: TransformationExecutor;
}

export interface PlanRef {
  uri: NonBlankString;
  sha256: NonBlankString;
  schemaVersion: NonBlankString;
  planId: NonBlankString;
  planVersion: NonBlankString;
  sizeBytes?: number;
  expiresAt?: IsoUtcString;
}

export interface RunExecutionPolicy {
  /**
   * Deterministic fingerprint of the plan-level plugin compatibility surface.
   * When present, admission-time runExecutionContext artifacts MUST align with
   * this value.
   */
  pluginCompatibilityFingerprint?: Sha256HexString | undefined;
  /**
   * Capabilities this run requires from the selected adapter.
   * Strings MUST be drawn from the normative enum in capabilities.schema.json.
   */
  requiresCapabilities?: NonBlankString[] | undefined;
}

export interface RunExecutionContextRef {
  uri: NonBlankString;
  sha256: NonBlankString;
  schemaVersion: NonBlankString;
  planId: NonBlankString;
  planVersion: NonBlankString;
  /**
   * Optional echoed compatibility fingerprint bound to the referenced context.
   * If supplied, it MUST match the governing plan-level fingerprint.
   */
  pluginCompatibilityFingerprint?: Sha256HexString | undefined;
}

export interface RunExecutionContext {
  schemaVersion: NonBlankString;
  planId: NonBlankString;
  planVersion: NonBlankString;
  planSha256: NonBlankString;
  /**
   * Deterministic fingerprint used to verify plugin/runtime compatibility
   * against the governing plan artifact at admission and replay boundaries.
   */
  pluginCompatibilityFingerprint?: Sha256HexString | undefined;
  tenantId: NonBlankString;
  projectId: NonBlankString;
  environmentId: NonBlankString;
  targetAdapter: Exclude<Provider, 'mock'> | 'mock';
  createdAtIso: IsoUtcString;
  createdBy: NonBlankString;
  pluginContexts: Record<string, Record<string, NonBlankString>>;
}

export interface RunContext {
  tenantId: NonBlankString;
  projectId: NonBlankString;
  environmentId: NonBlankString;
  runId: NonBlankString;
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
  parentRunId?: NonBlankString;
  /**
   * First run in the recovery chain.
   * For an initial run this SHOULD equal `runId`.
   */
  originRunId?: NonBlankString;
}

/**
 * Dedicated recovery command boundary (ADR-0049).
 * Recovery is NOT part of generic signal(...) semantics.
 */
export interface RecoverRunCommand {
  sourceRunId: NonBlankString;
  planRef: PlanRef;
  context: RunContext;
}

export type EngineRunRef =
  | {
      provider: 'temporal';
      tenantId: NonBlankString;
      namespace: NonBlankString;
      workflowId: NonBlankString;
      runId: NonBlankString;
      taskQueue?: NonBlankString;
    }
  | {
      provider: 'conductor';
      tenantId: NonBlankString;
      workflowId: NonBlankString;
      runId: NonBlankString;
      conductorUrl: NonBlankString;
    }
  | {
      provider: 'mock';
      tenantId: NonBlankString;
      workflowId: NonBlankString;
      runId: NonBlankString;
    };

export type SignalType = 'PAUSE' | 'RESUME' | 'CANCEL';

export interface SignalRequest {
  signalId: NonBlankString; // caller-provided idempotency id
  type: SignalType;
  reason?: string;
  requestedAt?: IsoUtcString;
}
