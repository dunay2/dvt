import { parseEngineRunRef, parseSignalRequest } from '@dvt/contracts';
import type { EngineRunRef, RunStatusSnapshot, SignalRequest, EventType } from '@dvt/contracts';
import type { IObservability } from '@dvt/observability';

import type { IProviderAdapter } from '../adapters/IProviderAdapter.js';
import { SignalNotImplementedError } from '../contracts/errors.js';
import type { IWorkflowEngineCore } from '../domain/IWorkflowEngineCore.js';
import type { IRunStateStoreRead, IRunStateStoreWrite } from '../ports/IRunStateStore.js';
import type { IRunAccessPolicy } from '../security/RunAccessPolicy.js';
import { toErrorMessage } from '../utils/errorUtils.js';

import type { IdempotencyKeyBuilder } from './idempotency.js';
import {
  CORE_LOG_MESSAGE,
  CORE_METRIC,
  CORE_OPERATION,
  CORE_SPAN,
  CORE_TIMEOUT_MS,
  CORE_TIMEOUT_OPERATION,
  NOT_IMPLEMENTED_SIGNAL_TYPES,
  SIGNAL_TO_EVENT_TYPE,
} from './lifecycle/coreDomainConstants.js';
import {
  buildMetricTags,
  buildTraceContext,
  emitSignalDerivedRunEvent,
  getAdapterOrThrow,
  normalizeEngineRunRef,
  normalizeSignalRequest,
  resolveMetaOrThrow,
  withTimeout,
} from './lifecycle/coreRuntime.js';
import { SnapshotProjector, snapshotToStatus } from './SnapshotProjector.js';

export interface WorkflowEngineCoreDeps {
  stateStoreRead: IRunStateStoreRead;
  stateStoreWrite: IRunStateStoreWrite;
  projector: SnapshotProjector;
  idempotency: IdempotencyKeyBuilder;
  policy: IRunAccessPolicy;
  adapters: Map<EngineRunRef['provider'], IProviderAdapter>;
  observability: IObservability;
  timeouts?: {
    adapterCallMs?: number;
    outboxEnqueueMs?: number;
  };
  clock: { nowIsoUtc(): string };
}

export class WorkflowEngineCoreService implements IWorkflowEngineCore {
  constructor(private readonly deps: WorkflowEngineCoreDeps) {}

