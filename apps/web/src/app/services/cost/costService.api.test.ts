import { describe, expect, it, vi } from 'vitest';

import type { ApiClient } from '../api/createApiClient';
import { createApiCostAttributionSummaryPort } from './costService.api';

function createApiClientMock(): ApiClient {
  return {
    baseUrl: 'http://localhost:3000',
    requestRaw: vi.fn(),
    getJson: vi.fn(),
    postJson: vi.fn(),
  };
}

function buildCostAttributionPayload(overrides: Record<string, unknown> = {}) {
  return {
    tenantId: 'tenant-1',
    projectId: 'project-1',
    environmentId: 'env-1',
    runCount: 1,
    completedStepCount: 1,
    failedStepCount: 1,
    totalStepDurationMs: 1500,
    totalCostAmount: null,
    currency: null,
    costCaptureStatus: 'unavailable',
    observedWindow: {
      firstEventAt: '2026-05-31T10:00:00.000Z',
      lastEventAt: '2026-05-31T10:01:00.000Z',
    },
    runs: [
      {
        runId: 'run-1',
        projectId: 'project-1',
        environmentId: 'env-1',
        planId: 'plan-1',
        planVersion: '1.0.0',
        status: 'COMPLETED',
        completedStepCount: 1,
        failedStepCount: 1,
        totalStepDurationMs: 1500,
        costAmount: null,
        currency: null,
      },
    ],
    steps: [
      {
        runId: 'run-1',
        stepId: 'step-ok',
        eventType: 'StepCompleted',
        durationMs: 1000,
        costAmount: null,
        currency: null,
      },
      {
        runId: 'run-1',
        stepId: 'step-failed',
        eventType: 'StepFailed',
        durationMs: 500,
        costAmount: null,
        currency: null,
      },
    ],
    nextCursor: null,
    ...overrides,
  };
}

describe('cost attribution API service', () => {
  it('calls the protected runtime cost attribution endpoint with scoped query parameters', async () => {
    const apiClient = createApiClientMock();
    vi.mocked(apiClient.getJson).mockResolvedValue(buildCostAttributionPayload());

    const service = createApiCostAttributionSummaryPort(apiClient);
    const summary = await service.getCostAttributionSummary({
      tenantId: 'tenant-1',
      projectId: 'project-1',
      environmentId: 'env-1',
      limit: 25,
    });

    expect(apiClient.getJson).toHaveBeenCalledWith(
      '/cost/attribution-summary?tenantId=tenant-1&projectId=project-1&environmentId=env-1&limit=25'
    );
    expect(summary).toMatchObject({
      tenantId: 'tenant-1',
      projectId: 'project-1',
      environmentId: 'env-1',
      runCount: 1,
      completedStepCount: 1,
      failedStepCount: 1,
      totalCostAmount: null,
      currency: null,
      costCaptureStatus: 'unavailable',
    });
    expect(summary.steps.map((step) => step.stepId)).toEqual(['step-ok', 'step-failed']);
  });

  it('omits optional scope parameters when they are absent', async () => {
    const apiClient = createApiClientMock();
    vi.mocked(apiClient.getJson).mockResolvedValue(
      buildCostAttributionPayload({ projectId: null, environmentId: null })
    );

    const service = createApiCostAttributionSummaryPort(apiClient);
    await service.getCostAttributionSummary({ tenantId: 'tenant-1' });

    expect(apiClient.getJson).toHaveBeenCalledWith('/cost/attribution-summary?tenantId=tenant-1');
  });

  it('rejects payloads that invent monetary totals before credit capture exists', async () => {
    const apiClient = createApiClientMock();
    vi.mocked(apiClient.getJson).mockResolvedValue(
      buildCostAttributionPayload({ totalCostAmount: 1.23 })
    );

    const service = createApiCostAttributionSummaryPort(apiClient);

    await expect(service.getCostAttributionSummary({ tenantId: 'tenant-1' })).rejects.toThrow(
      'COST_ATTRIBUTION_SUMMARY_INVALID totalCostAmount: expected null'
    );
  });

  it('rejects malformed step event types', async () => {
    const apiClient = createApiClientMock();
    vi.mocked(apiClient.getJson).mockResolvedValue(
      buildCostAttributionPayload({
        steps: [
          {
            runId: 'run-1',
            stepId: 'step-unknown',
            eventType: 'StepStarted',
            durationMs: 0,
            costAmount: null,
            currency: null,
          },
        ],
      })
    );

    const service = createApiCostAttributionSummaryPort(apiClient);

    await expect(service.getCostAttributionSummary({ tenantId: 'tenant-1' })).rejects.toThrow(
      'COST_ATTRIBUTION_SUMMARY_INVALID steps[0].eventType: expected StepCompleted or StepFailed'
    );
  });
});
