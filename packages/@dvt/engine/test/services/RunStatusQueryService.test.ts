import type { EngineRunRef, ProviderRunStatusView } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import { bootstrapQueuedRun, makeRunRef } from '../helpers/runLifecycle.fixture.js';
import { createWorkflowEngineCoreFixture } from '../helpers/workflowEngine.fixture.js';

describe('RunStatusQueryService', () => {
  it('returns projected state without calling adapter', async () => {
    let adapterCalled = false;
    const { runStatusQueryService, store } = createWorkflowEngineCoreFixture({
      adapterOverrides: {
        async getProviderStatusView() {
          adapterCalled = true;
          return { provider: 'temporal', providerStatus: 'RUNNING' } as ProviderRunStatusView;
        },
      },
    });
    await bootstrapQueuedRun(store, 'query-status-1');
    const ref: EngineRunRef = makeRunRef('query-status-1');
    const snapshot = await runStatusQueryService.getStatus(ref);

    expect(adapterCalled).toBe(false);
    expect(snapshot.runId).toBe('query-status-1');
    expect(snapshot.status).toBe('PENDING');
  });
});
