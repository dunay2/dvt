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
 * @baseline ADR-0030: Pre-Dispatch Intent Log for startRun Crash Consistency
 * @version 2.0.0
 * @date 2026-02-21
 */
import {
  parseEngineRunRef,
  parsePlanRef,
  parseRunContext,
  parseSignalRequest,
} from '@dvt/contracts';
import type {
  EngineRunRef,
  PlanRef,
  ResolvedRunContext,
  RunContext,
  RunStatusSnapshot,
  SignalRequest,
} from '@dvt/contracts';
import type { IObservability, ISpan } from '@dvt/observability';

import type { IProviderAdapter } from '../adapters/IProviderAdapter.js';
import {
  AdapterNotRegisteredError,
  CapabilitiesNotSupportedError,
  InvalidRunIdError,
  InvalidSchemaVersionError,
  RunAlreadyExistsError,
  RunMetadataNotFoundError,
  SignalNotImplementedError,
} from '../contracts/errors.js';
import type { IWorkflowEngine } from '../contracts/IWorkflowEngine.v1_1_1.js';
import { assertSupportedPlanVersion } from '../contracts/PlanVersionPolicy.js';
import type { EventType, RunEventInput, RunMetadata } from '../contracts/runEvents.js';
import type { IRunStateStoreRead, IRunStateStoreWrite } from '../ports/IRunStateStore.js';
import type { IStartRunIntentStore } from '../ports/IStartRunIntentStore.js';
import type { IRunAccessPolicy } from '../security/RunAccessPolicy.js';
import type { IClock } from '../utils/clock.js';

import { IdempotencyKeyBuilder } from './idempotency.js';
import { SnapshotProjector, snapshotToStatus } from './SnapshotProjector.js';

export interface WorkflowEngineDeps {
  stateStoreRead: IRunStateStoreRead;
  stateStoreWrite: IRunStateStoreWrite;
  projector: SnapshotProjector;
  idempotency: IdempotencyKeyBuilder;
  clock: IClock;
  /** Access-control policy: tenant authorization, plan ref validation, rate limiting. */
  policy: IRunAccessPolicy;
  /** Pre-dispatch intent log for crash-consistency of startRun. */
  intentStore: IStartRunIntentStore;
  adapters: Map<EngineRunRef['provider'], IProviderAdapter>;

  /** Optional providers that MUST be registered at boot time. */
  requiredProviders?: EngineRunRef['provider'][];

  /** Structured observability port used for logs, metrics and traces. */
  observability: IObservability;

  /** Optional operation timeouts for external calls. */
  timeouts?: {
    adapterCallMs?: number;
    outboxEnqueueMs?: number;
  };

  /** Optional throttle window for stderr fallback diagnostics (milliseconds). */
  observabilityFallbackThrottleMs?: number;
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

interface StartRunErrorContext {
  intentId?: string;
}

class MutableStartRunErrorContext implements StartRunErrorContext {
  intentId?: string;
}

class PostStartIntentPersistenceError extends Error {
  constructor(
    readonly intentId: string,
    readonly runRef: EngineRunRef,
    readonly originalError: unknown
  ) {
    const cause = originalError instanceof Error ? originalError : new Error(String(originalError));
    super(`Intent persistence failed after adapter.startRun succeeded: ${cause.message}`, {
      cause,
    });
    this.name = 'PostStartIntentPersistenceError';
  }
}

export class WorkflowEngine implements IWorkflowEngine {
  private readonly observability: IObservability;
  private readonly stderrFallbackThrottleMs: number;
  private lastStderrFallbackAtMs = 0;

  constructor(private readonly deps: WorkflowEngineDeps) {
    this.validateDependencies();
    this.observability = deps.observability;
    this.stderrFallbackThrottleMs =
      typeof deps.observabilityFallbackThrottleMs === 'number' &&
      Number.isFinite(deps.observabilityFallbackThrottleMs) &&
      deps.observabilityFallbackThrottleMs > 0
        ? deps.observabilityFallbackThrottleMs
        : 30_000;
  }

