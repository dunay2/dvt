/**
 * State Store Contract Types (v1.0)
 */
export type AppendResult = {
  runSeq: number;
  appended: unknown[];
};
export interface CanonicalEngineEvent {
  runId: string;
  runSeq: number;
  eventId: string;
  stepId?: string;
  engineAttemptId?: string;
  logicalAttemptId?: string;
  eventType: string;
  eventData: unknown;
  idempotencyKey: string;
  emittedAt: string;
  persistedAt?: string;
  adapterVersion?: string;
  engineRunRef?: unknown;
  causedBySignalId?: string;
  parentEventId?: string;
}
export type StepStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'SKIPPED';
export interface StepSnapshot {
  stepId: string;
  status: StepStatus;
  logicalAttemptId: string;
  engineAttemptId?: string;
  startedAt?: string;
  completedAt?: string;
  artifacts: unknown[];
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
}
export interface RunSnapshot {
  runId: string;
  status: string;
  lastEventSeq: number;
  steps: StepSnapshot[];
  artifacts: unknown[];
  startedAt?: string;
  completedAt?: string;
  totalDurationMs?: number;
}
export type WorkflowState = RunSnapshot;
export interface FetchEventsOptions {
  afterSeq?: number;
  limit?: number;
}
export interface SnapshotProjector {
  projectRun(runId: string, events: CanonicalEngineEvent[]): Promise<RunSnapshot>;
  incrementalProject(
    snapshot: RunSnapshot,
    newEvents: CanonicalEngineEvent[]
  ): Promise<RunSnapshot>;
  detectNonContiguous(
    lastSeq: number,
    nextSeq: number
  ): Promise<{
    observedNonContiguous: boolean;
  }>;
}
export interface IRunStateStore {
  appendEvent(event: CanonicalEngineEvent): Promise<AppendResult>;
  fetchEvents(runId: string, options: FetchEventsOptions): Promise<CanonicalEngineEvent[]>;
  getSnapshot(runId: string): Promise<RunSnapshot | null>;
  projectSnapshot(runId: string): Promise<RunSnapshot>;
}
//# sourceMappingURL=state-store.d.ts.map
