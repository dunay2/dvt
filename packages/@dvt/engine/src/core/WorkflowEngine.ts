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
import {
  parseEngineRunRef,
  parsePlanRef,
  parseRunContext,
  parseSignalRequest,
} from '@dvt/contracts';

import type { IProviderAdapter } from '../adapters/IProviderAdapter.js';
import {
  AdapterNotRegisteredError,
  CapabilitiesNotSupportedError,
  InvalidRunIdError,
  InvalidSchemaVersionError,
  OutboxRateLimitExceededError,
  RunAlreadyExistsError,
  RunMetadataNotFoundError,
  SignalNotImplementedError,
} from '../contracts/errors.js';
import type { IWorkflowEngine } from '../contracts/IWorkflowEngine.v1_1_1.js';
import type { EventType, RunEventInput, RunMetadata } from '../contracts/runEvents.js';
import type { IMetricsCollector } from '../metrics/IMetricsCollector.js';
import type { IOutboxRateLimiter } from '../outbox/IOutboxRateLimiter.js';
import type { IOutboxStorage } from '../outbox/types.js';
import type { IAuthorizer } from '../security/authorizer.js';
import { PlanRefPolicy } from '../security/planRefPolicy.js';
import type { IRunStateStore } from '../state/IRunStateStore.js';
import type { IClock } from '../utils/clock.js';

import { IdempotencyKeyBuilder } from './idempotency.js';
import { SnapshotProjector, snapshotToStatus } from './SnapshotProjector.js';

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

interface HealthCheckable {
  ping?: () => Promise<void>;
}

const NOOP_LOGGER: WorkflowEngineLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
};

const NOOP_METRICS: IMetricsCollector = {
  increment: () => {},
  timing: () => {},
};

export class WorkflowEngine implements IWorkflowEngine {
  private readonly logger: WorkflowEngineLogger;
  private readonly metrics: IMetricsCollector;

  constructor(private readonly deps: WorkflowEngineDeps) {
    this.validateDependencies();
    this.logger = deps.logger ?? NOOP_LOGGER;
    this.metrics = deps.metrics ?? NOOP_METRICS;
  }

  async startRun(planRef: PlanRef, context: RunContext): Promise<EngineRunRef> {
    const validatedPlanRef = parsePlanRef(planRef);
    const validatedContext = parseRunContext(context);
    const startMs = Date.parse(this.deps.clock.nowIsoUtc());
    const metricTags = {
      provider: validatedContext.targetAdapter,
      tenantId: validatedContext.tenantId,
    };

    this.logger.info('Starting run', {
      runId: validatedContext.runId,
      tenantId: validatedContext.tenantId,
      provider: validatedContext.targetAdapter,
      planUri: validatedPlanRef.uri,
    });

    try {
      await this.validateStartRunPreconditions(validatedPlanRef, validatedContext);
      this.checkOutboxRateLimit(validatedContext);

      const provider = validatedContext.targetAdapter;
      const adapter = this.getAdapterOrThrow(provider);
      this.validateCapabilitiesOrThrow(validatedPlanRef, adapter);

      // ADR-0012: Adapter receives PlanRef, owns plan bytes fetch + SHA-256 verification.
      // ADR-0014: Adapter is called first so provider refs are available for atomic bootstrap.
      const runRef = await this.withTimeout(
        adapter.startRun(validatedPlanRef, validatedContext),
        this.deps.timeouts?.adapterCallMs ?? 30_000,
        'adapter.startRun'
      );

      // ADR-0013: provider refs included in bootstrapRunTx — eliminates two-phase write gap.
      const bootMeta: RunMetadata = buildRunMetadata(validatedContext, validatedPlanRef, runRef);
      try {
        await this.deps.stateStore.bootstrapRunTx({
          metadata: bootMeta,
          firstEvents: [this.buildRunEvent(bootMeta, 'RunQueued')],
        });
      } catch (bootstrapError) {
        // Compensate: cancel the adapter run to avoid an orphaned workflow.
        await adapter.cancelRun(runRef).catch((cancelErr: unknown) => {
          this.logger.error('Compensation cancelRun failed after bootstrap error', {
            runId: validatedContext.runId,
            error: toErrorMessage(cancelErr),
          });
        });
        throw bootstrapError;
      }

      this.metrics.increment('dvt.run.started', metricTags);
      this.metrics.timing(
        'dvt.run.start_duration_ms',
        Date.parse(this.deps.clock.nowIsoUtc()) - startMs,
        metricTags
      );
      return runRef;
    } catch (error) {
      return this.handleStartRunError(error, validatedContext, metricTags);
    }
  }

