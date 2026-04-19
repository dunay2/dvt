import { vi } from 'vitest';

import { PreviewPlanUseCase } from '../../../src/application/services/PreviewPlanUseCase.js';

import { okAuthDeps, type TestAuthDeps } from './planRouteHttpTestSupport.js';

export type PreviewRouteTestDeps = TestAuthDeps & {
  planner: { buildPlan: ReturnType<typeof vi.fn> };
  planStore: {
    storePlan: ReturnType<typeof vi.fn>;
    markValid: ReturnType<typeof vi.fn>;
    markInvalid: ReturnType<typeof vi.fn>;
    getValidationRecord: ReturnType<typeof vi.fn>;
  };
  planValidator: { validatePlan: ReturnType<typeof vi.fn> };
  useCase: Pick<PreviewPlanUseCase, 'execute'>;
};

type PreviewRouteTestOverrides = Partial<
  Omit<PreviewRouteTestDeps, 'useCase' | 'planner' | 'planStore' | 'planValidator'>
> & {
  planner?: Partial<PreviewRouteTestDeps['planner']>;
  planStore?: Partial<PreviewRouteTestDeps['planStore']>;
  planValidator?: Partial<PreviewRouteTestDeps['planValidator']>;
};

export function createPreviewDeps(
  overrides: PreviewRouteTestOverrides = {}
): PreviewRouteTestDeps {
  const planner = {
    buildPlan: vi.fn(),
    ...overrides.planner,
  };
  const planStore = {
    storePlan: vi.fn(),
    markValid: vi.fn(),
    markInvalid: vi.fn(),
    getValidationRecord: vi.fn(),
    ...overrides.planStore,
  };
  const planValidator = {
    validatePlan: vi.fn(async () => ({ status: 'OK' })),
    ...overrides.planValidator,
  };

  return {
    ...okAuthDeps(),
    ...overrides,
    planner,
    planStore,
    planValidator,
    useCase: new PreviewPlanUseCase({
      planner,
      planStore,
      planValidator,
    }),
  };
}
