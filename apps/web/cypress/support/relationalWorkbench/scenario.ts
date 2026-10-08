/** Owned concern: explicitly prepare the real Canvas UI with controlled API scenarios. */
import type { WorkspaceGraphAuthoringDraft } from '@dvt/contracts';

import { projectWorkspaceGraphAuthoringDraftSemanticGraph } from '../../../src/app/services/workspace/workspaceGraphDraftProjection';
import { projectCanonicalNodeToAuthoringNode } from '../../../src/app/views/canvas/canvasDraftAuthoring';
import { normalizeProjectCanvasDraft } from '../../../src/app/views/canvas/canvasProjectCanvasLifecycle';
import { stubStatefulCanvasDraftAuthoring } from '../canvasDraftAuthoring';
import { stubE2eJsonApi } from '../e2eApiStub';
import { E2E_PROJECT_WORKSPACE, stubShellBootstrapApis } from '../workspaceSession';

export function stubWorkbenchScenario(
  scenario:
    | 'saved-join'
    | 'generated'
    | 'pending-join'
    | 'partial-join'
    | 'pending-chain'
    | 'pending-set'
    | 'projection'
    | 'withdrawn-projection'
): WorkspaceGraphAuthoringDraft {
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
  const draft = stubStatefulCanvasDraftAuthoring({
    authoringGenerated: scenario === 'generated',
    projectionModel: scenario === 'projection' || scenario === 'withdrawn-projection',
    ...(scenario === 'withdrawn-projection' ? { projectionInputFields: ['country'] } : {}),
    substraitInnerJoin: scenario === 'saved-join',
    substraitNInputJoin: scenario === 'partial-join' || scenario === 'pending-chain',
    substraitPendingComposition: scenario === 'pending-join' || scenario === 'pending-chain',
    substraitUnionAll: scenario === 'pending-set',
    title: 'Relational tree Workbench',
  });
  const { canonicalNodes } = projectWorkspaceGraphAuthoringDraftSemanticGraph(draft);
  // Normalize the captured GET seed, without manufacturing a persistence command.
  Object.assign(
    draft,
    normalizeProjectCanvasDraft({
      ...draft,
      nodes: canonicalNodes.map(projectCanonicalNodeToAuthoringNode),
    })
  );
  return draft;
}
