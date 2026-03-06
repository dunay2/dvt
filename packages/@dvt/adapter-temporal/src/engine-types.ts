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
  IClock,
  IIdempotencyKeyBuilder,
  IPlanFetcher,
  IPlanIntegrityValidator,
  IOutboxStorage,
  IRunStateStore,
  RunBootstrapInput,
  RunMetadata,
  RunStateCommandPort,
} from '@dvt/contracts';
