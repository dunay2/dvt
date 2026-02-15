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
import type { IWorkflowEngine } from '../contracts/IWorkflowEngine.v1_1_1.js';
import type { EventEnvelope, RunMetadata } from '../contracts/runEvents.js';
import type { IOutboxStorage } from '../outbox/types.js';
import type { IAuthorizer } from '../security/authorizer.js';
import type { IPlanFetcher } from '../security/planIntegrity.js';
import { PlanIntegrityValidator } from '../security/planIntegrity.js';
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

  // PlanRef MUST be validated before any execution.
  planIntegrity: PlanIntegrityValidator;
  planFetcher: IPlanFetcher;

  adapters: Map<EngineRunRef['provider'], IProviderAdapter>;

  /** Optional providers that MUST be registered at boot time. */
  requiredProviders?: EngineRunRef['provider'][];

  /** Optional structured logger for observability. */
  logger?: WorkflowEngineLogger;

  /** Optional operation timeouts for external calls. */
  timeouts?: {
    adapterCallMs?: number;
    outboxEnqueueMs?: number;
  };

  /** Optional circuit breaker settings for adapter calls. */
  circuitBreaker?: {
    failureThreshold?: number;
    resetTimeoutMs?: number;
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

interface CircuitState {
  failures: number;
  openedUntilEpochMs: number;
}

const NOOP_LOGGER: WorkflowEngineLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
};

export class WorkflowEngine implements IWorkflowEngine {
  private readonly logger: WorkflowEngineLogger;
  private readonly circuitStateByProvider = new Map<EngineRunRef['provider'], CircuitState>();

  constructor(private readonly deps: WorkflowEngineDeps) {
    this.validateDependencies();
    this.logger = deps.logger ?? NOOP_LOGGER;
  }

  async startRun(planRef: PlanRef, context: RunContext): Promise<EngineRunRef> {
    const validatedPlanRef = parsePlanRef(planRef);
    const validatedContext = parseRunContext(context);

    this.logger.info('Starting run', {
      runId: validatedContext.runId,
      tenantId: validatedContext.tenantId,
      provider: validatedContext.targetAdapter,
      planUri: validatedPlanRef.uri,
    });

    try {
      // 1) PlanRef allowlist + schemaVersion gate (contract).
      this.deps.planRefPolicy.validateOrThrow(validatedPlanRef.uri);
      validateSchemaVersionOrThrow(validatedPlanRef.schemaVersion);

      // 2) Tenant boundary gate (contract).
      await this.deps.authorizer.assertTenantAccess(validatedContext.tenantId);

      // 3) Additional defensive checks.
      validateRunIdOrThrow(validatedContext.runId);
      await this.ensureRunDoesNotExist(validatedContext.runId);

      // 4) Integrity gate: MUST happen before any provider start (contract).
      await this.deps.planIntegrity.fetchAndValidate(validatedPlanRef, this.deps.planFetcher);

      const provider = validatedContext.targetAdapter;
      const adapter = this.getAdapterOrThrow(provider);

      // MVP: immediate start.
      await this.emitRunEventFromContext(validatedContext, 'RunQueued');

      // Emit RunStarted *before* invoking provider so projection order is: RunQueued → RunStarted → Provider events → RunCompleted
      await this.emitRunEventFromContext(validatedContext, 'RunStarted');

      const runRef = await this.withTimeout(
        adapter.startRun(validatedPlanRef, validatedContext),
        this.deps.timeouts?.adapterCallMs ?? 30_000,
        'adapter.startRun'
      );

      // Persist minimal metadata for correlation resolution.
      const meta: RunMetadata = buildRunMetadata(validatedContext, runRef);
      await this.deps.stateStore.saveRunMetadata(meta);

      return runRef;
    } catch (error) {
      this.logger.error('startRun failed', {
        runId: validatedContext.runId,
        tenantId: validatedContext.tenantId,
        provider: validatedContext.targetAdapter,
        error: toErrorMessage(error),
      });

      await this.emitRunEventFromContext(validatedContext, 'RunFailed').catch(() => undefined);
      throw error;
    }
  }

  async cancelRun(engineRunRef: EngineRunRef): Promise<void> {
    const validatedRunRef = parseEngineRunRef(engineRunRef);
    const meta = await this.resolveMetaOrThrow(validatedRunRef);
    await this.deps.authorizer.assertTenantAccess(meta.tenantId);

    const adapter = this.getAdapterOrThrow(meta.provider);

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
    await this.emitRunEvent(meta, 'RunCancelled');
  }