  async startRun(planRef: PlanRef, context: RunContext): Promise<EngineRunRef> {
    const validatedPlanRef = normalizePlanRef(parsePlanRef(planRef));
    const validatedContext = normalizeRunContext(parseRunContext(context));
    const resolvedContext = resolveInitialRunContext(validatedContext);
    const startMs = Date.parse(this.deps.clock.nowIsoUtc());
    const metricTags = buildMetricTags(resolvedContext.targetAdapter, resolvedContext.tenantId, {
      operation: 'startRun',
    });
    const traceContext = buildTraceContext(resolvedContext, validatedPlanRef.planId);
    const errorContext = new MutableStartRunErrorContext();

    return this.observability.withContext(traceContext, () =>
      this.observability.traces.withSpan(
        'engine.startRun',
        {
          context: traceContext,
          attributes: {
            provider: resolvedContext.targetAdapter,
            planUri: validatedPlanRef.uri,
          },
        },
        async (span) => {
          this.observability.logs.info({
            msg: 'Starting run',
            context: traceContext,
            attributes: {
              provider: resolvedContext.targetAdapter,
              planUri: validatedPlanRef.uri,
            },
          });
          try {
            return await this._startRunCore({
              validatedPlanRef,
              resolvedContext,
              startMs,
              metricTags,
              traceContext,
              span,
              errorContext,
            });
          } catch (error) {
            span.recordException(error);
            span.setStatus('error', toErrorMessage(error));
            return this.handleStartRunError(
              error,
              resolvedContext,
              metricTags,
              traceContext,
              errorContext
            );
          }
        }
      )
    );
  }

  private async _startRunCore({
    validatedPlanRef,
    resolvedContext,
    startMs,
    metricTags,
    traceContext,
    span,
    errorContext,
  }: {
    validatedPlanRef: PlanRef;
    resolvedContext: ResolvedRunContext;
    startMs: number;
    metricTags: Record<string, string>;
    traceContext: ReturnType<typeof buildTraceContext>;
    span: ISpan;
    errorContext: StartRunErrorContext;
  }): Promise<EngineRunRef> {
    await this.validateStartRunPreconditions(validatedPlanRef, resolvedContext);
    this.checkOutboxRateLimit(resolvedContext);

    const provider = resolvedContext.targetAdapter;
    const adapter = this.getAdapterOrThrow(provider);
    this.validateCapabilitiesOrThrow(validatedPlanRef, adapter);

    const intentId = await this._createStartRunIntent(resolvedContext, provider);
    errorContext.intentId = intentId;

    let runRef: EngineRunRef;
    if (adapter.estimateRunRef) {
      // Pre-bootstrap path: eliminates dual-producer ordering race.
      // Commits run_metadata + RunQueued BEFORE adapter.startRun() so the workflow
      // worker sees run_metadata already committed when its first activity runs.
      // No activity can write to an uncommitted stream.
      const estimatedRef = adapter.estimateRunRef(resolvedContext);
      const bootMeta: RunMetadata = buildRunMetadata(
        resolvedContext,
        validatedPlanRef,
        estimatedRef,
        this.deps.clock.nowIsoUtc()
      );
      await this.deps.stateStoreWrite.bootstrapRunTx({
        metadata: bootMeta,
        firstEvents: [this.buildRunEvent(bootMeta, 'RunQueued')],
      });
      // bootstrapRunTx failure propagates; startRun never called; intent stays PENDING for reconciler.
      runRef = await this.withTimeout(
        adapter.startRun(validatedPlanRef, resolvedContext),
        this.deps.timeouts?.adapterCallMs ?? 30_000,
        'adapter.startRun'
      );
      if (
        this.deps.stateStoreWrite.saveProviderRef &&
        (runRef.runId !== estimatedRef.runId || runRef.workflowId !== estimatedRef.workflowId)
      ) {
        await this.deps.stateStoreWrite
          .saveProviderRef(
            resolvedContext.tenantId,
            resolvedContext.runId,
            buildProviderRefUpdate(runRef)
          )
          .catch((refErr: unknown) => {
            this.observability.logs.warn({
              msg: 'saveProviderRef failed after startRun; metadata retains estimated providerRunId',
              context: traceContext,
              attributes: {
                error: toErrorMessage(refErr),
                provider: runRef.provider,
                runId: resolvedContext.runId,
              },
            });
          });
      }
      // startRun failure propagates to handleStartRunError. With a pending intent,
      // the error path skips RunFailed emission and leaves reconciliation to the
      // maintenance worker, which probes lookupRunRef and marks the intent resolved
      // if no workflow exists.
      try {
        await this.deps.intentStore.markDispatched(intentId, runRef);
      } catch (markDispatchedError) {
        throw new PostStartIntentPersistenceError(intentId, runRef, markDispatchedError);
      }
      await this.markIntentResolvedBestEffort({
        intentId,
        tenantId: resolvedContext.tenantId,
        runId: resolvedContext.runId,
        provider,
        traceContext,
      });
    } else {
      // Legacy path for adapters without estimateRunRef: startRun first, then bootstrap.
      runRef = await this.withTimeout(
        adapter.startRun(validatedPlanRef, resolvedContext),
        this.deps.timeouts?.adapterCallMs ?? 30_000,
        'adapter.startRun'
      );
      await this.deps.intentStore.markDispatched(intentId, runRef);

      const bootMeta: RunMetadata = buildRunMetadata(
        resolvedContext,
        validatedPlanRef,
        runRef,
        this.deps.clock.nowIsoUtc()
      );
      await this._bootstrapRunTxWithCompensation({
        bootMeta,
        adapter,
        runRef,
        intentId,
        traceContext,
      });
    }

    this.observability.metrics.counter('dvt.run.started_total', metricTags).add(1);
    this.observability.metrics
      .histogram('dvt.run.start.duration_ms', metricTags)
      .record(Date.parse(this.deps.clock.nowIsoUtc()) - startMs);
    span.setStatus('ok');
    return runRef;
  }

