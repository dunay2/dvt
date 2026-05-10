/** Owned concern: assemble explicit app-service test doubles outside the product runtime. */
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
    sessionContext,
  };
}
