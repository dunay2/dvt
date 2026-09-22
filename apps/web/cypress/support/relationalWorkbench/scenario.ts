/** Owned concern: explicitly prepare the real Canvas UI with controlled API scenarios. */
import { stubStatefulCanvasDraftAuthoring } from '../canvasDraftAuthoring';
import { stubE2eJsonApi } from '../e2eApiStub';
import { E2E_PROJECT_WORKSPACE, stubShellBootstrapApis } from '../workspaceSession';

export function stubWorkbenchScenario(
  scenario: 'saved-join' | 'pending-join' | 'partial-join' | 'pending-chain' | 'pending-set'
): void {
  stubShellBootstrapApis({ scopes: ['workspace:graph-draft:view', 'workspace:graph-draft:save'] });
  stubE2eJsonApi('GET', '/workspace/context', {
    defaultWorkspace: E2E_PROJECT_WORKSPACE,
    availableWorkspaces: [E2E_PROJECT_WORKSPACE],
  });
  stubE2eJsonApi('GET', '/capabilities', {
    apiVersion: '1.0.0',
    minFrontendVersion: '0.0.1',
    plugins: { dvt: { available: true } },
  });
  stubStatefulCanvasDraftAuthoring({
    substraitInnerJoin: scenario === 'saved-join',
    substraitNInputJoin: scenario === 'partial-join' || scenario === 'pending-chain',
    substraitPendingComposition: scenario === 'pending-join' || scenario === 'pending-chain',
    substraitUnionAll: scenario === 'pending-set',
    title: 'Relational tree Workbench',
  });
}
