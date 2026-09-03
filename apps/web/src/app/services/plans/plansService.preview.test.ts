import { describe, expect, it, vi } from 'vitest';

import type { ApiClient } from '../api/createApiClient';
import { createPlansService } from './plansService';
import {
  buildApiClientStub,
  buildPlan,
  buildPreviewInput,
  buildPreviewPayload,
  buildValidPlanRef,
  createPlanRejectedApiError,
  previewAccepted,
} from './plansService.test.support';

describe('createPlansService preview behavior', () => {
  it('maps a canonical generic preview and its retry policy', async () => {
    const postJson = vi.fn(async () => buildPreviewPayload(buildPlan({ retryAttempts: 4 })));
    const service = createPlansService(buildApiClientStub(postJson as ApiClient['postJson']));

    const plan = await previewAccepted(service);

    expect(plan.target).toBe('canonical-env');
    expect(plan.steps[0]).toMatchObject({
      id: 'model.analytics.customers',
      type: 'DBT_MODEL',
      name: 'customers',
      nodes: ['model.analytics.customers'],
      policies: { retries: 3 },
    });
    expect(postJson).toHaveBeenCalledWith('/plans/preview', buildPreviewInput());
  });

  it('uses the step identity when a generic plan omits canonical nodeIds', async () => {
    const postJson = vi.fn(async () => buildPreviewPayload(buildPlan({ includeNodeIds: false })));
    const service = createPlansService(buildApiClientStub(postJson as ApiClient['postJson']));

    const plan = await previewAccepted(service);

    expect(plan.steps[0]?.nodes).toEqual(['model.analytics.customers']);
  });

  it.each(['dependency_gap', 'selected_node_missing', 'cycle_detected'])(
    'returns a typed selection rejection for %s',
    async (cause) => {
      const rejection = { code: 'REJECTED', cause, reason: `Rejected: ${cause}` };
      const postJson = vi.fn(async () => {
        throw createPlanRejectedApiError({
          contractVersion: '1.0.0',
          kind: 'selection-rejected',
          rejection,
        });
      });
      const service = createPlansService(buildApiClientStub(postJson as ApiClient['postJson']));

      await expect(service.previewPlan(buildPreviewInput())).resolves.toEqual({
        kind: 'selection-rejected',
        rejection,
      });
    }
  );

  it('returns plan-invalid with the exact rejected plan identity', async () => {
    const validation = {
      status: 'ERROR',
      code: 'MISSING_CAPABILITY',
      planId: buildValidPlanRef().planId,
      adapterId: 'temporal',
      degradable: false,
      reason: 'The adapter is missing executor.dbt.',
      cause: 'executor.dbt',
    };
    const postJson = vi.fn(async () => {
      throw createPlanRejectedApiError({
        contractVersion: '1.0.0',
        kind: 'plan-invalid',
        ...buildPreviewPayload(),
        validation,
      });
    });
    const service = createPlansService(buildApiClientStub(postJson as ApiClient['postJson']));

    const outcome = await service.previewPlan(buildPreviewInput());

    expect(outcome.kind).toBe('plan-invalid');
    if (outcome.kind === 'plan-invalid') {
      expect(outcome.plan.planRef).toEqual(buildValidPlanRef());
      expect(outcome.validation).toEqual(validation);
    }
  });

  it('does not reinterpret malformed rejection envelopes as product outcomes', async () => {
    const error = createPlanRejectedApiError({
      contractVersion: '1.0.0',
      kind: 'selection-rejected',
      rejection: { code: 'REJECTED' },
    });
    const postJson = vi.fn(async () => {
      throw error;
    });
    const service = createPlansService(buildApiClientStub(postJson as ApiClient['postJson']));

    await expect(service.previewPlan(buildPreviewInput())).rejects.toBe(error);
  });
});
