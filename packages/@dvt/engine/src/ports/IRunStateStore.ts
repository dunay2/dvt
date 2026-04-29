/**
 * @ownedConcern Define engine run-state persistence ports and plugin-neutral lifecycle event payloads.
 */

import type {
  ExecutionPlan as CanonicalExecutionPlan,
  EngineRunRef,
  IsoUtcString,
  PlanRef,
  Provider,
  RunExecutionEvidence,
  RunExecutionPolicy,
  RunStatus,
  StepId,
} from '@dvt/contracts';

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

export type StepEventInput = RunEventInputBase & { stepId: StepId };
export type RunEventInput = RunEventInputBase & { stepId?: never };
export type EventInput = StepEventInput | RunEventInput;

export type EventEnvelope = EventInput & {
  runSeq: number;
  persistedAt: IsoUtcString;
};

/**
 * Generic content-addressable artifact reference emitted in step lifecycle events.
 * This is the step-kind-agnostic runtime contract (`MW-A3`).
 */
export interface StepArtifactRef {
  /**
   * Canonical artifact discriminator, e.g. `compiled-sql`, `python.script`, `spark.job-spec`.
   */
  artifactKind: string;
  /** SHA-256 hex digest of the compiled SQL bytes (content-addressable key). */
  sha256: string;
  /** Object storage URI: s3://<bucket>/<key> | gs://<bucket>/<key> | file://<path> (dev only). */
  storageUri: string;
  /** Size of the compiled SQL blob in bytes. */
  sizeBytes: number;
  /** Character encoding. MUST be 'utf-8'. Default: 'utf-8'. */
  encoding?: 'utf-8';
}

/**
 * Compiled-code reference view for callers that do not need the artifact discriminator.
 */
export interface CompiledCodeRef extends Omit<StepArtifactRef, 'artifactKind'> {}

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
  providerRef: EngineRunRef;
  createdAt?: IsoUtcString;
}

/**
 * Provider-ref reconciliation payload for pre-bootstrapped runs.
 * The update itself stays fully discriminated by provider.
 */
export type ProviderRefUpdate = EngineRunRef;

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

/**
 * Version marker for persisted WorkflowSnapshot shape.
 * Development baseline for persisted WorkflowSnapshot rows.
 * The active branch keeps one snapshot schema line (`1`) while the
 * execution-evidence shape evolves in development.
 */
export const CURRENT_WORKFLOW_SNAPSHOT_SCHEMA_VERSION = 1 as const;

export interface WorkflowSnapshot {
  schemaVersion: number;
  runId: string;
  status: RunStatus;
  startedAt?: IsoUtcString;
  completedAt?: IsoUtcString;
  execution?: RunExecutionEvidence;
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

export interface RetryAttemptReservation {
  parentRunId: string;
  originRunId: string;
  logicalAttemptId: number;
}

export interface IRunStateStoreWrite {
  bootstrapRunTx(input: RunBootstrapInput): Promise<AppendResult>;
  appendAndEnqueueTx(runId: string, events: EventInput[]): Promise<AppendResult>;
  /**
   * Reconciles persisted provider identity after a pre-bootstrap estimate.
   * Implementations MUST reject tenant drift and provider discriminator changes.
   */
  saveProviderRef(
    tenantId: string,
    runId: string,
    providerRef: ProviderRefUpdate
  ): Promise<RunMetadata>;
  /**
   * Atomically reserves the next business retry lineage slot for a new run
   * derived from `sourceRunId`.
   */
  reserveRetryAttempt(tenantId: string, sourceRunId: string): Promise<RetryAttemptReservation>;
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
  stepId?: StepId;
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
  fetch(planRef: PlanRef): Promise<StoredPlanArtifact>;
}

export interface IPlanIntegrityValidator {
  fetchAndValidate(
    planRef: PlanRef,
    fetcher: IPlanFetcher
  ): Promise<{ plan: ExecutionPlan; executionPolicy: RunExecutionPolicy }>;
}

export interface StoredPlanArtifact {
  bytes: Uint8Array;
  executionPolicy: RunExecutionPolicy;
}
