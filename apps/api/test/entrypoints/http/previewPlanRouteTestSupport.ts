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
    getPlanRecordByRef: ReturnType<typeof vi.fn>;
  };
  planValidator: { materializeAndValidatePlan: ReturnType<typeof vi.fn> };
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
  let validationState: 'PENDING_VALIDATION' | 'VALID' | 'INVALID' = 'PENDING_VALIDATION';
  let rejectionReport: unknown;
  const planStore = {
    storePlanArtifact: vi.fn(),
    markStoredPlanArtifactValid: vi.fn(async () => {
      validationState = 'VALID';
    }),
    markStoredPlanArtifactInvalid: vi.fn(async (input: { report: unknown }) => {
      validationState = 'INVALID';
      rejectionReport = input.report;
    }),
    getStoredPlanValidationRecord: vi.fn(async (input: { planId: string }) => ({
      planId: input.planId,
      state: validationState,
      storedAtIso: '2026-05-26T00:00:00.000Z',
      updatedAtIso: '2026-05-26T00:00:00.000Z',
      ...(rejectionReport === undefined ? {} : { rejectionReport }),
    })),
    getPlanRecordByRef: vi.fn(async (input: { planRef: { planId: string; uri: string } }) => ({
      tenantId: 'tenant-1',
      projectId: 'project-1',
      environmentId: 'env-1',
      planId: input.planRef.planId,
      canonicalPlanJson: '{}',
      canonicalHash: 'c'.repeat(64),
      planVersion: '1.0',
      schemaVersion: '1.0',
      contractVersion: '1.0.0',
      sourceRef: input.planRef.uri,
      createdAtIso: '2026-05-26T00:00:00.000Z',
      updatedAtIso: '2026-05-26T00:00:00.000Z',
      state: 'ACTIVE' as const,
    })),
    ...overrides.planStore,
  };
  const planValidator = {
    materializeAndValidatePlan: vi.fn(async (input: { planRef: { planId: string } }) => {
      const buildResult = await (planner.buildPlan as ReturnType<typeof vi.fn>).mock.results.at(-1)
        ?.value;
      return {
        accepted: true as const,
        materialized: {
          plan: buildResult.plan,
          executionPolicy: buildResult.executionPolicy,
        },
        validation: {
          status: 'OK' as const,
          planId: input.planRef.planId,
          adapterId: 'temporal',
        },
      };
    }),
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
