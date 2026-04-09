/**
 * @file packages/@dvt/adapter-temporal/src/engine-types.ts
 *
 * Adapter-temporal no define contratos locales: consume el canon en @dvt/contracts.
 */

export type {
  AppendResult,
  CompiledCodeRef,
  EventEnvelope,
  EventIdempotencyInput,
  EventInput,
  EventType,
  ExecutionPlan,
  ExecutionStep,
  IOutboxStorage,
  ResolvedRunContext,
  RunBootstrapInput,
  RunMetadata,
} from '@dvt/contracts';

export type {
  IClock,
  IIdempotencyKeyBuilder,
  IPlanFetcher,
  IPlanIntegrityValidator,
  IRunStateStore,
  RunStateCommandPort,
} from '@dvt/engine';
