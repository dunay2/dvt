import type { CanonicalRunStatus, EngineRunRef } from '@dvt/contracts';
import { parseEngineRunRef } from '@dvt/contracts';
import type { IObservability } from '@dvt/observability';

import { CORE_METRIC, CORE_OPERATION, CORE_SPAN } from '../core/lifecycle/coreDomainConstants.js';
import {
  buildMetricTags,
  buildTraceContext,
  normalizeEngineRunRef,
  readCanonicalRunStatus,
  resolveMetaOrThrow,
} from '../core/lifecycle/coreRuntime.js';
import { SnapshotProjector } from '../core/SnapshotProjector.js';
import type { IRunStatusQueryService } from '../domain/IRunStatusQueryService.js';
import type { IRunStateStoreRead } from '../ports/IRunStateStore.js';
import type { IRunAccessPolicy } from '../security/RunAccessPolicy.js';
import { toErrorMessage } from '../utils/errorUtils.js';

export interface RunStatusQueryServiceDeps {
  stateStoreRead: IRunStateStoreRead;
  projector: SnapshotProjector;
  policy: IRunAccessPolicy;
  observability: IObservability;
  clock: { nowIsoUtc(): string };
}

export class RunStatusQueryService implements IRunStatusQueryService {
  constructor(private readonly deps: RunStatusQueryServiceDeps) {}

  async getStatus(ref: EngineRunRef): Promise<CanonicalRunStatus> {
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
            const result = await readCanonicalRunStatus({
              stateStoreRead: this.deps.stateStoreRead,
              projector: this.deps.projector,
              tenantId: meta.tenantId,
              runId: meta.runId,
            });

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
}

export function buildRunStatusQueryService(
  deps: RunStatusQueryServiceDeps
): IRunStatusQueryService {
  return new RunStatusQueryService(deps);
}
