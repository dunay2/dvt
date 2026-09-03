import { describe, expect, it, vi } from 'vitest';

import type { ApiClient } from '../api/createApiClient';
import { makeRunContext } from '../../testing/contractTestUtils';
import { createPlansService } from './plansService';
import { buildApiClientStub, buildPlan, buildValidPlanRef } from './plansService.test.support';

describe('createPlansService import behavior', () => {
  it('uses the backend-owned reference returned with an imported plan', async () => {
    const backendRef = {
      ...buildValidPlanRef(),
      uri: 'dvt-plan://plans/backend-owned-import-ref',
    };
    const postJson = vi.fn(async () => ({ plan: buildPlan(), planRef: backendRef }));
    const service = createPlansService(buildApiClientStub(postJson as ApiClient['postJson']));
    const context = makeRunContext('run-1');

    const plan = await service.importPlan(buildValidPlanRef(), context);

    expect(plan.planRef).toEqual(backendRef);
    expect(postJson).toHaveBeenCalledWith('/plans/import', {
      planRef: buildValidPlanRef(),
      context,
    });
  });

  it('rejects an imported plan without its authoritative reference', async () => {
    const postJson = vi.fn(async () => ({ plan: buildPlan() }));
    const service = createPlansService(buildApiClientStub(postJson as ApiClient['postJson']));

    await expect(service.importPlan(buildValidPlanRef(), makeRunContext('run-1'))).rejects.toThrow(
      'Invalid plans payload: expected { plan, planRef }'
    );
  });
});
