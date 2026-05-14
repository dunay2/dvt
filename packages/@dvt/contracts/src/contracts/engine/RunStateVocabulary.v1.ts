/**
 * @ownedConcern Publish shared run-state vocabulary for persisted events,
 * snapshots, and artifact refs without owning engine behavior ports.
 */

import type {
  EngineRunRef,
  IsoUtcString,
  Provider,
  RunExecutionEvidence,
  RunStatus,
  StepId,
} from '../../types/contracts.js';
import type { ExecutionPlan as CanonicalExecutionPlan } from '../planner/ExecutionPlan.v1.js';

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
  artifactKind: string;
  sha256: string;
  storageUri: string;
  sizeBytes: number;
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
  logicalAttemptId: number;
  parentRunId?: string;
  originRunId?: string;
  providerRef: EngineRunRef;
  createdAt?: IsoUtcString;
}

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
  tenantId: string;
  limit?: number;
  status?: RunStatus;
}

export interface ListEventsOptions {
  afterSeq?: number;
  limit?: number;
}

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

export type ExecutionPlan = CanonicalExecutionPlan;

export interface EventIdempotencyInput {
  eventType: EventType;
  tenantId: string;
  runId: string;
  logicalAttemptId: number;
  planId: string;
  planVersion: string;
  stepId?: StepId;
}

export interface StartRunIntentIdempotencyInput {
  tenantId: string;
  runId: string;
  logicalAttemptId?: number;
  targetAdapter?: Provider;
}
