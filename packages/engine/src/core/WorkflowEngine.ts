import type {
  EngineRunRef,
  PlanRef,
  RunContext,
  RunStatusSnapshot,
  SignalRequest,
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
}

export class WorkflowEngine implements IWorkflowEngine {
  constructor(private readonly deps: WorkflowEngineDeps) {}

  async startRun(planRef: PlanRef, context: RunContext): Promise<EngineRunRef> {
    // 1) PlanRef allowlist + schemaVersion gate (contract).
    this.deps.planRefPolicy.validateOrThrow(planRef.uri);
    validateSchemaVersionOrThrow(planRef.schemaVersion);

    // 2) Tenant boundary gate (contract).
    await this.deps.authorizer.assertTenantAccess(context.tenantId);

    // 3) Integrity gate: MUST happen before any provider start (contract).
    await this.deps.planIntegrity.fetchAndValidate(planRef, this.deps.planFetcher);

    const provider = context.targetAdapter;
    const adapter = this.deps.adapters.get(provider);
    if (!adapter) {
      throw new Error(`No adapter registered for provider: ${provider}`);
    }

    // MVP: immediate start.
    await this.emitRunEventFromContext(context, 'RunQueued');

    // Emit RunStarted *before* invoking provider so projection order is: RunQueued → RunStarted → Provider events → RunCompleted
    await this.emitRunEventFromContext(context, 'RunStarted');

    const runRef = await adapter.startRun(planRef, context);

    // Persist minimal metadata for correlation resolution.
    const meta: RunMetadata = buildRunMetadata(context, runRef);
    await this.deps.stateStore.saveRunMetadata(meta);

    return runRef;
  }

  async cancelRun(engineRunRef: EngineRunRef): Promise<void> {
    const meta = await this.resolveMetaOrThrow(engineRunRef);
    await this.deps.authorizer.assertTenantAccess(meta.tenantId);

    const adapter = this.deps.adapters.get(meta.provider);
    if (!adapter) throw new Error(`No adapter registered for provider: ${meta.provider}`);

    await adapter.cancelRun(engineRunRef);
    await this.emitRunEvent(meta, 'RunCancelled');
  }

  async getRunStatus(engineRunRef: EngineRunRef): Promise<RunStatusSnapshot> {
    const meta = await this.resolveMetaOrThrow(engineRunRef);
    await this.deps.authorizer.assertTenantAccess(meta.tenantId);

    const events = await this.deps.stateStore.listEvents(meta.runId);
    const projected = this.deps.projector.rebuild(meta.runId, events);

    // If adapter can enrich with substatus/message, merge without changing hash.
    const adapter = this.deps.adapters.get(meta.provider);
    if (!adapter) return projected;

    const providerView = await adapter.getRunStatus(engineRunRef);
    const mergedSubstatus = providerView.substatus ?? projected.substatus;
    const mergedMessage = providerView.message ?? projected.message;

    return {
      ...projected,
      ...(mergedSubstatus !== undefined ? { substatus: mergedSubstatus } : {}),
      ...(mergedMessage !== undefined ? { message: mergedMessage } : {}),
    };
  }

  async signal(engineRunRef: EngineRunRef, request: SignalRequest): Promise<void> {
    const meta = await this.resolveMetaOrThrow(engineRunRef);
    await this.deps.authorizer.assertTenantAccess(meta.tenantId);

    const adapter = this.deps.adapters.get(meta.provider);
    if (!adapter) throw new Error(`No adapter registered for provider: ${meta.provider}`);

    // Provider-native signalling.
    await adapter.signal(engineRunRef, request);

    // Engine-level lifecycle events for operator signals.
    switch (request.type) {
      case 'PAUSE':
        await this.emitSignalDerivedRunEvent(meta, request, 'RunPaused');
        return;
      case 'RESUME':
        await this.emitSignalDerivedRunEvent(meta, request, 'RunResumed');
        return;
      case 'CANCEL':
        await this.emitSignalDerivedRunEvent(meta, request, 'RunCancelled');
        return;
      case 'RETRY_STEP':
      case 'RETRY_RUN':
        // Phase 2: planner-driven deterministic retry semantics.
        throw new Error('NotImplemented: RETRY_* signals are Phase 2');
      default: {
        const _never: never = request.type;
        throw new Error(`Unknown signal type: ${String(_never)}`);
      }
    }
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
    const { appended } = await this.deps.stateStore.appendEventsTx(runId, [env]);

    // If outbox is embedded in the state store (InMemoryTxStore), enqueueTx is a no-op.
    await this.deps.outbox.enqueueTx(runId, appended);
  }
}

function validateSchemaVersionOrThrow(schemaVersion: string): void {
  // Contract: engine rejects unknown schema versions; supports <=3 minor versions back.
  // MVP: accept v1.x only.
  if (!schemaVersion.startsWith('v1.')) {
    throw new Error(`PLAN_SCHEMA_VERSION_UNKNOWN: ${schemaVersion}`);
  }
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
