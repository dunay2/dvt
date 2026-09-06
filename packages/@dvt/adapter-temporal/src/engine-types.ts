/**
 * @file packages/@dvt/adapter-temporal/src/engine-types.ts
 *
 * Adapter-temporal no define contratos locales: consume los contratos canonicos
 * desde sus paquetes owner.
 */

export type { IOutboxStorage } from '@dvt/delivery';
export type { IStoredPlanArtifactReader } from '@dvt/artifacts';

export type {
  AppendResult,
  EventEnvelope,
  EventIdempotencyInput,
  EventInput,
  EventType,
  ExecutionPlan,
  ExecutionStep,
  ResolvedRunContext,
  RunBootstrapInput,
  RunMetadata,
} from '@dvt/contracts';

export type {
  IClock,
  IIdempotencyKeyBuilder,
  IPlanIntegrityValidator,
  IRunStateStore,
  RunStateCommandPort,
} from '@dvt/engine';
