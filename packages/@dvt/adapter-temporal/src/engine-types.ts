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
  IClock,
  IIdempotencyKeyBuilder,
  IPlanFetcher,
  IPlanIntegrityValidator,
  IOutboxStorage,
  IRunStateStore,
  ResolvedRunContext,
  RunBootstrapInput,
  RunMetadata,
  RunStateCommandPort,
} from '@dvt/contracts';