  private async _createStartRunIntent(
    resolvedContext: ResolvedRunContext,
    provider: EngineRunRef['provider']
  ): Promise<string> {
    const intentId = this.deps.idempotency.startRunIntentId(
      resolvedContext.tenantId,
      resolvedContext.runId,
      resolvedContext.logicalAttemptId,
      provider
    );
    await this.deps.intentStore.createIntent({
      intentId,
      tenantId: resolvedContext.tenantId,
      runId: resolvedContext.runId,
      provider,
      createdAt: this.deps.clock.nowIsoUtc(),
    });
    return intentId;
  }

  private async _bootstrapRunTxWithCompensation({
    bootMeta,
    adapter,
    runRef,
    intentId,
    traceContext,
  }: {
    bootMeta: RunMetadata;
    adapter: IProviderAdapter;
    runRef: EngineRunRef;
    intentId: string;
    traceContext: ReturnType<typeof buildTraceContext>;
  }): Promise<void> {
    try {
      await this.deps.stateStoreWrite.bootstrapRunTx({
        metadata: bootMeta,
        firstEvents: [this.buildRunEvent(bootMeta, 'RunQueued')],
      });
      await this.markIntentResolvedBestEffort({
        intentId,
        tenantId: bootMeta.tenantId,
        runId: bootMeta.runId,
        provider: bootMeta.provider,
        traceContext,
      });
    } catch (bootstrapError) {
      await adapter.cancelRun(runRef).catch((cancelErr: unknown) => {
        this.observability.logs.error({
          msg: 'Compensation cancelRun failed after bootstrap error',
          context: traceContext,
          err: cancelErr,
          attributes: {
            error: toErrorMessage(cancelErr),
          },
        });
      });
      await this.markIntentResolvedBestEffort({
        intentId,
        tenantId: bootMeta.tenantId,
        runId: bootMeta.runId,
        provider: bootMeta.provider,
        traceContext,
      });
      throw bootstrapError;
    }
  }