  async getRunStatus(engineRunRef: EngineRunRef): Promise<RunStatusSnapshot> {
    const validatedRunRef = parseEngineRunRef(engineRunRef);
    const meta = await this.resolveMetaOrThrow(validatedRunRef);
    await this.deps.authorizer.assertTenantAccess(meta.tenantId);

    const events = await this.deps.stateStore.listEvents(meta.runId);
    const projected = this.deps.projector.rebuild(meta.runId, events);

    // If adapter can enrich with substatus/message, merge without changing hash.
    const adapter = this.deps.adapters.get(meta.provider);
    if (!adapter) return projected;

    let providerView: RunStatusSnapshot;
    try {
      providerView = await this.withCircuitBreaker(meta.provider, async () =>
        this.withTimeout(
          adapter.getRunStatus(validatedRunRef),
          this.deps.timeouts?.adapterCallMs ?? 30_000,
          'adapter.getRunStatus'
        )
      );
    } catch (error) {
      this.logger.error('Adapter getRunStatus failed, using projected state', {
        runId: meta.runId,
        provider: meta.provider,
        error: toErrorMessage(error),
      });
      return projected;
    }

    const mergedSubstatus = providerView.substatus ?? projected.substatus;
    const mergedMessage = providerView.message ?? projected.message;

    return {
      ...projected,
      ...(mergedSubstatus !== undefined ? { substatus: mergedSubstatus } : {}),
      ...(mergedMessage !== undefined ? { message: mergedMessage } : {}),
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
    if (!adapter) throw new Error(`No adapter registered for provider: ${provider}`);
    return adapter;
  }

  private mapSignalToRunEventType(type: SignalRequest['type']): EventEnvelope['eventType'] | null {
    if (type === 'RETRY_STEP' || type === 'RETRY_RUN') {
      // Phase 2: planner-driven deterministic retry semantics.
      throw new Error('NotImplemented: RETRY_* signals are Phase 2');
    }

    const byType: Record<'PAUSE' | 'RESUME' | 'CANCEL', EventEnvelope['eventType']> = {
      PAUSE: 'RunPaused',
      RESUME: 'RunResumed',
      CANCEL: 'RunCancelled',
    };

    return byType[type as 'PAUSE' | 'RESUME' | 'CANCEL'] ?? null;
  }

  private async resolveMetaOrThrow(runRef: EngineRunRef): Promise<RunMetadata> {
    const m = await this.deps.stateStore.getRunMetadataByRunId(runRef.runId);
    if (!m) {
      throw new Error(`Run metadata not found for runId: ${runRef.runId}`);
    }
    return m;
  }

  private async emitRunEvent(
    meta: RunMetadata,
    eventType: EventEnvelope['eventType']
  ): Promise<void> {
    const base = {
      eventType,
      emittedAt: this.deps.clock.nowIsoUtc(),
      tenantId: meta.tenantId,
      projectId: meta.projectId,
      environmentId: meta.environmentId,
      runId: meta.runId,
      engineAttemptId: 1,
      logicalAttemptId: 1,
    };

    const idempotencyKey = this.deps.idempotency.runEventKey({
      eventType,
      tenantId: meta.tenantId,
      runId: meta.runId,
      logicalAttemptId: 1,
    });

    const env: Omit<EventEnvelope, 'runSeq'> = {
      ...base,
      idempotencyKey,
    };

    await this.persistEvent(meta.runId, env);
  }

  private async emitRunEventFromContext(
    ctx: RunContext,
    eventType: EventEnvelope['eventType']
  ): Promise<void> {
    const env: Omit<EventEnvelope, 'runSeq'> = {
      eventType,
      emittedAt: this.deps.clock.nowIsoUtc(),
      tenantId: ctx.tenantId,
      projectId: ctx.projectId,
      environmentId: ctx.environmentId,
      runId: ctx.runId,
      engineAttemptId: 1,
      logicalAttemptId: 1,
      idempotencyKey: this.deps.idempotency.runEventKey({
        eventType,
        tenantId: ctx.tenantId,
        runId: ctx.runId,
        logicalAttemptId: 1,
      }),
    };
    await this.persistEvent(ctx.runId, env);
  }

  private async emitSignalDerivedRunEvent(
    meta: RunMetadata,
    req: SignalRequest,
    eventType: EventEnvelope['eventType']
  ): Promise<void> {
    const base = {
      eventType,
      emittedAt: this.deps.clock.nowIsoUtc(),
      tenantId: meta.tenantId,
      projectId: meta.projectId,
      environmentId: meta.environmentId,
      runId: meta.runId,
      engineAttemptId: 1,
      logicalAttemptId: 1,
    };

    const idempotencyKey = this.deps.idempotency.signalKey(meta.tenantId, meta.runId, req);

    const env: Omit<EventEnvelope, 'runSeq'> = {
      ...base,
      idempotencyKey,
    };

    await this.persistEvent(meta.runId, env);
  }

  private async persistEvent(runId: string, env: Omit<EventEnvelope, 'runSeq'>): Promise<void> {
    const transactionalStore = this.deps.stateStore as IRunStateStore & {
      appendAndEnqueueTx?: (
        runId: string,
        envelopes: Omit<EventEnvelope, 'runSeq'>[],
        outbox: IOutboxStorage
      ) => Promise<unknown>;
    };

    // Preferred path when store supports atomic append+enqueue.
    if (typeof transactionalStore.appendAndEnqueueTx === 'function') {
      await transactionalStore.appendAndEnqueueTx(runId, [env], this.deps.outbox);
      return;
    }

    const { appended } = await this.deps.stateStore.appendEventsTx(runId, [env]);
    await this.withTimeout(
      this.deps.outbox.enqueueTx(runId, appended),
      this.deps.timeouts?.outboxEnqueueMs ?? 30_000,
      'outbox.enqueueTx'
    );
  }

  private async ensureRunDoesNotExist(runId: string): Promise<void> {
    const existing = await this.deps.stateStore.getRunMetadataByRunId(runId);
    if (existing) {
      throw new Error(`Run ${runId} already exists`);
    }
  }

  private async withCircuitBreaker<T>(
    provider: EngineRunRef['provider'],
    operation: () => Promise<T>
  ): Promise<T> {
    const failureThreshold = this.deps.circuitBreaker?.failureThreshold ?? 3;
    const resetTimeoutMs = this.deps.circuitBreaker?.resetTimeoutMs ?? 30_000;
    const now = Date.parse(this.deps.clock.nowIsoUtc());

    const state = this.circuitStateByProvider.get(provider) ?? {
      failures: 0,
      openedUntilEpochMs: 0,
    };

    if (state.openedUntilEpochMs > now) {
      throw new Error(`Circuit open for provider ${provider} until ${state.openedUntilEpochMs}`);
    }

    try {
      const result = await operation();
      this.circuitStateByProvider.set(provider, { failures: 0, openedUntilEpochMs: 0 });
      return result;
    } catch (error) {
      const failures = state.failures + 1;
      const openedUntilEpochMs = failures >= failureThreshold ? now + resetTimeoutMs : 0;

      this.circuitStateByProvider.set(provider, { failures, openedUntilEpochMs });
      throw error;
    }
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
      ['planIntegrity', this.deps.planIntegrity],
      ['planFetcher', this.deps.planFetcher],
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
      if (!this.deps.adapters.has(provider)) {
        throw new Error(`No adapter registered for required provider: ${provider}`);
      }
    }
  }
}

