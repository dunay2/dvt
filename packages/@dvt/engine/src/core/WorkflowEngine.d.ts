/**
 * @file packages/@dvt/engine/src/core/WorkflowEngine.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @baseline ADR-0004: Event Sourcing Strategy (Extended)
 * @decision Decision — The engine orchestrates run lifecycle while preserving domain semantics and event-sourced persistence
 * @consequence Execution remains deterministic and decoupled from provider runtimes via explicit ports
 * @baseline ADR-0012: Plan Integrity Ownership (adapter receives PlanRef, not ExecutionPlan)
 * @baseline ADR-0013: bootstrapRunTx atomicity (provider refs included in bootstrap)
 * @baseline ADR-0014: Run-Driven Adapter Model
 * @baseline ADR-0015: getRunStatus read-model separation (no provider call on default path)
 * @version 2.0.0
 * @date 2026-02-21
 */
import type {
  EngineRunRef,
  PlanRef,
  RunContext,
  RunStatusSnapshot,
  SignalRequest,
} from '@dvt/contracts';
import type { IProviderAdapter } from '../adapters/IProviderAdapter.js';
import type { IWorkflowEngine } from '../contracts/IWorkflowEngine.v1_1_1.js';
import type { IMetricsCollector } from '../metrics/IMetricsCollector.js';
import type { IOutboxRateLimiter } from '../outbox/IOutboxRateLimiter.js';
import type { IOutboxStorage } from '../outbox/types.js';
import type { IAuthorizer } from '../security/authorizer.js';
import { PlanRefPolicy } from '../security/planRefPolicy.js';
import type { IRunStateStore } from '../state/IRunStateStore.js';
import type { IClock } from '../utils/clock.js';
import { IdempotencyKeyBuilder } from './idempotency.js';
import { SnapshotProjector } from './SnapshotProjector.js';
export interface WorkflowEngineDeps {
  stateStore: IRunStateStore;
  outbox: IOutboxStorage;
  projector: SnapshotProjector;
  idempotency: IdempotencyKeyBuilder;
  clock: IClock;
  authorizer: IAuthorizer;
  planRefPolicy: PlanRefPolicy;
  adapters: Map<EngineRunRef['provider'], IProviderAdapter>;
  /** Optional providers that MUST be registered at boot time. */
  requiredProviders?: EngineRunRef['provider'][];
  /**
   * Optional per-tenant outbox rate limiter.
   * When provided, `startRun` will reject with `OutboxRateLimitExceededError`
   * if the tenant has exceeded its configured burst / sustained throughput.
   */
  outboxRateLimiter?: IOutboxRateLimiter;
  /** Optional structured metrics collector. No-op when omitted. */
  metrics?: IMetricsCollector;
  /** Optional structured logger for observability. */
  logger?: WorkflowEngineLogger;
  /** Optional operation timeouts for external calls. */
  timeouts?: {
    adapterCallMs?: number;
    outboxEnqueueMs?: number;
  };
}
export interface WorkflowEngineLogger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}
export interface HealthStatus {
  status: 'healthy' | 'degraded';
  components: Array<{
    name: string;
    status: 'up' | 'down';
    error?: string;
  }>;
}
export declare class WorkflowEngine implements IWorkflowEngine {
  private readonly deps;
  private readonly logger;
  private readonly metrics;
  constructor(deps: WorkflowEngineDeps);
  startRun(planRef: PlanRef, context: RunContext): Promise<EngineRunRef>;
  private validateStartRunPreconditions;
  private validateCapabilitiesOrThrow;
  private checkOutboxRateLimit;
  private handleStartRunError;
  cancelRun(engineRunRef: EngineRunRef): Promise<void>;
  getRunStatus(engineRunRef: EngineRunRef): Promise<RunStatusSnapshot>;
  /**
   * ADR-0015: Provider-enriched status. Calls the adapter for real-time substatus/message.
   *
   * Use for UI polling or diagnostic endpoints where provider latency is acceptable.
   * MUST NOT be used on the default status read path.
   * Circuit breaking is the caller's responsibility at the infrastructure layer.
   */
  enrichRunStatus(engineRunRef: EngineRunRef): Promise<RunStatusSnapshot>;
  signal(engineRunRef: EngineRunRef, request: SignalRequest): Promise<void>;
  healthCheck(): Promise<HealthStatus>;
  private getAdapterOrThrow;
  private mapSignalToRunEventType;
  private resolveMetaOrThrow;
  private emitRunEvent;
  private emitSignalDerivedRunEvent;
  private buildRunEvent;
  /**
   * Scans for runs stuck in PENDING longer than `options.thresholdMs` and emits
   * `RunFailed` (payload.reason = 'QUEUED_TIMEOUT') for each.
   *
   * Intended to be called from a scheduled job (e.g., every 30 s).
   * The caller is responsible for circuit-breaking and back-pressure.
   *
   * @returns runIds that were transitioned to FAILED.
   */
  detectStuckRuns(options: {
    /** Runs in PENDING for longer than this many milliseconds are considered stuck. */
    thresholdMs: number;
    /** Restrict scan to a single tenant. Omit to scan all tenants. */
    tenantId?: string;
    /** Maximum candidates to inspect per call (default: 100). */
    limit?: number;
  }): Promise<string[]>;
  private ensureRunDoesNotExist;
  private withTimeout;
  private validateDependencies;
  private assertRequiredProvidersRegistered;
}
//# sourceMappingURL=WorkflowEngine.d.ts.map
