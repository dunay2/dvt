import type { EngineRunRef, ProviderRunStatusView } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import { bootstrapQueuedRun, makeRunRef } from '../helpers/runLifecycle.fixture.js';
import { createWorkflowEngineCoreFixture } from '../helpers/workflowEngine.fixture.js';

describe('RunEnrichmentService', () => {
  it('returns canonical status plus provider view', async () => {
    const { runEnrichmentService, store } = createWorkflowEngineCoreFixture({
      adapterOverrides: {
        async getProviderStatusView() {
          return {
            provider: 'temporal',
            providerStatus: 'RUNNING',
            providerSubstatus: 'DRAINING',
            message: 'graceful shutdown in progress',
          } as ProviderRunStatusView;
        },
      },
    });
    await bootstrapQueuedRun(store, 'core-enrich-1');
    const ref: EngineRunRef = makeRunRef('core-enrich-1');
    const enriched = await runEnrichmentService.getRunEnrichment(ref);

    expect(enriched.canonical.runId).toBe('core-enrich-1');
    expect(enriched.canonical.status).toBe('PENDING');
    expect(enriched.providerView.provider).toBe('temporal');
    expect(enriched.providerView.providerStatus).toBe('RUNNING');
    expect(enriched.providerView.providerSubstatus).toBe('DRAINING');
    expect(enriched.providerView.message).toBe('graceful shutdown in progress');
  });

  it('throws when adapter status fetch fails', async () => {
    const { runEnrichmentService, store } = createWorkflowEngineCoreFixture({
      adapterOverrides: {
        async getProviderStatusView() {
          throw new Error('provider unavailable');
        },
      },
    });
    await bootstrapQueuedRun(store, 'core-enrich-err-1');
    const ref: EngineRunRef = makeRunRef('core-enrich-err-1');
    await expect(runEnrichmentService.getRunEnrichment(ref)).rejects.toThrow(
      /provider unavailable/
    );
  });

  it('rejects on adapter timeout without downgrading to projected status', async () => {
    const { runEnrichmentService, store } = createWorkflowEngineCoreFixture({
      adapterOverrides: {
        async getProviderStatusView() {
          return await new Promise<ProviderRunStatusView>((resolve) => {
            setTimeout(() => resolve({ provider: 'temporal', providerStatus: 'RUNNING' }), 25);
          });
        },
      },
      timeouts: {
        adapterCallMs: 5,
      },
    });
    await bootstrapQueuedRun(store, 'core-enrich-timeout-1');
    const ref: EngineRunRef = makeRunRef('core-enrich-timeout-1');

    await expect(runEnrichmentService.getRunEnrichment(ref)).rejects.toThrow(
      /adapter\.getProviderStatusView timed out after 5ms/
    );
  });
});
