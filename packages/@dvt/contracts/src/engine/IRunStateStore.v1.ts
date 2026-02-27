import type { IsoUtcString, PlanRef, RunStatus } from '../types/contracts';

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
  payload?: Record<string, unknown>;
}

export type StepEventInput = RunEventInputBase & { stepId: string };
export type RunEventInput = RunEventInputBase & { stepId?: never };
export type EventInput = StepEventInput | RunEventInput;

export type EventEnvelope = EventInput & {
  runSeq: number;
  persistedAt: IsoUtcString;
};

export interface RunMetadata {
  tenantId: string;
  projectId: string;
  environmentId: string;
  runId: string;
  planId: string;
  planVersion: string;
  logicalAttemptId?: number;
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

export interface IRunStateStore {
  bootstrapRunTx(input: RunBootstrapInput): Promise<AppendResult>;
  appendAndEnqueueTx(runId: string, events: EventInput[]): Promise<AppendResult>;
  getRunMetadataByRunId(tenantId: string, runId: string): Promise<RunMetadata | null>;
  listEvents(
    tenantId: string,
    runId: string,
    options?: ListEventsOptions
  ): Promise<EventEnvelope[]>;
  /**
   * Returns run metadata records, most-recently created first.
   * Useful for dashboard / admin listing — does not include run status.
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

export interface RunStateCommandPort {
  bootstrapRun(input: RunBootstrapInput): Promise<AppendResult>;
  appendTransitions(runId: string, events: EventInput[]): Promise<AppendResult>;
}

export interface ExecutionPlan {
  metadata: {
    planId: string;
    planVersion: string;
    schemaVersion: string;
    contractVersion?: string;
    inputHashSha256?: string;
    requiresCapabilities?: string[];
    fallbackBehavior?: 'reject' | 'emulate' | 'degrade';
    targetAdapter?: 'temporal' | 'conductor' | 'any' | 'mock';
  };
  steps: Array<
    {
      stepId: string;
      kind?: string;
      type?: 'task' | 'gateway';
      gateway?: {
        dslVersion: '1.0';
        expression: string;
      };
      dependsOn?: string[];
    } & Record<string, unknown>
  >;
}

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
  eventId(): string;
}

export interface IPlanFetcher {
  fetch(planRef: PlanRef): Promise<Uint8Array>;
}

export interface IPlanIntegrityValidator {
  fetchAndValidate(planRef: PlanRef, fetcher: IPlanFetcher): Promise<Uint8Array>;
}
