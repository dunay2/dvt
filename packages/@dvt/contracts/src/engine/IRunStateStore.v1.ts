import type { ExecutionPlan as CanonicalExecutionPlan } from '../contracts/planner/ExecutionPlan.v1.js';
import type { IsoUtcString, PlanRef, Provider, RunStatus } from '../types/contracts.js';

export type EventType =
  | 'RunQueued'
  | 'RunStarted'
  | 'RunPaused'
  | 'RunResumed'
  | 'RunCancelRequested'
  | 'RunCancelled'
  | 'RunCompleted'
  | 'RunFailed'
  | 'StepStarted'
  | 'StepCompleted'
  | 'StepFailed'
  | 'StepSkipped';

export interface RunEventInputBase {
  eventId: string;
  eventType: EventType;
  runId: string;
  emittedAt: IsoUtcString;
  tenantId: string;
  projectId: string;
  environmentId: string;
  planId: string;
  planVersion: string;
  engineAttemptId: number;
  logicalAttemptId: number;
  idempotencyKey: string;
  payloadVersion: 1;
  payload?: Record<string, unknown>;
}

export type StepEventInput = RunEventInputBase & { stepId: string };
export type RunEventInput = RunEventInputBase & { stepId?: never };
export type EventInput = StepEventInput | RunEventInput;

export type EventEnvelope = EventInput & {
  runSeq: number;
  persistedAt: IsoUtcString;
};

/**
 * Content-addressable reference to a compiled SQL artifact stored in object storage.
 * Attached to StepStarted.payload for DBT_MODEL and DBT_TEST step kinds.
 *
 * Design: ADR-0032 - Option A (reference in StepStarted.payload)
 * Pattern: Content-Addressable Storage (CAS) with SHA-256 as key.
 *
 * INV-CCREF-001: sha256 MUST be the SHA-256 hex digest of the blob at storageUri.
 * INV-CCREF-003: Field is OPTIONAL. Absent = not an error. Consumers must fail-open.
 * INV-CCREF-006: Event log stores ONLY this reference, never the SQL text.
 * INV-CCREF-007: file:// is ONLY valid in local dev; prohibited in NODE_ENV=production.
 */
export interface CompiledCodeRef {
  /** SHA-256 hex digest of the compiled SQL bytes (content-addressable key). */
  sha256: string;
  /** Object storage URI: s3://<bucket>/<key> | gs://<bucket>/<key> | file://<path> (dev only). */
  storageUri: string;
  /** Size of the compiled SQL blob in bytes. */
  sizeBytes: number;
  /** Character encoding. MUST be 'utf-8'. Default: 'utf-8'. */
  encoding?: 'utf-8';
}

export interface RunMetadata {
  tenantId: string;
  projectId: string;
  environmentId: string;
  runId: string;
  planId: string;
  planVersion: string;
  /**
   * Business retry lineage counter resolved by the engine/application layer.
   */
  logicalAttemptId: number;
  /**
   * Immediate source run for recovery-created runs.
   */
  parentRunId?: string;
  /**
   * First run in the recovery chain. Implementations SHOULD persist the
   * initial runId here for root runs to keep retry reservation stable.
   */
  originRunId?: string;
  provider: 'temporal' | 'conductor' | 'mock';
  providerWorkflowId: string;
  providerRunId: string;
  providerNamespace?: string;
  providerTaskQueue?: string;
  providerConductorUrl?: string;
  createdAt?: IsoUtcString;
}

export interface AppendResult {
  appended: EventEnvelope[];
  deduped: EventEnvelope[];
  lastSeq: number;
}

export interface RunBootstrapInput {
  metadata: RunMetadata;
  firstEvents: EventInput[];
}

export interface ListRunsOptions {
  /** Tenant scope is mandatory to prevent cross-tenant leaks. */
  tenantId: string;
  /** Maximum records to return (default: 50). */
  limit?: number;
  /**
   * Filter by snapshot status. Only returns runs whose materialized snapshot
   * matches this status. Implementations without snapshot access may ignore this field.
   */
  status?: RunStatus;
}

export interface ListEventsOptions {
  /**
   * Keyset cursor: return only events with run_seq strictly greater than this value.
   * Omit to start from the beginning.
   */
  afterSeq?: number;
  /**
   * Maximum events to return in this page.
   * Omit for no limit (full scan). Only safe on recovery/rebuild paths where
   * getSnapshot() returned null. The hot read path MUST use getSnapshot() instead.
   */
  limit?: number;
}

