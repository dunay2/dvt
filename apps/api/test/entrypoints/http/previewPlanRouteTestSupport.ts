import type { IPlanner } from '@dvt/contracts';
import { vi } from 'vitest';

import { PreviewPlanUseCase } from '../../../src/application/services/PreviewPlanUseCase.js';

import { okAuthDeps, type TestAuthDeps } from './planRouteHttpTestSupport.js';

export type PreviewRouteTestDeps = TestAuthDeps & {
  planner: Pick<IPlanner, 'buildPlan' | 'deriveExecutableSubgraph'>;
  planStore: {
    storePlanArtifact: ReturnType<typeof vi.fn>;
    markStoredPlanArtifactValid: ReturnType<typeof vi.fn>;
    markStoredPlanArtifactInvalid: ReturnType<typeof vi.fn>;
    getStoredPlanValidationRecord: ReturnType<typeof vi.fn>;
  };
  planValidator: { validatePlan: ReturnType<typeof vi.fn> };
  previewSelectionResolver: { execute: ReturnType<typeof vi.fn> };
  useCase: Pick<PreviewPlanUseCase, 'execute'>;
};

type PreviewRouteTestOverrides = Partial<
  Omit<PreviewRouteTestDeps, 'useCase' | 'planner' | 'planStore' | 'planValidator'>
> & {
  planner?: Partial<PreviewRouteTestDeps['planner']>;
  planStore?: Partial<PreviewRouteTestDeps['planStore']>;
  planValidator?: Partial<PreviewRouteTestDeps['planValidator']>;
  previewSelectionResolver?: Partial<PreviewRouteTestDeps['previewSelectionResolver']>;
};

export function createPreviewDeps(overrides: PreviewRouteTestOverrides = {}): PreviewRouteTestDeps {
  const planner = {
    buildPlan: vi.fn(),
    deriveExecutableSubgraph: vi.fn(),
    ...overrides.planner,
  };
  const planStore = {
    storePlanArtifact: vi.fn(),
    markStoredPlanArtifactValid: vi.fn(),
    markStoredPlanArtifactInvalid: vi.fn(),
    getStoredPlanValidationRecord: vi.fn(),
    ...overrides.planStore,
  };
  const planValidator = {
    validatePlan: vi.fn(async () => ({ status: 'OK' })),
    ...overrides.planValidator,
  };
  const previewSelectionResolver = {
    execute: vi.fn(
      async (input: {
        selection: { mode: string; nodeIds: readonly string[] };
        graphSource: unknown;
      }) => ({
        ok: true as const,
        value: {
          graphSource: input.graphSource,
          nodeIds: [...input.selection.nodeIds],
        },
      })
    ),
    ...overrides.previewSelectionResolver,
  };

  return {
    ...okAuthDeps(),
    ...overrides,
    planner,
    planStore,
    planValidator,
    previewSelectionResolver,
    useCase: new PreviewPlanUseCase({
      planner,
      planStore,
      planValidator,
      previewSelectionResolver: previewSelectionResolver as never,
    }),
  };
}
