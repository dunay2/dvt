/**
 * @file packages/@dvt/adapter-temporal/src/engine-types.ts
 *
 * Adapter-temporal no define contratos locales: consume el canon en @dvt/contracts.
 */

import type { PlanRef } from '@dvt/contracts';
import type {
  AppendResult,
  EventType,
  RunEventInput as EventInput,
} from '@dvt/engine/src/contracts/runEvents';
import type { RunBootstrapInput } from '@dvt/engine/src/ports/IRunStateStore';

export type { IRunStateStore, RunBootstrapInput } from '@dvt/engine/src/ports/IRunStateStore';

export type {
  AppendResult,
  EventEnvelope,
  EventType,
  RunEventInput as EventInput,
  RunMetadata,
} from '@dvt/engine/src/contracts/runEvents';

export type { ExecutionPlan } from '@dvt/engine/src/contracts/executionPlan';

export type { IOutboxStorage } from '@dvt/engine/src/outbox/types';

export interface EventIdempotencyInput {
  eventType: EventType;
  tenantId: string;
  runId: string;
  logicalAttemptId: number;
  planId: string;
  planVersion: string;
  stepId?: string;
}

export interface IClock {
  nowIsoUtc(): string;
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

export interface RunStateCommandPort {
  bootstrapRun(input: RunBootstrapInput): Promise<AppendResult>;
  appendTransitions(runId: string, events: EventInput[]): Promise<AppendResult>;
}
