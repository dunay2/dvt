/** Owned concern: prove original and reference placements survive save, reopen, drag and removal. */
import { WorkspaceGraphAuthoringDraftSchema } from '@dvt/contracts';

import { openCanvasNodeOperations, clickCanvasContextMenuItem } from './canvasExecutionSelection';
import { dragCanvasNodeByViewportDelta } from './canvasGraphAuthoring';
import { getE2eApiCalls } from './e2eApiStub';
import { revisitWorkbenchCanvas } from './relationalWorkbench/navigation';
import { dragWorkbenchField } from './relationalWorkbench/pointer';
export function assertCreatedModelSaved(nodeId: string): void {
  cy.wrap(null).should(() => {
    const saved = getE2eApiCalls('/workspace/graph/draft', 'PUT').at(-1)?.body as
      { draft: unknown } | undefined;
    expect(saved, 'real model save').not.to.be.undefined;
    const draft = WorkspaceGraphAuthoringDraftSchema.parse(saved!.draft);
    expect(draft.nodes).to.have.length(1);
    expect(draft.nodes[0]).to.include({ id: nodeId, name: 'Model 1', kind: 'transform' });
  });
}

export function reopenAndDragCreatedModel(nodeId: string, projectionGapTitle: string): void {
  cy.get('[data-slot="canvas-draft-save-status"]').should('not.exist');
  revisitWorkbenchCanvas();
  cy.get('.react-flow__node').should('have.length', 1).and('have.attr', 'data-id', nodeId);
  cy.contains(projectionGapTitle).should('not.exist');
  cy.get('[data-slot="canvas-draft-save-status"]').should('not.exist');
  cy.screenshot('canvas-happy-path-before-drag');
  dragCanvasNodeByViewportDelta('Model 1', { x: 110, y: 80 }, { nodeId: nodeId! });
  cy.contains(projectionGapTitle).should('not.exist');
  cy.get('[data-slot="canvas-draft-save-status"]').should('not.exist');
  cy.screenshot('canvas-happy-path-after-drag');
}

export function inspectAndDuplicateModel(nodeId: string): void {
  cy.get('a[data-slot="left-navigation-link"][href="/canvas"]')
    .click()
    .should('have.attr', 'aria-expanded', 'true');
  cy.get(`[data-slot="canvas-explorer"] [data-element-id="${nodeId}"]`)
    .should('be.visible')
    .click();
  cy.get('[data-slot="canvas-node-workbench-tab-general"]').should(
    'have.attr',
    'aria-selected',
    'true'
  );
  cy.get('.react-flow__node').should('have.length', 1);
  cy.get('[data-slot="canvas-node-workbench-close"]').click();
  dragWorkbenchField(
    `[data-slot="canvas-explorer"] [data-element-id="${nodeId}"]`,
    '[data-testid="canvas-viewport"]'
  );
  cy.get('.react-flow__node').should('have.length', 2);
  cy.wrap(null).should(() => {
    const saved = getE2eApiCalls('/workspace/graph/draft', 'PUT').at(-1)?.body as
      { draft: unknown } | undefined;
    const graph = WorkspaceGraphAuthoringDraftSchema.parse(saved?.draft);
    const instance = graph.nodes.find((node) => node.definitionId === nodeId);
    expect(instance, 'independent reference to the original model').to.exist;
    expect(instance!.id).not.to.equal(nodeId);
    expect(instance!.metadata, 'configuration is owned by the definition').to.be.undefined;
    expect(graph.edges, 'creating an instance adds no dependency').to.have.length(0);
  });
}

export function removeDuplicateAndKeepOriginal(nodeId: string): void {
  revisitWorkbenchCanvas();
  cy.get('.react-flow__node').should('have.length', 2);
  cy.get('[data-slot="canvas-draft-save-status"]').should('not.exist');
  openCanvasNodeOperations('Model 1 2');
  clickCanvasContextMenuItem('Delete');
  cy.get('.react-flow__node').should('have.length', 1).and('have.attr', 'data-id', nodeId);
  cy.wrap(null).should(() => {
    const saved = getE2eApiCalls('/workspace/graph/draft', 'PUT').at(-1)?.body as
      { draft: unknown } | undefined;
    const graph = WorkspaceGraphAuthoringDraftSchema.parse(saved?.draft);
    expect(graph.nodeIds).to.deep.equal([nodeId]);
    expect(graph.nodes.map((node) => node.id)).to.deep.equal([nodeId]);
    expect(graph.edges).to.have.length(0);
  });
}
