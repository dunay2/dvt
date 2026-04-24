import type { IPlanner } from '@dvt/contracts';
import { vi } from 'vitest';

import { PreviewPlanUseCase } from '../../../src/application/services/PreviewPlanUseCase.js';

import { okAuthDeps, type TestAuthDeps } from './planRouteHttpTestSupport.js';

export type PreviewRouteTestDeps = TestAuthDeps & {
  planner: Pick<IPlanner, 'buildPlan' | 'deriveExecutableSubgraph'>;
  planStore: {
    storePlan: ReturnType<typeof vi.fn>;
    markValid: ReturnType<typeof vi.fn>;
    markInvalid: ReturnType<typeof vi.fn>;
    getValidationRecord: ReturnType<typeof vi.fn>;
  };
  planValidator: { validatePlan: ReturnType<typeof vi.fn> };
  executableSubgraphResolver: { execute: ReturnType<typeof vi.fn> };
  useCase: Pick<PreviewPlanUseCase, 'execute'>;
};

type PreviewRouteTestOverrides = Partial<
  Omit<PreviewRouteTestDeps, 'useCase' | 'planner' | 'planStore' | 'planValidator'>
> & {
  planner?: Partial<PreviewRouteTestDeps['planner']>;
  planStore?: Partial<PreviewRouteTestDeps['planStore']>;
  planValidator?: Partial<PreviewRouteTestDeps['planValidator']>;
  executableSubgraphResolver?: Partial<PreviewRouteTestDeps['executableSubgraphResolver']>;
};

export function createPreviewDeps(
  overrides: PreviewRouteTestOverrides = {}
): PreviewRouteTestDeps {
  const planner = {
    buildPlan: vi.fn(),
    deriveExecutableSubgraph: vi.fn(),
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
  const executableSubgraphResolver = {
    execute: vi.fn(async (input: { selection: { mode: string; nodeIds: readonly string[] } }) => ({
      ok: true as const,
      value: {
        selection: input.selection,
        nodeIds: [...input.selection.nodeIds],
        edgeIds: [],
        executable: true,
        diagnostics: [],
      },
    })),
    ...overrides.executableSubgraphResolver,
  };

  return {
    ...okAuthDeps(),
    ...overrides,
    planner,
    planStore,
    planValidator,
    executableSubgraphResolver,
    useCase: new PreviewPlanUseCase({
      planner,
      planStore,
      planValidator,
      executableSubgraphResolver: executableSubgraphResolver as never,
    }),
  };
}
