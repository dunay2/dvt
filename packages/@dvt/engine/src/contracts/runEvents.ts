/**
 * @file packages/@dvt/engine/src/contracts/runEvents.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @baseline ADR-0004: Event Sourcing Strategy (Extended)
 * @decision Decision — The run/step event model is append-only and typed for deterministic state replay
 * @consequence Persistence, projection and outbox share a canonical envelope with idempotency semantics
 * @version 1.0.0
 * @date 2026-02-21
 */
import type { IsoUtcString, RunStatus } from './types.js';

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
  /**
   * Planner-driven retry counter. Must be included in all idempotency key preimages
   * so that events from different logical attempts do not collide.
   * Phase 1: always 1. Phase 2: planner increments on retry.
   */
  logicalAttemptId: number;
  provider: 'temporal' | 'conductor' | 'mock';
  providerWorkflowId: string;
  providerRunId: string;
  providerNamespace?: string;
  providerTaskQueue?: string;
  providerConductorUrl?: string;
  /**
   * ISO UTC timestamp when bootstrapRunTx was called (= when the run entered PENDING).
   * Used by detectStuckRuns to compute time-in-PENDING against a SLA threshold.
   * Optional for backward compatibility with runs bootstrapped before this field was added.
   */
  createdAt?: IsoUtcString;
}

export interface WorkflowSnapshot {
  runId: string;
  status: RunStatus;
  startedAt?: IsoUtcString;
  completedAt?: IsoUtcString;
  paused: boolean;
  /** True between RunCancelRequested and RunCancelled. ADR-0007. */
  cancelling: boolean;
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