export interface WorkflowSnapshot {
  runId: string;
  status: RunStatus;
  startedAt?: IsoUtcString;
  completedAt?: IsoUtcString;
  paused: boolean;
  cancelling: boolean;
  /**
   * Gateway decisions materialized from gateway StepCompleted events.
   * Key: gateway stepId, Value: evaluated boolean decision.
   */
  gatewayDecisions?: Record<string, boolean>;
  steps: Record<
    string,
    {
      status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
      startedAt?: IsoUtcString;
      completedAt?: IsoUtcString;
      attempts: number;
    }
  >;
}

export interface ProviderRefUpdate {
  providerWorkflowId: string;
  providerRunId: string;
  providerNamespace?: string;
  providerTaskQueue?: string;
  providerConductorUrl?: string;
}

export interface RetryAttemptReservation {
  parentRunId: string;
  originRunId: string;
  logicalAttemptId: number;
}

export interface IRunStateStoreWrite {
  bootstrapRunTx(input: RunBootstrapInput): Promise<AppendResult>;
  appendAndEnqueueTx(runId: string, events: EventInput[]): Promise<AppendResult>;
  /**
   * Atomically reserves the next business retry lineage slot for a new run
   * derived from `sourceRunId`.
   */
  reserveRetryAttempt?(tenantId: string, sourceRunId: string): Promise<RetryAttemptReservation>;

  /**
   * Updates the provider-assigned references on an already-bootstrapped run.
   *
   * Called after `adapter.startRun()` returns a `firstExecutionRunId` that differs
   * from the `estimateRunRef()` value written at bootstrap time.
   * Optional - the engine call-site is fail-soft.
   */
  saveProviderRef?(tenantId: string, runId: string, update: ProviderRefUpdate): Promise<void>;
}

export interface IRunStateStoreRead {
  getRunMetadataByRunId(tenantId: string, runId: string): Promise<RunMetadata | null>;

  listEvents(
    tenantId: string,
    runId: string,
    options?: ListEventsOptions
  ): Promise<EventEnvelope[]>;

  /**
   * Returns run metadata records, most-recently created first.
   * Useful for dashboard / admin listing - does not include run status.
   */
  listRuns(options: ListRunsOptions): Promise<RunMetadata[]>;

  /**
   * Returns the latest materialized WorkflowSnapshot for the run, or null if
   * no snapshot exists yet (run predates snapshot support, or store crashed
   * between event commit and snapshot upsert).
   *
   * Callers MUST fall back to full event replay when null is returned.
   */
  getSnapshot(tenantId: string, runId: string): Promise<WorkflowSnapshot | null>;
}

export interface IRunStateStoreMaintenance {
  /**
   * Replays all persisted events for the run from the beginning and overwrites
   * the materialized snapshot with the result.
   *
   * Use for recovery/repair when the snapshot is known to be stale, missing,
   * or corrupt.
   *
   * ADR-0004 Section 2.2: runSeq is the authority for event ordering; replay MUST
   * consume events ordered by runSeq ASC.
   * ADR-0031: tenant isolation enforced - throws when the run does not belong
   * to the given tenantId.
   * Implementations MUST throw a typed not-found error with stable `code`
   * `RUN_NOT_FOUND`; callers MUST NOT infer semantics by parsing `message`
   * text.
   *
   * @throws RunNotFoundError-compatible error when the run does not exist or
   *   belongs to a different tenant.
   */
  rebuildSnapshot(tenantId: string, runId: string): Promise<WorkflowSnapshot>;
}

export type IRunStateStore = IRunStateStoreWrite & IRunStateStoreRead & IRunStateStoreMaintenance;

export interface RunStateCommandPort {
  bootstrapRun(input: RunBootstrapInput): Promise<AppendResult>;
  appendTransitions(runId: string, events: EventInput[]): Promise<AppendResult>;
}

export type ExecutionPlan = CanonicalExecutionPlan;

export interface IClock {
  nowIsoUtc(): IsoUtcString;
}

export interface EventIdempotencyInput {
  eventType: EventType;
  tenantId: string;
  runId: string;
  logicalAttemptId: number;
  planId: string;
  planVersion: string;
  stepId?: string;
}

export interface IIdempotencyKeyBuilder {
  runEventKey(e: EventIdempotencyInput): string;
  /**
   * INV-INTENT-011: deterministic, versioned, canonical derivation for
   * start-run intent identity from (tenantId, runId, logicalAttemptId, targetAdapter).
   */
  startRunIntentId(
    tenantId: string,
    runId: string,
    logicalAttemptId?: number,
    targetAdapter?: Provider
  ): string;
  eventId(): string;
}

export interface IPlanFetcher {
  fetch(planRef: PlanRef): Promise<Uint8Array>;
}

export interface IPlanIntegrityValidator {
  fetchAndValidate(planRef: PlanRef, fetcher: IPlanFetcher): Promise<Uint8Array>;
}
