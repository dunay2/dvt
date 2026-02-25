'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.WorkflowEngine = void 0;
const contracts_1 = require('@dvt/contracts');
const errors_js_1 = require('../contracts/errors.js');
const SnapshotProjector_js_1 = require('./SnapshotProjector.js');
const NOOP_LOGGER = {
  info: () => {},
  warn: () => {},
  error: () => {},
};
const NOOP_METRICS = {
  increment: () => {},
  timing: () => {},
};
class WorkflowEngine {
  constructor(deps) {
    this.deps = deps;
    this.validateDependencies();
    this.logger = deps.logger ?? NOOP_LOGGER;
    this.metrics = deps.metrics ?? NOOP_METRICS;
  }
  async startRun(planRef, context) {
    const validatedPlanRef = (0, contracts_1.parsePlanRef)(planRef);
    const validatedContext = (0, contracts_1.parseRunContext)(context);
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
      const bootMeta = buildRunMetadata(
        validatedContext,
        validatedPlanRef,
        runRef,
        this.deps.clock.nowIsoUtc()
      );
      try {
        await this.deps.stateStore.bootstrapRunTx({
          metadata: bootMeta,
          firstEvents: [this.buildRunEvent(bootMeta, 'RunQueued')],
        });
      } catch (bootstrapError) {
        // Compensate: cancel the adapter run to avoid an orphaned workflow.
        await adapter.cancelRun(runRef).catch((cancelErr) => {
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
  async validateStartRunPreconditions(planRef, context) {
    this.deps.planRefPolicy.validateOrThrow(planRef.uri);
    validateSchemaVersionOrThrow(planRef.schemaVersion);
    await this.deps.authorizer.assertTenantAccess(context.tenantId);
    validateRunIdOrThrow(context.runId);
    await this.ensureRunDoesNotExist(context.runId);
  }
  validateCapabilitiesOrThrow(planRef, adapter) {
    const required = planRef.requiresCapabilities ?? [];
    if (required.length === 0) return;
    const adapterCaps = adapter.capabilities?.();
    if (adapterCaps === undefined) return; // adapter omits capabilities() — skip validation
    const supported = new Set(adapterCaps);
    const unsupported = required.filter((c) => !supported.has(c));
    if (unsupported.length > 0) {
      throw new errors_js_1.CapabilitiesNotSupportedError(unsupported, adapter.provider);
    }
  }
  checkOutboxRateLimit(context) {
    if (
      this.deps.outboxRateLimiter &&
      !this.deps.outboxRateLimiter.tryAcquire(context.tenantId, 1)
    ) {
      throw new errors_js_1.OutboxRateLimitExceededError(context.tenantId);
    }
  }
  async handleStartRunError(error, validatedContext, metricTags) {
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
      await this.emitRunEvent(failMeta, 'RunFailed').catch((emitErr) => {
        this.logger.error('RunFailed emission failed after startRun error', {
          runId: validatedContext.runId,
          error: toErrorMessage(emitErr),
        });
      });
    }
    throw error;
  }
  async cancelRun(engineRunRef) {
    const validatedRunRef = (0, contracts_1.parseEngineRunRef)(engineRunRef);
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
  async getRunStatus(engineRunRef) {
    const validatedRunRef = (0, contracts_1.parseEngineRunRef)(engineRunRef);
    const meta = await this.resolveMetaOrThrow(validatedRunRef);
    await this.deps.authorizer.assertTenantAccess(meta.tenantId);
    const startMs = Date.parse(this.deps.clock.nowIsoUtc());
    // ADR-0015: default read path MUST NOT call the provider.
    // Latency must be independent of adapter availability.
    // Snapshot-first (O(1)). Falls back to full replay only when no snapshot exists
    // — e.g. runs predating snapshot support.
    const storedSnap = await this.deps.stateStore.getSnapshot(meta.runId);
    const result = storedSnap
      ? (0, SnapshotProjector_js_1.snapshotToStatus)(storedSnap)
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
  async enrichRunStatus(engineRunRef) {
    const validatedRunRef = (0, contracts_1.parseEngineRunRef)(engineRunRef);
    const meta = await this.resolveMetaOrThrow(validatedRunRef);
    await this.deps.authorizer.assertTenantAccess(meta.tenantId);
    const adapter = this.getAdapterOrThrow(meta.provider);
    const storedSnap = await this.deps.stateStore.getSnapshot(meta.runId);
    const base = storedSnap
      ? (0, SnapshotProjector_js_1.snapshotToStatus)(storedSnap)
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
  async signal(engineRunRef, request) {
    const validatedRunRef = (0, contracts_1.parseEngineRunRef)(engineRunRef);
    const validatedRequest = (0, contracts_1.parseSignalRequest)(request);
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
  async healthCheck() {
    const checks = [
      { name: 'stateStore', target: this.deps.stateStore },
      { name: 'outbox', target: this.deps.outbox },
      ...Array.from(this.deps.adapters.values()).map((adapter) => ({
        name: `adapter-${adapter.provider}`,
        target: adapter,
      })),
    ];
    const components = await Promise.all(
      checks.map(async ({ name, target }) => {
        if (!target.ping) {
          return { name, status: 'up' };
        }
        try {
          await target.ping();
          return { name, status: 'up' };
        } catch (error) {
          return {
            name,
            status: 'down',
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
  getAdapterOrThrow(provider) {
    const adapter = this.deps.adapters.get(provider);
    if (!adapter) throw new errors_js_1.AdapterNotRegisteredError(provider);
    return adapter;
  }
  mapSignalToRunEventType(type) {
    if (type === 'RETRY_STEP' || type === 'RETRY_RUN') {
      // Phase 2: planner-driven deterministic retry semantics.
      throw new errors_js_1.SignalNotImplementedError(type);
    }
    // ADR-0007: CANCEL signal maps to RunCancelRequested (intent). Adapter emits RunCancelled.
    const byType = {
      PAUSE: 'RunPaused',
      RESUME: 'RunResumed',
      CANCEL: 'RunCancelRequested',
    };
    return byType[type] ?? null;
  }
  async resolveMetaOrThrow(runRef) {
    const m = await this.deps.stateStore.getRunMetadataByRunId(runRef.runId);
    if (!m) {
      throw new errors_js_1.RunMetadataNotFoundError(runRef.runId);
    }
    return m;
  }
  async emitRunEvent(meta, eventType) {
    await this.deps.stateStore.appendAndEnqueueTx(meta.runId, [
      this.buildRunEvent(meta, eventType),
    ]);
  }
  async emitSignalDerivedRunEvent(meta, req, eventType) {
    const input = {
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
  buildRunEvent(meta, eventType, payload) {
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
      ...(payload !== undefined ? { payload } : {}),
    };
  }
  /**
   * Scans for runs stuck in PENDING longer than `options.thresholdMs` and emits
   * `RunFailed` (payload.reason = 'QUEUED_TIMEOUT') for each.
   *
   * Intended to be called from a scheduled job (e.g., every 30 s).
   * The caller is responsible for circuit-breaking and back-pressure.
   *
   * @returns runIds that were transitioned to FAILED.
   */
  async detectStuckRuns(options) {
    const { thresholdMs, tenantId, limit } = options;
    const nowMs = Date.parse(this.deps.clock.nowIsoUtc());
    const candidates = await this.deps.stateStore.listRuns({
      ...(tenantId !== undefined && { tenantId }),
      status: 'PENDING',
      limit: limit ?? 100,
    });
    const stuckRunIds = [];
    for (const meta of candidates) {
      if (!meta.createdAt) continue; // skip runs without timestamp (backward compat)
      if (nowMs - Date.parse(meta.createdAt) < thresholdMs) continue;
      await this.deps.stateStore.appendAndEnqueueTx(meta.runId, [
        this.buildRunEvent(meta, 'RunFailed', { reason: 'QUEUED_TIMEOUT' }),
      ]);
      this.metrics.increment('dvt.run.queued_timeout', {
        provider: meta.provider,
        tenantId: meta.tenantId,
      });
      stuckRunIds.push(meta.runId);
    }
    return stuckRunIds;
  }
  async ensureRunDoesNotExist(runId) {
    const existing = await this.deps.stateStore.getRunMetadataByRunId(runId);
    if (existing) throw new errors_js_1.RunAlreadyExistsError(runId);
  }
  async withTimeout(promise, timeoutMs, operation) {
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
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
  validateDependencies() {
    const requiredDeps = [
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
  assertRequiredProvidersRegistered(requiredProviders) {
    for (const provider of requiredProviders) {
      if (!this.deps.adapters.has(provider))
        throw new errors_js_1.AdapterNotRegisteredError(provider);
    }
  }
}
exports.WorkflowEngine = WorkflowEngine;
function validateSchemaVersionOrThrow(schemaVersion) {
  // Contract: engine rejects unknown schema versions; supports <=3 minor versions back.
  // MVP: accept v1.x only.
  if (!schemaVersion.startsWith('v1.'))
    throw new errors_js_1.InvalidSchemaVersionError(schemaVersion);
}
function validateRunIdOrThrow(runId) {
  // Defensive format guard: letters/digits + [._:-], no spaces.
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(runId))
    throw new errors_js_1.InvalidRunIdError(runId);
}
function toErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
// ADR-0013: runRef is passed in so provider refs are included in the atomic bootstrapRunTx.
function buildRunMetadata(ctx, planRef, runRef, createdAt) {
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
    createdAt,
  };
}
//# sourceMappingURL=WorkflowEngine.js.map
