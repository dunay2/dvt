/** Prove explicit empty-definition removal through the real UI, save payload and reload. */
import {
  WorkspaceGraphAuthoringDraftSchema,
  WorkspaceGraphDraftSaveRequestSchema,
  parseWorkspaceGraphDraftSaveResponse,
  type WorkspaceGraphAuthoringCanvasWorkspace,
  type WorkspaceGraphAuthoringDraft,
  type WorkspaceGraphAuthoringNode,
} from '@dvt/contracts';

import { normalizeProjectCanvasDraft } from '../../src/app/views/canvas/canvasProjectCanvasLifecycle';

import {
  getE2eApiCalls,
  installE2eApiFetchStub,
  stubE2eJsonApi,
  waitForE2eApiCall,
} from './e2eApiStub';
import { visitWorkbenchCanvas } from './relationalWorkbench/navigation';
import { stubWorkbenchScenario } from './relationalWorkbench/scenario';

export function registerEmptyModelDeletionJourney(): void {
  it('deletes only the selected empty draft and retains its neighbors after reload', () => {
    const scenario = prepareEmptyModelDeletionScenario();
    visitEmptyModelDeletionCanvas(scenario);
    deleteEmptyExplorerModel(scenario);
    assertEmptyModelDeletionPersisted(scenario);
    assertRetainedEmptyModelNeighbors(scenario);
    reloadEmptyModelDeletionCanvas();
    assertRetainedEmptyModelNeighbors(scenario);
  });
}

function prepareEmptyModelDeletionScenario(): {
  target: WorkspaceGraphAuthoringNode;
  neighbor: WorkspaceGraphAuthoringNode;
  sibling: WorkspaceGraphAuthoringCanvasWorkspace;
  configured: WorkspaceGraphAuthoringNode;
  initialDraft: WorkspaceGraphAuthoringDraft;
  saveReceipt?: Promise<{ status: number; payload: unknown }>;
} {
  const draft = stubWorkbenchScenario('generated', { includeLooseNode: true });
  stubE2eJsonApi('GET', '/workspace/files', []);
  const target = draft.nodes.find((node) => node.id === 'orphan-transform-1');
  if (!target) throw new Error('Expected the existing empty Model scenario.');
  target.tags = ['authoring'];
  const neighbor = { ...target, id: 'retained-empty-draft', name: 'Neighbor empty draft' };
  const sibling = {
    canvas: { ...draft.canvas, id: 'retained-canvas', title: 'Retained canvas' },
    nodeIds: [neighbor.id],
    nodePositions: { [neighbor.id]: { x: 0, y: 0 } },
    nodes: [neighbor],
    edges: [],
  };
  const normalized = normalizeProjectCanvasDraft({
    ...draft,
    nodes: [...draft.nodes, neighbor],
    nodeIds: draft.nodeIds.filter((id) => id !== target.id),
    nodePositions: Object.fromEntries(
      Object.entries(draft.nodePositions).filter(([id]) => id !== target.id)
    ),
    canvases: [...(draft.canvases ?? []), sibling],
  });
  Object.assign(
    draft,
    WorkspaceGraphAuthoringDraftSchema.parse(JSON.parse(JSON.stringify(normalized)))
  );
  const configured = draft.nodes.find((node) => node.id === 'dvt-transform-1');
  if (!configured) throw new Error('Expected the existing Substrait Model scenario.');
  return { target, neighbor, sibling, configured, initialDraft: draft };
}

function visitEmptyModelDeletionCanvas(
  scenario: ReturnType<typeof prepareEmptyModelDeletionScenario>
): void {
  cy.viewport(1200, 800);
  visitWorkbenchCanvas();
  cy.get('#shell-canvas-navigation').click();
  cy.get(
    '[data-slot="canvas-explorer-panel"]:visible [data-slot="canvas-explorer-model-count"]'
  ).should('have.text', '4');
  cy.get(
    `[data-slot="canvas-explorer-panel"]:visible [data-element-id="${scenario.target.id}"]`
  ).should('be.visible');
  cy.then(() => expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(0));
  cy.window().then((window) => {
    const fetch = window.fetch.bind(window);
    window.fetch = (...args) => {
      const pending = fetch(...args);
      if (args[1]?.method === 'PUT' && String(args[0]).includes('/workspace/graph/draft')) {
        scenario.saveReceipt = pending.then(async (response) => ({
          status: response.status,
          payload: await response.clone().json(),
        }));
      }
      return pending;
    };
  });
}

