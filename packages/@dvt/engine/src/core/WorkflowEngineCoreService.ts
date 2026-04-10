import type { EngineRunRef, EventType, RunStatusSnapshot, SignalRequest } from '@dvt/contracts';
import { getSignalDerivedEventType, parseEngineRunRef, parseSignalRequest } from '@dvt/contracts';
import type { IObservability } from '@dvt/observability';
import type { GuardedRunEventType } from '@dvt/run-domain';

import type { IProviderAdapter } from '../adapters/IProviderAdapter.js';
import type { IWorkflowEngineCore } from '../domain/IWorkflowEngineCore.js';
import type { IRunStateStoreRead, IRunStateStoreWrite } from '../ports/IRunStateStore.js';
import type { IRunAccessPolicy } from '../security/RunAccessPolicy.js';
import { SignalTransitionGuard } from '../services/signal/SignalTransitionGuard.js';
import type { IClock } from '../utils/clock.js';
import { toErrorMessage } from '../utils/errorUtils.js';

import type { IdempotencyKeyBuilder } from './idempotency.js';
import {
  CORE_LOG_MESSAGE,
  CORE_METRIC,
  CORE_OPERATION,
  CORE_SPAN,
  CORE_TIMEOUT_MS,
  CORE_TIMEOUT_OPERATION,
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
  clock: Pick<IClock, 'nowIsoUtc'>;
}

export class WorkflowEngineCoreService implements IWorkflowEngineCore {
  private readonly signalTransitionGuard: SignalTransitionGuard;

  constructor(private readonly deps: WorkflowEngineCoreDeps) {
    this.signalTransitionGuard = new SignalTransitionGuard({
      stateStoreRead: deps.stateStoreRead,
      idempotency: deps.idempotency,
      clock: deps.clock,
    });
  }

  async cancel(ref: EngineRunRef): Promise<void> {
    const validatedRunRef = normalizeEngineRunRef(parseEngineRunRef(ref));
    await this.deps.policy.assertTenantAccess(validatedRunRef.tenantId);
    const meta = await resolveMetaOrThrow(this.deps.stateStoreRead, validatedRunRef);
    const adapter = getAdapterOrThrow(this.deps.adapters, meta.providerRef.provider);
    const startMs = Date.parse(this.deps.clock.nowIsoUtc());
    const metricTags = buildMetricTags(meta.providerRef.provider, meta.tenantId, {
      operation: CORE_OPERATION.cancelRun,
    });
    const traceContext = buildTraceContext(meta, meta.planId);

    await this.deps.observability.withContext(traceContext, () =>
      this.deps.observability.traces.withSpan(
        CORE_SPAN.cancelRun,
        {
          context: traceContext,
          attributes: { provider: meta.providerRef.provider },
        },
        async (span) => {
          try {
            this.deps.observability.logs.info({
              msg: CORE_LOG_MESSAGE.cancellingRun,
              context: traceContext,
              attributes: { provider: meta.providerRef.provider },
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
    const metricTags = buildMetricTags(meta.providerRef.provider, meta.tenantId, {
      operation: CORE_OPERATION.getRunStatus,
    });
    const traceContext = buildTraceContext(meta, meta.planId);

    return this.deps.observability.withContext(traceContext, () =>
      this.deps.observability.traces.withSpan(
        CORE_SPAN.getRunStatus,
        {
          context: traceContext,
          attributes: { provider: meta.providerRef.provider },
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
    const adapter = getAdapterOrThrow(this.deps.adapters, meta.providerRef.provider);
    const traceContext = buildTraceContext(meta, meta.planId);

    return this.deps.observability.withContext(traceContext, () =>
      this.deps.observability.traces.withSpan(
        CORE_SPAN.enrichRunStatus,
        {
          context: traceContext,
          attributes: { provider: meta.providerRef.provider },
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
    const adapter = getAdapterOrThrow(this.deps.adapters, meta.providerRef.provider);
    const traceContext = buildTraceContext(meta, meta.planId);

    await this.deps.observability.withContext(traceContext, () =>
      this.deps.observability.traces.withSpan(
        CORE_SPAN.signal,
        {
          context: traceContext,
          attributes: { provider: meta.providerRef.provider, signalType: validatedRequest.type },
        },
        async (span) => {
          try {
            const validationEventType = this.mapSignalToValidationEventType(validatedRequest.type);
            const mappedEventType = this.mapSignalToRunEventType(
              validatedRequest.type,
              adapter.signalSemanticsVersions?.()
            );

            if (validationEventType) {
              const validationResult = await this.signalTransitionGuard.assertAllowed(
                meta,
                validatedRequest,
                validationEventType
              );
              if (validationResult === 'already_applied') {
                span.setStatus('ok');
                return;
              }
            }

            await withTimeout(
              adapter.signal(validatedRunRef, validatedRequest),
              this.deps.timeouts?.adapterCallMs ?? CORE_TIMEOUT_MS.adapterCall,
              CORE_TIMEOUT_OPERATION.adapterSignal
            );

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

  private mapSignalToRunEventType(
    type: SignalRequest['type'],
    supportedVersions?: readonly string[]
  ): EventType | null {
    return getSignalDerivedEventType(type, supportedVersions);
  }

  private mapSignalToValidationEventType(type: SignalRequest['type']): GuardedRunEventType | null {
    switch (type) {
      case 'PAUSE':
        return 'RunPaused';
      case 'RESUME':
        return 'RunResumed';
      default:
        return null;
    }
  }
}
