import type { IsoUtcString, RunStatus } from './types.js';

export type EventType =
  | 'RunQueued'
  | 'RunStarted'
  | 'RunPaused'
  | 'RunResumed'
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
  tenantId: string;
  projectId: string;
  environmentId: string;
  planId: string;
  planVersion: string;
  logicalAttemptId: number;
  engineAttemptId: number;
  emittedAt: IsoUtcString;
  idempotencyKey: string;
  payload?: Record<string, unknown>;
}

export type RunLevelEventInput = RunEventInputBase & {
  stepId?: never;
};

export type StepLevelEventInput = RunEventInputBase & {
  stepId: string;
};

export type RunEventInput = RunLevelEventInput | StepLevelEventInput;

export type RunEventPersisted = RunEventInput & {
  runSeq: number;
  persistedAt: IsoUtcString;
};

// Backward-compat aliases used by existing packages.
export type EventEnvelope = RunEventPersisted;

export interface AppendResult {
  appended: RunEventPersisted[];
  deduped: RunEventPersisted[];
}

export interface RunMetadata {
  tenantId: string;
  projectId: string;
  environmentId: string;
  runId: string;
  planId: string;
  planVersion: string;
  provider: 'temporal' | 'conductor' | 'mock';
  providerWorkflowId: string;
  providerRunId: string;
  providerNamespace?: string;
  providerTaskQueue?: string;
  providerConductorUrl?: string;
}

export interface WorkflowSnapshot {
  runId: string;
  status: RunStatus;
  startedAt?: IsoUtcString;
  completedAt?: IsoUtcString;
  paused: boolean;
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
