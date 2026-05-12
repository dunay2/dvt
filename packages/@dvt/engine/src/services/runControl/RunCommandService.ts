/**
 * @ownedConcern Execute runtime cancel commands behind the command role interface.
 * @baseline ADR-0003: Execution Model Sovereignty
 * @baseline ADR-0039: Hexagonal Port Hardening and SOLID Remediation
 * @decision Isolate cancel adapter dispatch from the compatibility run-control wrapper.
 * @version 1.0.0
 */
import type { EngineRunRef } from '@dvt/contracts';
import { parseEngineRunRef } from '@dvt/contracts';
import type { IObservability } from '@dvt/observability';

import type { IProviderAdapter } from '../../adapters/IProviderAdapter.js';
import {
  CORE_LOG_MESSAGE,
  CORE_METRIC,
  CORE_OPERATION,
  CORE_SPAN,
  CORE_TIMEOUT_MS,
  CORE_TIMEOUT_OPERATION,
} from '../../core/lifecycle/coreDomainConstants.js';
import {
  buildMetricTags,
  buildTraceContext,
  getAdapterOrThrow,
  normalizeEngineRunRef,
  resolveMetaOrThrow,
  withTimeout,
} from '../../core/lifecycle/coreRuntime.js';
import type { IRunCommandService } from '../../domain/IRunCommandService.js';
import type { IRunStateStoreRead } from '../../ports/IRunStateStore.js';
import type { IRunAccessPolicy } from '../../security/RunAccessPolicy.js';
import type { IClock } from '../../utils/clock.js';
import { toErrorMessage } from '../../utils/errorUtils.js';

export interface RunCommandServiceDeps {
  stateStoreRead: IRunStateStoreRead;
  policy: IRunAccessPolicy;
  adapters: Map<EngineRunRef['provider'], IProviderAdapter>;
  observability: IObservability;
  timeouts?: {
    adapterCallMs?: number;
  };
  clock: Pick<IClock, 'nowIsoUtc'>;
}

export class RunCommandService implements IRunCommandService {
  constructor(private readonly deps: RunCommandServiceDeps) {}

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
}

export function buildRunCommandService(deps: RunCommandServiceDeps): IRunCommandService {
  return new RunCommandService(deps);
}
