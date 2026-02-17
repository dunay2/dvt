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
  | 'StepFailed';

export interface EventEnvelopeBase {
  eventType: EventType;
  emittedAt: IsoUtcString;
  tenantId: string;
  projectId: string;
  environmentId: string;
  runId: string;
  engineAttemptId: number;
  logicalAttemptId: number;
  runSeq: number;
  idempotencyKey: string;
}

export type StepEventEnvelope = EventEnvelopeBase & { stepId: string };
export type RunEventEnvelope = EventEnvelopeBase & { stepId?: never };
export type EventEnvelope = StepEventEnvelope | RunEventEnvelope;

export interface RunMetadata {
  tenantId: string;
  projectId: string;
  environmentId: string;
  runId: string;
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
  steps: Array<{ stepId: string; kind?: string } & Record<string, unknown>>;
}

// ---------------------------------------------------------------------------
// State store (mirrors engine/state/IRunStateStore.ts)
// ---------------------------------------------------------------------------

export interface AppendResult {
  appended: EventEnvelope[];
  deduped: EventEnvelope[];
}

export interface IRunStateStore {
  saveRunMetadata(meta: RunMetadata): Promise<void>;
  getRunMetadataByRunId(runId: string): Promise<RunMetadata | null>;
  appendEventsTx(runId: string, envelopes: Omit<EventEnvelope, 'runSeq'>[]): Promise<AppendResult>;
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
  tenantId: string;
  runId: string;
  logicalAttemptId: number;
  stepId?: string;
}

export interface IIdempotencyKeyBuilder {
  runEventKey(e: EventIdempotencyInput): string;
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
