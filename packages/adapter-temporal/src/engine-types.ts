/**
 * Minimal type surface from @dvt/engine re-declared locally.
 *
 * These are structurally compatible with the real engine types so that
 * callers can pass real engine instances (InMemoryTxStore, IdempotencyKeyBuilder, etc.)
 * without a compile-time dependency on the engine dist artefacts.
 *
 * When the engine package has stable build output, these can be replaced
 * with direct imports from '@dvt/engine'.
 */

import type { IsoUtcString, PlanRef } from '@dvt/contracts';

// ---------------------------------------------------------------------------
// Event types (mirrors engine/contracts/runEvents.ts)
// ---------------------------------------------------------------------------

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
  provider: 'temporal' | 'conductor' | 'mock';
  providerWorkflowId: string;
  providerRunId: string;
  providerNamespace?: string;
  providerTaskQueue?: string;
  providerConductorUrl?: string;
}

// ---------------------------------------------------------------------------
// Execution plan (mirrors engine/contracts/executionPlan.ts)
// ---------------------------------------------------------------------------

export interface ExecutionPlan {
  metadata: {
    planId: string;
    planVersion: string;
    schemaVersion: string;
    requiresCapabilities?: string[];
    fallbackBehavior?: 'reject' | 'emulate' | 'degrade';
    targetAdapter?: 'temporal' | 'conductor' | 'any' | 'mock';
  };
  steps: Array<
    {
      stepId: string;
      kind?: string;
      /**
       * Optional dependency edges for DAG execution.
       * If omitted, workflow falls back to strict input order.
       */
      dependsOn?: string[];
    } & Record<string, unknown>
  >;
}

// ---------------------------------------------------------------------------
// State store (mirrors engine/state/IRunStateStore.ts)
// ---------------------------------------------------------------------------

export interface AppendResult {
  appended: EventEnvelope[];
  deduped: EventEnvelope[];
}

export interface RunBootstrapInput {
  metadata: RunMetadata;
  firstEvents: EventInput[];
}

export interface IRunStateStore {
  bootstrapRunTx(input: RunBootstrapInput): Promise<AppendResult>;
  appendAndEnqueueTx(runId: string, events: EventInput[]): Promise<AppendResult>;
  getRunMetadataByRunId(runId: string): Promise<RunMetadata | null>;
  saveProviderRef(
    runId: string,
    runRef: {
      providerWorkflowId: string;
      providerRunId: string;
      providerNamespace?: string;
      providerTaskQueue?: string;
      providerConductorUrl?: string;
    }
  ): Promise<void>;
  listEvents(runId: string): Promise<EventEnvelope[]>;
}

// ---------------------------------------------------------------------------
// Outbox (mirrors engine/outbox/types.ts)
// ---------------------------------------------------------------------------

export interface IOutboxStorage {
  enqueueTx(runId: string, events: EventEnvelope[]): Promise<void>;
}

// ---------------------------------------------------------------------------
// Clock (mirrors engine/utils/clock.ts)
// ---------------------------------------------------------------------------

export interface IClock {
  nowIsoUtc(): IsoUtcString;
}

// ---------------------------------------------------------------------------
// Idempotency (mirrors engine/core/idempotency.ts)
// ---------------------------------------------------------------------------

export interface EventIdempotencyInput {
  eventType: EventType;
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

// ---------------------------------------------------------------------------
// Plan integrity (mirrors engine/security/planIntegrity.ts)
// ---------------------------------------------------------------------------

export interface IPlanFetcher {
  fetch(planRef: PlanRef): Promise<Uint8Array>;
}

export interface IPlanIntegrityValidator {
  fetchAndValidate(planRef: PlanRef, fetcher: IPlanFetcher): Promise<Uint8Array>;
}