  private async validateStartRunPreconditions(
    planRef: PlanRef,
    context: RunContext
  ): Promise<void> {
    this.deps.planRefPolicy.validateOrThrow(planRef.uri);
    validateSchemaVersionOrThrow(planRef.schemaVersion);
    await this.deps.authorizer.assertTenantAccess(context.tenantId);
    validateRunIdOrThrow(context.runId);
    await this.ensureRunDoesNotExist(context.runId);
  }

  private validateCapabilitiesOrThrow(planRef: PlanRef, adapter: IProviderAdapter): void {
    const required = planRef.requiresCapabilities ?? [];
    if (required.length === 0) return;

    const adapterCaps = adapter.capabilities?.();
    if (adapterCaps === undefined) return; // adapter omits capabilities() — skip validation

    const supported = new Set(adapterCaps);
    const unsupported = required.filter((c) => !supported.has(c));
    if (unsupported.length > 0) {
      throw new CapabilitiesNotSupportedError(unsupported, adapter.provider);
    }
  }

  private checkOutboxRateLimit(context: RunContext): void {
    if (
      this.deps.outboxRateLimiter &&
      !this.deps.outboxRateLimiter.tryAcquire(context.tenantId, 1)
    ) {
      throw new OutboxRateLimitExceededError(context.tenantId);
    }
  }

  private async handleStartRunError(
    error: unknown,
    validatedContext: RunContext,
    metricTags: Record<string, string>
  ): Promise<never> {
    this.metrics.increment('dvt.run.start_failed', metricTags);
    this.logger.error('startRun failed', {
      runId: validatedContext.runId,
      tenantId: validatedContext.tenantId,
      provider: validatedContext.targetAdapter,
      error: toErrorMessage(error),
    });

    const failMeta = await this.deps.stateStore
      .getRunMetadataByRunId(validatedContext.runId)
      .catch(() => null);
    if (failMeta) {
      await this.emitRunEvent(failMeta, 'RunFailed').catch((emitErr: unknown) => {
        this.logger.error('RunFailed emission failed after startRun error', {
          runId: validatedContext.runId,
          error: toErrorMessage(emitErr),
        });
      });
    }
    throw error;
  }

  async cancelRun(engineRunRef: EngineRunRef): Promise<void> {
    const validatedRunRef = parseEngineRunRef(engineRunRef);
    const meta = await this.resolveMetaOrThrow(validatedRunRef);
    await this.deps.authorizer.assertTenantAccess(meta.tenantId);

    const adapter = this.getAdapterOrThrow(meta.provider);
    const startMs = Date.parse(this.deps.clock.nowIsoUtc());
    const metricTags = { provider: meta.provider, tenantId: meta.tenantId };

    this.logger.info('Cancelling run', {
      runId: meta.runId,
      tenantId: meta.tenantId,
      provider: meta.provider,
    });

    await this.withTimeout(
      adapter.cancelRun(validatedRunRef),
      this.deps.timeouts?.adapterCallMs ?? 30_000,
      'adapter.cancelRun'
    );
    // ADR-0007: Engine emits RunCancelRequested (intent). Adapter emits RunCancelled from workflow context.
    await this.emitRunEvent(meta, 'RunCancelRequested');
    this.metrics.increment('dvt.run.cancel_requested', metricTags);
    this.metrics.timing(
      'dvt.run.cancel_duration_ms',
      Date.parse(this.deps.clock.nowIsoUtc()) - startMs,
      metricTags
    );
  }

  async getRunStatus(engineRunRef: EngineRunRef): Promise<RunStatusSnapshot> {
    const validatedRunRef = parseEngineRunRef(engineRunRef);
    const meta = await this.resolveMetaOrThrow(validatedRunRef);
    await this.deps.authorizer.assertTenantAccess(meta.tenantId);
    const startMs = Date.parse(this.deps.clock.nowIsoUtc());

    // ADR-0015: default read path MUST NOT call the provider.
    // Latency must be independent of adapter availability.
    // Snapshot-first (O(1)). Falls back to full replay only when no snapshot exists
    // — e.g. runs predating snapshot support.
    const storedSnap = await this.deps.stateStore.getSnapshot(meta.runId);
    const result = storedSnap
      ? snapshotToStatus(storedSnap)
      : this.deps.projector.rebuild(meta.runId, await this.deps.stateStore.listEvents(meta.runId));

    this.metrics.timing(
      'dvt.run.status_duration_ms',
      Date.parse(this.deps.clock.nowIsoUtc()) - startMs,
      { provider: meta.provider, tenantId: meta.tenantId }
    );
    return result;
  }