  private async markIntentResolvedBestEffort(input: {
    intentId: string;
    tenantId: string;
    runId: string;
    provider: EngineRunRef['provider'];
    traceContext: ReturnType<typeof buildTraceContext>;
  }): Promise<void> {
    try {
      await this.deps.intentStore.markResolved(input.intentId);
      return;
    } catch (error) {
      try {
        this.observability.metrics
          .counter('dvt.intent.mark_resolved_failed_total', {
            tenantId: input.tenantId,
            provider: input.provider,
            operation: 'markResolved',
          })
          .add(1);
      } catch {
        // Best-effort: metrics reporting must not turn cleanup failure into a hard failure.
      }

      try {
        this.observability.logs.warn({
          msg: 'markResolved failed; leaving intent cleanup to reconciliation worker',
          context: input.traceContext,
          attributes: {
            intentId: input.intentId,
            tenantId: input.tenantId,
            runId: input.runId,
            provider: input.provider,
            error: toErrorMessage(error),
          },
        });
      } catch {
        try {
          const nowMs = Date.parse(this.deps.clock.nowIsoUtc());
          if (
            this.lastStderrFallbackAtMs === 0 ||
            nowMs - this.lastStderrFallbackAtMs >= this.stderrFallbackThrottleMs
          ) {
            this.lastStderrFallbackAtMs = nowMs;
            process.stderr.write(
              `[dvt][WorkflowEngine] markResolved observability reporting failed; intentId=${input.intentId} runId=${input.runId} tenantId=${input.tenantId}\n`
            );
          }
        } catch {
          // Keep this path non-fatal even if stderr is unavailable.
        }
      }
    }
  }

  private async validateStartRunPreconditions(
    planRef: PlanRef,
    context: RunContext
  ): Promise<void> {
    this.deps.policy.validatePlanRef(planRef);
    validateSchemaVersionOrThrow(planRef.schemaVersion);
    assertSupportedPlanVersion(planRef.planVersion);
    await this.deps.policy.assertTenantAccess(context.tenantId);
    validateRunIdOrThrow(context.runId);
    await this.ensureRunDoesNotExist(context.tenantId, context.runId);
  }

  private validateCapabilitiesOrThrow(planRef: PlanRef, adapter: IProviderAdapter): void {
    const required = planRef.requiresCapabilities ?? [];
    if (required.length === 0) return;

    const adapterCaps = adapter.capabilities?.();
    if (adapterCaps === undefined) return; // adapter omits capabilities() — skip validation

    const supported = new Set(adapterCaps);
    const unsupported = required.filter((c) => !supported.has(c));
    if (unsupported.length > 0) {
      throw new CapabilitiesNotSupportedError({
        capabilities: unsupported,
        provider: adapter.provider,
      });
    }
  }

  private checkOutboxRateLimit(context: RunContext): void {
    this.deps.policy.checkRateLimit(context.tenantId);
  }

  private async handleStartRunError(
    error: unknown,
    resolvedContext: ResolvedRunContext,
    metricTags: Record<string, string>,
    traceContext: ReturnType<typeof buildTraceContext>,
    errorContext: StartRunErrorContext
  ): Promise<never> {
    this.observability.metrics.counter('dvt.run.start_failed_total', metricTags).add(1);
    this.observability.logs.error({
      msg: 'startRun failed',
      context: traceContext,
      err: error instanceof Error ? error.message : String(error),
      attributes: {
        provider: resolvedContext.targetAdapter,
        error: toErrorMessage(error),
      },
    });

    if (error instanceof PostStartIntentPersistenceError) {
      this.observability.logs.warn({
        msg: 'Provider workflow started but intent persistence failed; leaving reconciliation to maintenance worker',
        context: traceContext,
        attributes: {
          intentId: error.intentId,
          runId: error.runRef.runId,
          provider: error.runRef.provider,
          error: toErrorMessage(error.originalError),
        },
      });
      throw error;
    }

    const failMeta = await this.deps.stateStoreRead
      .getRunMetadataByRunId(resolvedContext.tenantId, resolvedContext.runId)
      .catch(() => null);
    if (failMeta) {
      const pendingIntent = errorContext.intentId
        ? await this.deps.intentStore.getIntent(errorContext.intentId).catch(() => null)
        : null;
      if (pendingIntent?.status === 'PENDING') {
        this.observability.logs.warn({
          msg: 'Skipping RunFailed emission after startRun error because intent remains pending',
          context: traceContext,
          attributes: {
            intentId: pendingIntent.intentId,
            runId: pendingIntent.runId,
            provider: pendingIntent.provider,
          },
        });
        throw error;
      }

      await this.emitRunEvent(failMeta, 'RunFailed', { reason: 'START_RUN_FAILURE' }).catch(
        (emitErr: unknown) => {
          this.observability.logs.error({
            msg: 'RunFailed emission failed after startRun error',
            context: traceContext,
            err: emitErr instanceof Error ? emitErr.message : String(emitErr),
            attributes: {
              error: toErrorMessage(emitErr),
            },
          });
        }
      );
    }
    throw error;
  }