  async cancel(ref: EngineRunRef): Promise<void> {
    const validatedRunRef = normalizeEngineRunRef(parseEngineRunRef(ref));
    await this.deps.policy.assertTenantAccess(validatedRunRef.tenantId);
    const meta = await resolveMetaOrThrow(this.deps.stateStoreRead, validatedRunRef);
    const adapter = getAdapterOrThrow(this.deps.adapters, meta.provider);
    const startMs = Date.parse(this.deps.clock.nowIsoUtc());
    const metricTags = buildMetricTags(meta.provider, meta.tenantId, {
      operation: CORE_OPERATION.cancelRun,
    });
    const traceContext = buildTraceContext(meta, meta.planId);

    await this.deps.observability.withContext(traceContext, () =>
      this.deps.observability.traces.withSpan(
        CORE_SPAN.cancelRun,
        {
          context: traceContext,
          attributes: { provider: meta.provider },
        },
        async (span) => {
          try {
            this.deps.observability.logs.info({
              msg: CORE_LOG_MESSAGE.cancellingRun,
              context: traceContext,
              attributes: { provider: meta.provider },
            });

            await withTimeout(
              adapter.cancelRun(validatedRunRef),
              this.deps.timeouts?.adapterCallMs ?? CORE_TIMEOUT_MS.adapterCall,
              CORE_TIMEOUT_OPERATION.adapterCancelRun
            );
            this.deps.observability.metrics
              .counter(CORE_METRIC.cancelRequestedTotal, metricTags)
              .add(1);
            this.deps.observability.metrics
              .histogram(CORE_METRIC.cancelDurationMs, metricTags)
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

  async getStatus(ref: EngineRunRef): Promise<RunStatusSnapshot> {
    const validatedRunRef = normalizeEngineRunRef(parseEngineRunRef(ref));
    await this.deps.policy.assertTenantAccess(validatedRunRef.tenantId);
    const meta = await resolveMetaOrThrow(this.deps.stateStoreRead, validatedRunRef);
    const startMs = Date.parse(this.deps.clock.nowIsoUtc());
    const metricTags = buildMetricTags(meta.provider, meta.tenantId, {
      operation: CORE_OPERATION.getRunStatus,
    });
    const traceContext = buildTraceContext(meta, meta.planId);

    return this.deps.observability.withContext(traceContext, () =>
      this.deps.observability.traces.withSpan(
        CORE_SPAN.getRunStatus,
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
            const result = storedSnap
              ? snapshotToStatus(storedSnap)
              : this.deps.projector.rebuild(
                  meta.runId,
                  await this.deps.stateStoreRead.listEvents(meta.tenantId, meta.runId)
                );

            this.deps.observability.metrics
              .histogram(CORE_METRIC.statusDurationMs, metricTags)
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

  async enrichStatus(ref: EngineRunRef): Promise<RunStatusSnapshot> {
    const validatedRunRef = normalizeEngineRunRef(parseEngineRunRef(ref));
    await this.deps.policy.assertTenantAccess(validatedRunRef.tenantId);
    const meta = await resolveMetaOrThrow(this.deps.stateStoreRead, validatedRunRef);
    const adapter = getAdapterOrThrow(this.deps.adapters, meta.provider);
    const traceContext = buildTraceContext(meta, meta.planId);

    return this.deps.observability.withContext(traceContext, () =>
      this.deps.observability.traces.withSpan(
        CORE_SPAN.enrichRunStatus,
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

            const providerView = await withTimeout(
              adapter.getRunStatus(validatedRunRef),
              this.deps.timeouts?.adapterCallMs ?? CORE_TIMEOUT_MS.adapterCall,
              CORE_TIMEOUT_OPERATION.adapterGetRunStatus
            );
            const substatus = providerView.substatus ?? base.substatus;
            const message = providerView.message ?? base.message;
            span.setStatus('ok');
            const result = { ...base };
            if (substatus !== undefined) result.substatus = substatus;
            if (message !== undefined) result.message = message;
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

  async signal(ref: EngineRunRef, req: SignalRequest): Promise<void> {
    const validatedRunRef = normalizeEngineRunRef(parseEngineRunRef(ref));
    const validatedRequest = normalizeSignalRequest(parseSignalRequest(req));
    await this.deps.policy.assertTenantAccess(validatedRunRef.tenantId);

    const meta = await resolveMetaOrThrow(this.deps.stateStoreRead, validatedRunRef);
    const adapter = getAdapterOrThrow(this.deps.adapters, meta.provider);
    const traceContext = buildTraceContext(meta, meta.planId);

    await this.deps.observability.withContext(traceContext, () =>
      this.deps.observability.traces.withSpan(
        CORE_SPAN.signal,
        {
          context: traceContext,
          attributes: { provider: meta.provider, signalType: validatedRequest.type },
        },
        async (span) => {
          try {
            await withTimeout(
              adapter.signal(validatedRunRef, validatedRequest),
              this.deps.timeouts?.adapterCallMs ?? CORE_TIMEOUT_MS.adapterCall,
              CORE_TIMEOUT_OPERATION.adapterSignal
            );

            const mappedEventType = this.mapSignalToRunEventType(validatedRequest.type);
            if (mappedEventType) {
              await emitSignalDerivedRunEvent({
                stateStoreWrite: this.deps.stateStoreWrite,
                idempotency: this.deps.idempotency,
                clock: this.deps.clock,
                meta,
                req: validatedRequest,
                eventType: mappedEventType,
              });
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

  private mapSignalToRunEventType(type: SignalRequest['type']): EventType | null {
    if (NOT_IMPLEMENTED_SIGNAL_TYPES.has(type)) {
      throw new SignalNotImplementedError(type);
    }
    return SIGNAL_TO_EVENT_TYPE[type] ?? null;
  }
}