  /**
   * ADR-0015: Provider-enriched status. Calls the adapter for real-time substatus/message.
   *
   * Use for UI polling or diagnostic endpoints where provider latency is acceptable.
   * MUST NOT be used on the default status read path.
   * Circuit breaking is the caller's responsibility at the infrastructure layer.
   */
  async enrichRunStatus(engineRunRef: EngineRunRef): Promise<RunStatusSnapshot> {
    const validatedRunRef = parseEngineRunRef(engineRunRef);
    const meta = await this.resolveMetaOrThrow(validatedRunRef);
    await this.deps.authorizer.assertTenantAccess(meta.tenantId);

    const adapter = this.getAdapterOrThrow(meta.provider);

    const storedSnap = await this.deps.stateStore.getSnapshot(meta.runId);
    const base = storedSnap
      ? snapshotToStatus(storedSnap)
      : this.deps.projector.rebuild(meta.runId, await this.deps.stateStore.listEvents(meta.runId));

    const providerView = await this.withTimeout(
      adapter.getRunStatus(validatedRunRef),
      this.deps.timeouts?.adapterCallMs ?? 30_000,
      'adapter.getRunStatus'
    );

    return {
      ...base,
      ...(providerView.substatus !== undefined ? { substatus: providerView.substatus } : {}),
      ...(providerView.message !== undefined ? { message: providerView.message } : {}),
    };
  }

  async signal(engineRunRef: EngineRunRef, request: SignalRequest): Promise<void> {
    const validatedRunRef = parseEngineRunRef(engineRunRef);
    const validatedRequest = parseSignalRequest(request);

    const meta = await this.resolveMetaOrThrow(validatedRunRef);
    await this.deps.authorizer.assertTenantAccess(meta.tenantId);

    const adapter = this.getAdapterOrThrow(meta.provider);

    // Provider-native signalling.
    await this.withTimeout(
      adapter.signal(validatedRunRef, validatedRequest),
      this.deps.timeouts?.adapterCallMs ?? 30_000,
      'adapter.signal'
    );

    const mappedEventType = this.mapSignalToRunEventType(validatedRequest.type);
    if (mappedEventType) {
      await this.emitSignalDerivedRunEvent(meta, validatedRequest, mappedEventType);
    }
  }

  async healthCheck(): Promise<HealthStatus> {
    const checks: Array<{ name: string; target: HealthCheckable }> = [
      { name: 'stateStore', target: this.deps.stateStore as IRunStateStore & HealthCheckable },
      { name: 'outbox', target: this.deps.outbox as IOutboxStorage & HealthCheckable },
      ...Array.from(this.deps.adapters.values()).map((adapter) => ({
        name: `adapter-${adapter.provider}`,
        target: adapter as IProviderAdapter & HealthCheckable,
      })),
    ];

    const components = await Promise.all(
      checks.map(async ({ name, target }) => {
        if (!target.ping) {
          return { name, status: 'up' as const };
        }
        try {
          await target.ping();
          return { name, status: 'up' as const };
        } catch (error) {
          return {
            name,
            status: 'down' as const,
            error: toErrorMessage(error),
          };
        }
      })
    );

    return {
      status: components.every((component) => component.status === 'up') ? 'healthy' : 'degraded',
      components,
    };
  }

  private getAdapterOrThrow(provider: EngineRunRef['provider']): IProviderAdapter {
    const adapter = this.deps.adapters.get(provider);
    if (!adapter) throw new AdapterNotRegisteredError(provider);
    return adapter;
  }

  private mapSignalToRunEventType(type: SignalRequest['type']): EventType | null {
    if (type === 'RETRY_STEP' || type === 'RETRY_RUN') {
      // Phase 2: planner-driven deterministic retry semantics.
      throw new SignalNotImplementedError(type);
    }

    // ADR-0007: CANCEL signal maps to RunCancelRequested (intent). Adapter emits RunCancelled.
    const byType: Record<'PAUSE' | 'RESUME' | 'CANCEL', EventType> = {
      PAUSE: 'RunPaused',
      RESUME: 'RunResumed',
      CANCEL: 'RunCancelRequested',
    };

    return byType[type as 'PAUSE' | 'RESUME' | 'CANCEL'] ?? null;
  }

  private async resolveMetaOrThrow(runRef: EngineRunRef): Promise<RunMetadata> {
    const m = await this.deps.stateStore.getRunMetadataByRunId(runRef.runId);
    if (!m) {
      throw new RunMetadataNotFoundError(runRef.runId);
    }
    return m;
  }

  private async emitRunEvent(meta: RunMetadata, eventType: EventType): Promise<void> {
    await this.deps.stateStore.appendAndEnqueueTx(meta.runId, [
      this.buildRunEvent(meta, eventType),
    ]);
  }