  async cancelRun(engineRunRef: EngineRunRef): Promise<void> {
    const validatedRunRef = normalizeEngineRunRef(parseEngineRunRef(engineRunRef));
    await this.deps.policy.assertTenantAccess(validatedRunRef.tenantId);
    const meta = await this.resolveMetaOrThrow(validatedRunRef);

    const adapter = this.getAdapterOrThrow(meta.provider);
    const startMs = Date.parse(this.deps.clock.nowIsoUtc());
    const metricTags = buildMetricTags(meta.provider, meta.tenantId, { operation: 'cancelRun' });
    const traceContext = buildTraceContext(meta, meta.planId);

    await this.observability.withContext(traceContext, () =>
      this.observability.traces.withSpan(
        'engine.cancelRun',
        {
          context: traceContext,
          attributes: { provider: meta.provider },
        },
        async (span) => {
          try {
            this.observability.logs.info({
              msg: 'Cancelling run',
              context: traceContext,
              attributes: { provider: meta.provider },
            });

            await this.withTimeout(
              adapter.cancelRun(validatedRunRef),
              this.deps.timeouts?.adapterCallMs ?? 30_000,
              'adapter.cancelRun'
            );
            // ADR-0007: Engine emits RunCancelRequested (intent). Adapter emits RunCancelled from workflow context.
            await this.emitRunEvent(meta, 'RunCancelRequested');
            this.observability.metrics.counter('dvt.run.cancel_requested_total', metricTags).add(1);
            this.observability.metrics
              .histogram('dvt.run.cancel.duration_ms', metricTags)
              .record(Date.parse(this.deps.clock.nowIsoUtc()) - startMs);
            span.setStatus('ok');
          } catch (error) {
            span.recordException(error);
            span.setStatus('error', toErrorMessage(error));
            throw error;
          }
        }
      )
    );
  }

  async getRunStatus(engineRunRef: EngineRunRef): Promise<RunStatusSnapshot> {
    const validatedRunRef = normalizeEngineRunRef(parseEngineRunRef(engineRunRef));
    await this.deps.policy.assertTenantAccess(validatedRunRef.tenantId);
    const meta = await this.resolveMetaOrThrow(validatedRunRef);
    const startMs = Date.parse(this.deps.clock.nowIsoUtc());
    const metricTags = buildMetricTags(meta.provider, meta.tenantId, { operation: 'getRunStatus' });
    const traceContext = buildTraceContext(meta, meta.planId);

    return this.observability.withContext(traceContext, () =>
      this.observability.traces.withSpan(
        'engine.getRunStatus',
        {
          context: traceContext,
          attributes: { provider: meta.provider },
        },
        async (span) => {
          try {
            // ADR-0015: default read path MUST NOT call the provider.
            // Latency must be independent of adapter availability.
            // Snapshot-first (O(1)). Falls back to full replay only when no snapshot exists
            // — e.g. runs predating snapshot support.
            const storedSnap = await this.deps.stateStoreRead.getSnapshot(
              meta.tenantId,
              meta.runId
            );
            const result = storedSnap
              ? snapshotToStatus(storedSnap)
              : this.deps.projector.rebuild(
                  meta.runId,
                  await this.deps.stateStoreRead.listEvents(meta.tenantId, meta.runId)
                );

            this.observability.metrics
              .histogram('dvt.run.status.duration_ms', metricTags)
              .record(Date.parse(this.deps.clock.nowIsoUtc()) - startMs);
            span.setStatus('ok');
            return result;
          } catch (error) {
            span.recordException(error);
            span.setStatus('error', toErrorMessage(error));
            throw error;
          }
        }
      )
    );
  }

