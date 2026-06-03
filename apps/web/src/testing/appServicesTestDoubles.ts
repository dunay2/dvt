/** Owned concern: assemble explicit app-service test doubles outside the product runtime. */
import type { CostAttributionSummary, ICostAttributionSummaryPort } from '../app/ports/cost';
import type { AppServicesOverrides } from '../app/services/composition/appServices';
import { createSessionContextPort } from '../app/services/session/sessionContextPort';
import { createMockPlansService } from './plansPortDoubles';
import { createMockRunsService } from './runsPortDoubles';
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

export function createAppServicesTestOverrides(
  options: AppServicesTestOverridesOptions = {}
): AppServicesOverrides {
  const sessionContext = createSessionContextPort();
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
  };
}
