/**
 * @file packages/@dvt/adapter-temporal/src/engine-types.ts
 *
 * Adapter-temporal no define contratos locales: consume el canon en @dvt/contracts.
 */

export type {
  AppendResult,
  EventEnvelope,
  EventIdempotencyInput,
  EventInput,
  EventType,
  ExecutionPlan,
  IClock,
  IIdempotencyKeyBuilder,
  IPlanFetcher,
  IPlanIntegrityValidator,
  IRunStateStore,
  RunBootstrapInput,
  RunMetadata,
  RunStateCommandPort,
} from '@dvt/contracts';

export type { IOutboxStorage } from '@dvt/engine/src/outbox/types';
