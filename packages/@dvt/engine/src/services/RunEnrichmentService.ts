import type { EngineRunRef, RunStatusEnrichment } from '@dvt/contracts';
import { parseEngineRunRef } from '@dvt/contracts';
import type { IObservability } from '@dvt/observability';

import type { IProviderAdapter } from '../adapters/IProviderAdapter.js';
import type { IRunEnrichmentService } from '../contracts/IRunEnrichmentService.v1.js';
import {
  CORE_SPAN,
  CORE_TIMEOUT_MS,
  CORE_TIMEOUT_OPERATION,
} from '../core/lifecycle/coreDomainConstants.js';
import {
  buildTraceContext,
  getAdapterOrThrow,
  normalizeEngineRunRef,
  readCanonicalRunStatus,
  resolveMetaOrThrow,
  withTimeout,
} from '../core/lifecycle/coreRuntime.js';
import { SnapshotProjector } from '../core/SnapshotProjector.js';
import type { IRunStateStoreRead } from '../ports/IRunStateStore.js';
import type { IRunAccessPolicy } from '../security/RunAccessPolicy.js';
import { toErrorMessage } from '../utils/errorUtils.js';

export interface RunEnrichmentServiceDeps {
  stateStoreRead: IRunStateStoreRead;
  projector: SnapshotProjector;
  policy: IRunAccessPolicy;
  adapters: Map<EngineRunRef['provider'], IProviderAdapter>;
  observability: IObservability;
  timeouts?: {
    adapterCallMs?: number;
    outboxEnqueueMs?: number;
  };
}

export class RunEnrichmentService implements IRunEnrichmentService {
  constructor(private readonly deps: RunEnrichmentServiceDeps) {}

  async getRunEnrichment(ref: EngineRunRef): Promise<RunStatusEnrichment> {
    const validatedRunRef = normalizeEngineRunRef(parseEngineRunRef(ref));
    await this.deps.policy.assertTenantAccess(validatedRunRef.tenantId);
    const meta = await resolveMetaOrThrow(this.deps.stateStoreRead, validatedRunRef);
    const adapter = getAdapterOrThrow(this.deps.adapters, meta.providerRef.provider);
    const traceContext = buildTraceContext(meta, meta.planId);

    return this.deps.observability.withContext(traceContext, () =>
      this.deps.observability.traces.withSpan(
        CORE_SPAN.getRunEnrichment,
        {
          context: traceContext,
          attributes: { provider: meta.providerRef.provider },
        },
        async (span) => {
          try {
            const canonical = await readCanonicalRunStatus({
              stateStoreRead: this.deps.stateStoreRead,
              projector: this.deps.projector,
              tenantId: meta.tenantId,
              runId: meta.runId,
            });

            const providerView = await withTimeout(
              adapter.getProviderStatusView(validatedRunRef),
              this.deps.timeouts?.adapterCallMs ?? CORE_TIMEOUT_MS.adapterCall,
              CORE_TIMEOUT_OPERATION.adapterGetProviderStatusView
            );
            span.setStatus('ok');
            return {
              canonical,
              providerView,
            };
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
