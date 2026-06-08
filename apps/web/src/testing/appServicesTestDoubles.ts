/** Owned concern: assemble explicit app-service test doubles outside the product runtime. */
import type { CostAttributionSummary, ICostAttributionSummaryPort } from '../app/ports/cost';
import type { WorkspaceScopeSelectionPort } from '../app/ports/workspaceScopeSelection';
import type { AppServicesOverrides } from '../app/services/composition/appServices';
import { createMockPlansService } from './plansPortDoubles';
import { createMockRunsService, createMockSessionContextPort } from './runsPortDoubles';
import { createMockWorkspaceGraphDraftAuthoringPort } from './workspaceGraphDraftAuthoringPortDoubles';
import {
  createMockWorkspacePorts,
  createMockWorkspaceState,
  type MockWorkspaceState,
} from './workspacePortDoubles';

export type AppServicesTestOverridesOptions = {
  readonly workspaceState?: MockWorkspaceState;
};

export function createMockCostAttributionSummaryPort(
  summary?: CostAttributionSummary
): ICostAttributionSummaryPort {
  return {
    getCostAttributionSummary: async () =>
      summary ?? {
        tenantId: 'tenant-1',
        projectId: 'project-1',
        environmentId: 'env-1',
        runCount: 0,
        completedStepCount: 0,
        failedStepCount: 0,
        totalStepDurationMs: 0,
        totalCostAmount: null,
        currency: null,
        costCaptureStatus: 'unavailable',
        observedWindow: { firstEventAt: null, lastEventAt: null },
        runs: [],
        steps: [],
        nextCursor: null,
      },
  };
}

export function createMockWorkspaceScopeSelectionPort(): WorkspaceScopeSelectionPort {
  return {
    getSelection: () => ({
      selectedScope: {
        tenantId: 'tenant-1',
        projectId: 'project-1',
        environmentId: 'env-1',
      },
      availableScopes: [],
      targetAdapter: 'temporal',
      availableTargetAdapters: ['temporal'],
      status: 'selected',
    }),
    selectWorkspaceScope: (selectedScope) => ({
      status: 'selected',
      selectedScope,
    }),
    subscribeSelection: () => () => undefined,
  };
}

export function createAppServicesTestOverrides(
  options: AppServicesTestOverridesOptions = {}
): AppServicesOverrides {
  const sessionContext = createMockSessionContextPort();
  const workspaceState = options.workspaceState ?? createMockWorkspaceState();
  const workspacePorts = createMockWorkspacePorts(workspaceState);

  return {
    ...workspacePorts,
    workspaceGraphDraftAuthoringPort: createMockWorkspaceGraphDraftAuthoringPort({
      draftStoreKey: workspacePorts,
      sessionContext,
    }),
    plansService: createMockPlansService(),
    runsService: createMockRunsService(sessionContext),
    costAttributionSummaryPort: createMockCostAttributionSummaryPort(),
    sessionContext,
    workspaceScopeSelection: createMockWorkspaceScopeSelectionPort(),
  };
}