  /**
   * ADR-0015: Provider-enriched status. Calls the adapter for real-time substatus/message.
   *
   * Use for UI polling or diagnostic endpoints where provider latency is acceptable.
   * MUST NOT be used on the default status read path.
   * Circuit breaking is the caller's responsibility at the infrastructure layer.
   */
  async enrichRunStatus(engineRunRef: EngineRunRef): Promise<RunStatusSnapshot> {
    const validatedRunRef = normalizeEngineRunRef(parseEngineRunRef(engineRunRef));
    await this.deps.policy.assertTenantAccess(validatedRunRef.tenantId);
    const meta = await this.resolveMetaOrThrow(validatedRunRef);

    const adapter = this.getAdapterOrThrow(meta.provider);
    const traceContext = buildTraceContext(meta, meta.planId);

    return this.observability.withContext(traceContext, () =>
      this.observability.traces.withSpan(
        'engine.enrichRunStatus',
        {
          context: traceContext,
          attributes: { provider: meta.provider },
        },
        async (span) => {
          try {
            const storedSnap = await this.deps.stateStoreRead.getSnapshot(
              meta.tenantId,
              meta.runId
            );
            const base = storedSnap
              ? snapshotToStatus(storedSnap)
              : this.deps.projector.rebuild(
                  meta.runId,
                  await this.deps.stateStoreRead.listEvents(meta.tenantId, meta.runId)
                );

            const providerView = await this.withTimeout(
              adapter.getRunStatus(validatedRunRef),
              this.deps.timeouts?.adapterCallMs ?? 30_000,
              'adapter.getRunStatus'
            );
            const substatus = providerView.substatus ?? base.substatus;
            const message = providerView.message ?? base.message;
            span.setStatus('ok');
            const result = {
              ...base,
            };
            if (substatus !== undefined) {
              result.substatus = substatus;
            }
            if (message !== undefined) {
              result.message = message;
            }
            return result;
          } catch (error) {
            span.recordException(error);
            span.setStatus('error', toErrorMessage(error));
            throw error;
          }
        }
      )
    );
  }

  async signal(engineRunRef: EngineRunRef, request: SignalRequest): Promise<void> {
    const validatedRunRef = normalizeEngineRunRef(parseEngineRunRef(engineRunRef));
    const validatedRequest = normalizeSignalRequest(parseSignalRequest(request));
    await this.deps.policy.assertTenantAccess(validatedRunRef.tenantId);

    const meta = await this.resolveMetaOrThrow(validatedRunRef);
    const adapter = this.getAdapterOrThrow(meta.provider);
    const traceContext = buildTraceContext(meta, meta.planId);

    await this.observability.withContext(traceContext, () =>
      this.observability.traces.withSpan(
        'engine.signal',
        {
          context: traceContext,
          attributes: {
            provider: meta.provider,
            signalType: validatedRequest.type,
          },
        },
        async (span) => {
          try {
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
            span.setStatus('ok');
          } catch (error) {
            span.recordException(error);
            span.setStatus('error', toErrorMessage(error));
            throw error;
          }
        }
      )
    );
  }

