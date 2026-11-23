/** Exercise placement, independent card settings, restoration and deletion. */
import { openWorkbenchProperties } from '../relationalWorkbench/navigation';

import { CANVAS_ID, PROJECT_ROOT } from './project';

function placeCatalogueResource(resourceId: string, ordinal: number): void {
  cy.get(`[data-element-id="${resourceId}"]`)
    .filter(':visible')
    .should('have.prop', 'draggable', true)
    .then(($row) => {
      cy.get('[data-slot="canvas-viewport-context-surface"] .react-flow').then(($surface) => {
        cy.window().then((window) => {
          const transfer = new window.DataTransfer();
          const bounds = $surface[0]!.getBoundingClientRect();
          const options = {
            bubbles: true,
            cancelable: true,
            dataTransfer: transfer,
            clientX: bounds.left + 220 + ordinal * 90,
            clientY: bounds.top + 180 + ordinal * 70,
          };
          $row[0]!.dispatchEvent(new window.DragEvent('dragstart', options));
          $surface[0]!.dispatchEvent(new window.DragEvent('dragover', options));
          $surface[0]!.dispatchEvent(new window.DragEvent('drop', options));
          $row[0]!.dispatchEvent(new window.DragEvent('dragend', options));
        });
      });
    });
}

type ResourcePlacement = Readonly<{ id: string; resourceId: string }>;
function readSavedPlacements(window: Cypress.AUTWindow): ResourcePlacement[] {
  const persisted = JSON.parse(
    window.localStorage.getItem('dvt-web-canvas-interaction') ?? '{}'
  ) as {
    state?: { canvasLayouts?: Record<string, { resourceInstances?: ResourcePlacement[] }> };
  };
  return Object.entries(persisted.state?.canvasLayouts ?? {})
    .filter(([key]) => key.includes(CANVAS_ID) && key.endsWith(PROJECT_ROOT))
    .flatMap(([, layout]) => layout.resourceInstances ?? []);
}

export function placeProjectReferences(): void {
  cy.get('[data-element-id="model.analytics.orders"]', { timeout: 60_000 }).should(
    'have.prop',
    'draggable',
    true
  );
  cy.get('.react-flow__node')
    .should('have.length.greaterThan', 0)
    .its('length')
    .as('definitionCardCount');
  placeCatalogueResource('source.analytics.raw.orders', 0);
  placeCatalogueResource('source.analytics.raw.orders', 1);
  placeCatalogueResource('model.analytics.orders', 2);
  placeCatalogueResource('model.analytics.orders', 3);
  cy.window().should((window) => {
    expect(readSavedPlacements(window)).to.have.length(4);
  });
  cy.window().then((window) => {
    const placed = readSavedPlacements(window);
    expect(new Set(placed.map((entry) => entry.id)).size).to.equal(4);
    cy.wrap(placed).as('resourceInstances');
  });
  cy.get<number>('@definitionCardCount').then((count) => {
    cy.get('.react-flow__node').should('have.length', count + 4);
  });
}

export function assertIndependentMetrics(): void {
  cy.get<ResourcePlacement[]>('@resourceInstances').then((instances) => {
    const [first, second] = instances.filter(
      (entry) => entry.resourceId === 'model.analytics.orders'
    );
    if (!first || !second) throw new Error('Two placed model references are required.');
    openWorkbenchProperties(first.id);
    cy.get('[data-slot="canvas-card-metrics-switch"]').click();
    cy.get('[data-slot="canvas-node-workbench-close"]').click();
    cy.get(
      `.react-flow__node[data-id="${first.id}"] [data-slot="graph-node-operational-rail"]`
    ).should('exist');
    cy.get(
      `.react-flow__node[data-id="${second.id}"] [data-slot="graph-node-operational-rail"]`
    ).should('not.exist');
    cy.get(
      '.react-flow__node[data-id="model.analytics.orders"] [data-slot="graph-node-operational-rail"]'
    ).should('not.exist');
  });
}

export function inspectAndRemoveRestoredReference(): void {
  cy.get<ResourcePlacement[]>('@resourceInstances').then((instances) => {
    for (const instance of instances)
      cy.get(`.react-flow__node[data-id="${instance.id}"]`, { timeout: 60_000 }).should('exist');
    const instance = instances.find((entry) => entry.resourceId === 'model.analytics.orders')!;
    cy.get(
      `.react-flow__node[data-id="${instance.id}"] [data-slot="graph-node-operational-rail"]`
    ).should('exist');
    cy.get(`.react-flow__node[data-id="${instance.id}"]`)
      .find('[data-slot="graph-node-card-title"]')
      .click();
    cy.get('[data-slot="canvas-node-workbench-overlay"]', { timeout: 20_000 }).should('be.visible');
    cy.get('[data-slot="canvas-node-workbench-tab-code"]').click();
    cy.get('[data-slot="workspace-file-code-editor"]').should(
      'have.attr',
      'data-file-path',
      `${PROJECT_ROOT}/models/orders.sql`
    );
    cy.get('[data-slot="canvas-node-workbench-close"]').click();
    cy.get(`.react-flow__node[data-id="${instance.id}"]`)
      .find('[data-slot="graph-node-card-title"]')
      .rightclick();
    cy.get('[data-slot="canvas-node-context-menu"]')
      .contains('[role="menuitem"]', 'Delete')
      .click();
    cy.get(`.react-flow__node[data-id="${instance.id}"]`).should('not.exist');
    cy.get('.react-flow__node[data-id="model.analytics.orders"]').should('exist');
    for (const sibling of instances.filter((entry) => entry.id !== instance.id))
      cy.get(`.react-flow__node[data-id="${sibling.id}"]`).should('exist');
  });
}

export function assertRemainingReferences(): void {
  cy.get<number>('@definitionCardCount').then((count) => {
    cy.get('.react-flow__node', { timeout: 60_000 }).should('have.length', count + 3);
  });
  cy.window().should((window) => {
    expect(readSavedPlacements(window)).to.have.length(3);
  });
}