function validateSchemaVersionOrThrow(schemaVersion: string): void {
  // Contract: engine rejects unknown schema versions; supports <=3 minor versions back.
  // MVP: accept v1.x only.
  if (!schemaVersion.startsWith('v1.')) {
    throw new Error(`PLAN_SCHEMA_VERSION_UNKNOWN: ${schemaVersion}`);
  }
}

function validateRunIdOrThrow(runId: string): void {
  // Defensive format guard: letters/digits + [._:-], no spaces.
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(runId)) {
    throw new Error(`Invalid runId format: ${runId}`);
  }
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function buildRunMetadata(ctx: RunContext, runRef: EngineRunRef): RunMetadata {
  if (runRef.provider === 'temporal') {
    return {
      tenantId: ctx.tenantId,
      projectId: ctx.projectId,
      environmentId: ctx.environmentId,
      runId: ctx.runId,
      provider: 'temporal',
      providerWorkflowId: runRef.workflowId,
      providerRunId: runRef.runId,
      providerNamespace: runRef.namespace,
      ...(runRef.taskQueue ? { providerTaskQueue: runRef.taskQueue } : {}),
    };
  }
  if (runRef.provider === 'conductor') {
    return {
      tenantId: ctx.tenantId,
      projectId: ctx.projectId,
      environmentId: ctx.environmentId,
      runId: ctx.runId,
      provider: 'conductor',
      providerWorkflowId: runRef.workflowId,
      providerRunId: runRef.runId,
      providerConductorUrl: runRef.conductorUrl,
    };
  }
  return {
    tenantId: ctx.tenantId,
    projectId: ctx.projectId,
    environmentId: ctx.environmentId,
    runId: ctx.runId,
    provider: 'mock',
    providerWorkflowId: runRef.workflowId,
    providerRunId: runRef.runId,
  };
}