  private async emitSignalDerivedRunEvent(
    meta: RunMetadata,
    req: SignalRequest,
    eventType: EventType
  ): Promise<void> {
    const input: RunEventInput = {
      eventId: this.deps.idempotency.eventId(),
      eventType,
      emittedAt: this.deps.clock.nowIsoUtc(),
      tenantId: meta.tenantId,
      projectId: meta.projectId,
      environmentId: meta.environmentId,
      runId: meta.runId,
      planId: meta.planId,
      planVersion: meta.planVersion,
      engineAttemptId: 1,
      logicalAttemptId: meta.logicalAttemptId,
      idempotencyKey: this.deps.idempotency.signalKey(
        {
          runId: meta.runId,
          logicalAttemptId: meta.logicalAttemptId,
          planId: meta.planId,
          planVersion: meta.planVersion,
        },
        req
      ),
    };

    await this.deps.stateStore.appendAndEnqueueTx(meta.runId, [input]);
  }

  private buildRunEvent(meta: RunMetadata, eventType: EventType): RunEventInput {
    return {
      eventId: this.deps.idempotency.eventId(),
      eventType,
      emittedAt: this.deps.clock.nowIsoUtc(),
      tenantId: meta.tenantId,
      projectId: meta.projectId,
      environmentId: meta.environmentId,
      runId: meta.runId,
      planId: meta.planId,
      planVersion: meta.planVersion,
      engineAttemptId: 1,
      logicalAttemptId: meta.logicalAttemptId,
      idempotencyKey: this.deps.idempotency.runEventKey({
        eventType,
        runId: meta.runId,
        logicalAttemptId: meta.logicalAttemptId,
        planId: meta.planId,
        planVersion: meta.planVersion,
      }),
    };
  }

  private async ensureRunDoesNotExist(runId: string): Promise<void> {
    const existing = await this.deps.stateStore.getRunMetadataByRunId(runId);
    if (existing) throw new RunAlreadyExistsError(runId);
  }

  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    operation: string
  ): Promise<T> {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`${operation} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  private validateDependencies(): void {
    const requiredDeps: Array<[name: string, value: unknown]> = [
      ['stateStore', this.deps.stateStore],
      ['outbox', this.deps.outbox],
      ['projector', this.deps.projector],
      ['idempotency', this.deps.idempotency],
      ['clock', this.deps.clock],
      ['authorizer', this.deps.authorizer],
      ['planRefPolicy', this.deps.planRefPolicy],
      ['adapters', this.deps.adapters],
    ];

    for (const [name, value] of requiredDeps) {
      if (!value) {
        throw new Error(`${name} is required`);
      }
    }

    this.assertRequiredProvidersRegistered(this.deps.requiredProviders ?? []);
  }

  private assertRequiredProvidersRegistered(requiredProviders: EngineRunRef['provider'][]): void {
    for (const provider of requiredProviders) {
      if (!this.deps.adapters.has(provider)) throw new AdapterNotRegisteredError(provider);
    }
  }
}

function validateSchemaVersionOrThrow(schemaVersion: string): void {
  // Contract: engine rejects unknown schema versions; supports <=3 minor versions back.
  // MVP: accept v1.x only.
  if (!schemaVersion.startsWith('v1.')) throw new InvalidSchemaVersionError(schemaVersion);
}

function validateRunIdOrThrow(runId: string): void {
  // Defensive format guard: letters/digits + [._:-], no spaces.
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(runId)) throw new InvalidRunIdError(runId);
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// ADR-0013: runRef is passed in so provider refs are included in the atomic bootstrapRunTx.
function buildRunMetadata(ctx: RunContext, planRef: PlanRef, runRef: EngineRunRef): RunMetadata {
  return {
    tenantId: ctx.tenantId,
    projectId: ctx.projectId,
    environmentId: ctx.environmentId,
    runId: ctx.runId,
    planId: planRef.planId,
    planVersion: planRef.planVersion,
    // Phase 1: always 1. Phase 2: planner supplies via RunContext on retry.
    logicalAttemptId: 1,
    provider: ctx.targetAdapter,
    providerWorkflowId: runRef.workflowId,
    providerRunId: runRef.runId,
    ...(runRef.provider === 'temporal' ? { providerNamespace: runRef.namespace } : {}),
    ...(runRef.provider === 'temporal' && runRef.taskQueue
      ? { providerTaskQueue: runRef.taskQueue }
      : {}),
    ...(runRef.provider === 'conductor' ? { providerConductorUrl: runRef.conductorUrl } : {}),
  };
}
