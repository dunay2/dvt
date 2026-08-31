import { CURRENT_SIGNAL_SEMANTICS_VERSION, asIsoUtcString, asNonBlankString } from '@dvt/contracts';
import {
  type IProviderAdapter,
  type ProviderRunStatusView,
  type ResolvedRunContext,
  type SignalRequest,
} from '@dvt/engine';
import { AllowAllAuthorizer } from '@dvt/engine/runtime';
import { createNoopObservability } from '@dvt/observability';
import { describe, it, expect } from 'vitest';

import { buildWorkflowEngine } from '../../../src/application/services/WorkflowEngineFactory.js';

describe('buildWorkflowEngine', () => {
  it('wraps production runtime adapters with circuit-breaker posture for health', async () => {
    const adapter: IProviderAdapter = {
      provider: 'temporal',
      async startRun(_planRef, context: ResolvedRunContext) {
        return {
          provider: 'temporal',
          tenantId: context.tenantId,
          namespace: asNonBlankString('default'),
          workflowId: asNonBlankString(`wf-${context.runId}`),
          runId: context.runId,
        };
      },
      async cancelRun(_engineRunRef) {},
      async getProviderStatusView(_engineRunRef): Promise<ProviderRunStatusView> {
        return { provider: 'temporal', providerStatus: 'RUNNING' };
      },
      async signal(_engineRunRef, _request: SignalRequest) {},
      signalSemanticsVersions: () => [CURRENT_SIGNAL_SEMANTICS_VERSION],
    };

    const runtime = buildWorkflowEngine({
      security: {
        authorizer: new AllowAllAuthorizer(),
        planRefAllowedSchemes: ['https'],
      },
      persistence: {
        stateStoreRead: {} as never,
        stateStoreWrite: {} as never,
        intentStore: {} as never,
        planFetcher: {} as never,
      },
      runtime: {
        adapters: new Map([['temporal', adapter]]),
      },
      infrastructure: {
        clock: { nowIsoUtc: () => asIsoUtcString('2026-04-05T00:00:00.000Z') },
        observability: createNoopObservability(),
      },
    });

    await expect(runtime.runHealthService.healthCheck()).resolves.toMatchObject({
      status: 'healthy',
      components: expect.arrayContaining([
        {
          name: 'adapter-temporal',
          status: 'up',
          breaker: {
            provider: 'temporal',
            state: 'closed',
            failureCount: 0,
          },
        },
      ]),
    });
  });
});