function deleteEmptyExplorerModel(
  scenario: ReturnType<typeof prepareEmptyModelDeletionScenario>
): void {
  cy.get(`[data-slot="canvas-explorer-panel"]:visible [data-model-id="${scenario.target.id}"]`)
    .find('[data-slot="canvas-explorer-remove-empty-model"]')
    .should('have.attr', 'aria-label', `Delete empty draft: ${scenario.target.name}`)
    .and('be.visible')
    .and('be.enabled')
    .focus()
    .click();
  waitForE2eApiCall('/workspace/graph/draft', 'PUT');
  cy.then(() => {
    if (scenario.saveReceipt == null) throw new Error('Expected the actual draft save response.');
    return scenario.saveReceipt;
  }).then((response) => {
    expect(response.status).to.equal(200);
    const receipt = parseWorkspaceGraphDraftSaveResponse(response.payload);
    expect(receipt).to.include({ kind: 'saved', revision: 'rev-e2e-graph-ready-1' });
    const request = WorkspaceGraphDraftSaveRequestSchema.parse(
      getE2eApiCalls('/workspace/graph/draft', 'PUT')[0]!.body
    );
    expect(receipt.capability.scope).to.deep.equal(request.scope);
  });
}

function assertEmptyModelDeletionPersisted(
  scenario: ReturnType<typeof prepareEmptyModelDeletionScenario>
): void {
  cy.then(() => {
    const writes = getE2eApiCalls('/workspace/graph/draft', 'PUT');
    expect(writes).to.have.length(1);
    const { draft, expectedRevision, idempotencyKey } = WorkspaceGraphDraftSaveRequestSchema.parse(
      writes[0]!.body
    );
    expect(expectedRevision).to.equal('rev-e2e-graph-ready');
    expect(idempotencyKey).to.be.a('string').and.not.be.empty;
    expect(draft.nodes.map((node) => node.id)).not.to.include(scenario.target.id);
    expect(draft.nodeIds).not.to.include(scenario.target.id);
    expect(draft.nodePositions).not.to.have.property(scenario.target.id);
    expect(draft.nodes.find((node) => node.id === scenario.neighbor.id)).to.deep.equal(
      scenario.initialDraft.nodes.find((node) => node.id === scenario.neighbor.id)
    );
    expect(draft.nodes.find((node) => node.id === scenario.configured.id)).to.deep.equal(
      scenario.configured
    );
    expect(
      draft.canvases?.find((canvas) => canvas.canvas.id === scenario.sibling.canvas.id)
    ).to.deep.equal(
      scenario.initialDraft.canvases?.find(
        (canvas) => canvas.canvas.id === scenario.sibling.canvas.id
      )
    );
    for (const canvas of draft.canvases ?? [])
      expect(canvas.nodes.map((node) => node.id)).not.to.include(scenario.target.id);
  });
}

function reloadEmptyModelDeletionCanvas(): void {
  cy.on('window:before:load', installE2eApiFetchStub);
  cy.reload();
  waitForE2eApiCall('/workspace/graph/draft', 'GET');
  cy.get('#app-loading-screen').should('not.exist');
}

function assertRetainedEmptyModelNeighbors(
  scenario: ReturnType<typeof prepareEmptyModelDeletionScenario>
): void {
  cy.get(
    '[data-slot="canvas-explorer-panel"]:visible [data-slot="canvas-explorer-model-count"]'
  ).should('have.text', '3');
  cy.get(
    `[data-slot="canvas-explorer-panel"]:visible [data-element-id="${scenario.target.id}"]`
  ).should('not.exist');
  cy.get(
    `[data-slot="canvas-explorer-panel"]:visible [data-element-id="${scenario.neighbor.id}"]`
  ).should('be.visible');
  cy.get(
    `[data-slot="canvas-explorer-panel"]:visible [data-element-id="${scenario.configured.id}"]`
  ).should('be.visible');
  cy.then(() => expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(1));
}