  async healthCheck(): Promise<HealthStatus> {
    const checks: Array<{ name: string; target: HealthCheckable }> = [
      { name: 'stateStoreRead', target: this.deps.stateStoreRead as HealthCheckable },
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
    if (adapter === undefined) throw new AdapterNotRegisteredError(provider);
    return adapter;
  }

  private mapSignalToRunEventType(type: SignalRequest['type']): EventType | null {
    if (type === 'RETRY_STEP' || type === 'RETRY_RUN') {
      // Phase 2: planner-driven deterministic retry semantics.
      throw new SignalNotImplementedError(type);
    }

    // ADR-0007: CANCEL signal maps to RunCancelRequested (intent). Adapter emits RunCancelled.
    const byType: Record<string, EventType> = {
      PAUSE: 'RunPaused',
      RESUME: 'RunResumed',
      CANCEL: 'RunCancelRequested',
    };
    return byType[type] ?? null;
  }

  private async resolveMetaOrThrow(runRef: EngineRunRef): Promise<RunMetadata> {
    const m = await this.deps.stateStoreRead.getRunMetadataByRunId(runRef.tenantId, runRef.runId);
    if (!m) {
      throw new RunMetadataNotFoundError(runRef.runId);
    }
    return m;
  }

  private async emitRunEvent(
    meta: RunMetadata,
    eventType: EventType,
    payload?: Record<string, unknown>
  ): Promise<void> {
    await this.deps.stateStoreWrite.appendAndEnqueueTx(meta.runId, [
      this.buildRunEvent(meta, eventType, payload),
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
      payloadVersion: 1,
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

    await this.deps.stateStoreWrite.appendAndEnqueueTx(meta.runId, [input]);
  }

  private buildRunEvent(
    meta: RunMetadata,
    eventType: EventType,
    payload?: Record<string, unknown>
  ): RunEventInput {
    return {
      eventId: this.deps.idempotency.eventId(),
      eventType,
      payloadVersion: 1,
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
      ...(payload ? { payload } : {}),
    };
  }

  private async ensureRunDoesNotExist(tenantId: string, runId: string): Promise<void> {
    const existing = await this.deps.stateStoreRead.getRunMetadataByRunId(tenantId, runId);
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
      ['stateStoreRead', this.deps.stateStoreRead],
      ['stateStoreWrite', this.deps.stateStoreWrite],
      ['projector', this.deps.projector],
      ['idempotency', this.deps.idempotency],
      ['clock', this.deps.clock],
      ['policy', this.deps.policy],
      ['intentStore', this.deps.intentStore],
      ['adapters', this.deps.adapters],
      ['observability', this.deps.observability],
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
      if (this.deps.adapters.has(provider) === false) {
        throw new AdapterNotRegisteredError(provider);
      }
    }
  }
}

function buildMetricTags(
  provider: EngineRunRef['provider'],
  tenantId: string,
  extras?: Record<string, string>
): Record<string, string> {
  return extras ? { provider, tenantId, ...extras } : { provider, tenantId };
}

function buildTraceContext(
  input: Pick<RunContext, 'tenantId' | 'projectId' | 'environmentId' | 'runId'> & {
    targetAdapter?: EngineRunRef['provider'];
    provider?: EngineRunRef['provider'];
  },
  planId?: string
): {
  tenantId: string;
  projectId: string;
  environmentId: string;
  runId: string;
  planId?: string;
  adapter?: 'temporal' | 'conductor' | 'local';
} {
  const raw = input.targetAdapter ?? input.provider;
  const adapter: 'temporal' | 'conductor' | undefined =
    raw === 'temporal' || raw === 'conductor' ? raw : undefined;
  return {
    tenantId: input.tenantId,
    projectId: input.projectId,
    environmentId: input.environmentId,
    runId: input.runId,
    ...(planId ? { planId } : {}),
    ...(adapter ? { adapter } : {}),
  };
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
function buildRunMetadata(
  ctx: ResolvedRunContext,
  planRef: PlanRef,
  runRef: EngineRunRef,
  createdAt: string
): RunMetadata {
  return {
    tenantId: ctx.tenantId,
    projectId: ctx.projectId,
    environmentId: ctx.environmentId,
    runId: ctx.runId,
    planId: planRef.planId,
    planVersion: planRef.planVersion,
    logicalAttemptId: ctx.logicalAttemptId,
    ...(ctx.parentRunId !== undefined ? { parentRunId: ctx.parentRunId } : {}),
    ...(ctx.originRunId !== undefined ? { originRunId: ctx.originRunId } : {}),
    provider: ctx.targetAdapter,
    providerWorkflowId: runRef.workflowId,
    providerRunId: runRef.runId,
    ...(runRef.provider === 'temporal' ? { providerNamespace: runRef.namespace } : {}),
    ...(runRef.provider === 'temporal' && runRef.taskQueue
      ? { providerTaskQueue: runRef.taskQueue }
      : {}),
    ...(runRef.provider === 'conductor' ? { providerConductorUrl: runRef.conductorUrl } : {}),
    createdAt,
  };
}

function buildProviderRefUpdate(runRef: EngineRunRef): {
  providerWorkflowId: string;
  providerRunId: string;
  providerNamespace?: string;
  providerTaskQueue?: string;
  providerConductorUrl?: string;
} {
  const update: {
    providerWorkflowId: string;
    providerRunId: string;
    providerNamespace?: string;
    providerTaskQueue?: string;
    providerConductorUrl?: string;
  } = {
    providerWorkflowId: runRef.workflowId,
    providerRunId: runRef.runId,
  };
  if (runRef.provider === 'temporal') {
    update.providerNamespace = runRef.namespace;
    if (runRef.taskQueue) {
      update.providerTaskQueue = runRef.taskQueue;
    }
  }
  if (runRef.provider === 'conductor') {
    update.providerConductorUrl = runRef.conductorUrl;
  }
  return update;
}

function normalizePlanRef(input: ReturnType<typeof parsePlanRef>): PlanRef {
  const planRef: PlanRef = {
    uri: input.uri,
    sha256: input.sha256,
    schemaVersion: input.schemaVersion,
    planId: input.planId,
    planVersion: input.planVersion,
  };
  if (input.sizeBytes !== undefined) planRef.sizeBytes = input.sizeBytes;
  if (input.expiresAt !== undefined) planRef.expiresAt = input.expiresAt;
  if (input.requiresCapabilities !== undefined) {
    planRef.requiresCapabilities = input.requiresCapabilities;
  }
  return planRef;
}

function normalizeEngineRunRef(input: ReturnType<typeof parseEngineRunRef>): EngineRunRef {
  if (input.provider === 'temporal') {
    const runRef: EngineRunRef = {
      provider: 'temporal',
      tenantId: input.tenantId,
      namespace: input.namespace,
      workflowId: input.workflowId,
      runId: input.runId,
    };
    if (input.taskQueue !== undefined) runRef.taskQueue = input.taskQueue;
    return runRef;
  }

  if (input.provider === 'conductor') {
    return {
      provider: 'conductor',
      tenantId: input.tenantId,
      workflowId: input.workflowId,
      runId: input.runId,
      conductorUrl: input.conductorUrl,
    };
  }

  return {
    provider: 'mock',
    tenantId: input.tenantId,
    workflowId: input.workflowId,
    runId: input.runId,
  };
}

function normalizeSignalRequest(input: ReturnType<typeof parseSignalRequest>): SignalRequest {
  const request: SignalRequest = {
    signalId: input.signalId,
    type: input.type,
  };
  if (input.stepId !== undefined) request.stepId = input.stepId;
  if (input.reason !== undefined) request.reason = input.reason;
  if (input.requestedAt !== undefined) request.requestedAt = input.requestedAt;
  return request;
}

function normalizeRunContext(input: ReturnType<typeof parseRunContext>): RunContext {
  return {
    tenantId: input.tenantId,
    projectId: input.projectId,
    environmentId: input.environmentId,
    runId: input.runId,
    targetAdapter: input.targetAdapter,
  };
}

function resolveInitialRunContext(ctx: RunContext): ResolvedRunContext {
  return {
    ...ctx,
    logicalAttemptId: 1,
    originRunId: ctx.runId,
  };
}
