/** Owned concern: prove minimap focus through the shared Canvas and live protected API. */
import {
  clickCanvasAddCatalogAction,
  clickCanvasContextMenuAction,
  openCanvasContextMenuAt,
} from '../../support/canvasExecutionSelection';
import { skipWhenFirstAuthoringLiveEnvIsMissing } from '../../support/canvasFirstAuthoring';
import {
  readLiveGraphDraft,
  resolveLiveWorkspaceSession,
  visitWithLiveWorkspaceSession,
} from '../../support/liveProtectedRuntime';

function createModel(x: number, y: number): void {
  openCanvasContextMenuAt(x, y);
  clickCanvasContextMenuAction('open-add-node-catalog');
  clickCanvasAddCatalogAction('create-node', 'dvt:transform');
}

function waitForSavedNodes(attempts = 40): Cypress.Chainable<unknown> {
  return readLiveGraphDraft(resolveLiveWorkspaceSession(), { failOnStatusCode: false }).then(
    (response) => {
      const body = response.body as {
        record?: { revision: string; draft: { nodeIds: string[] } };
      };
      if (response.status === 200 && body.record?.draft.nodeIds.length === 2) {
        return body.record;
      }
      if (attempts === 0) throw new Error('The two Canvas nodes were not persisted');
      return cy.wait(250).then(() => waitForSavedNodes(attempts - 1));
    }
  );
}

function assertNodeCentered(nodeId: string): void {
  cy.get('[data-testid="canvas-viewport"]').then(($viewport) => {
    const viewport = $viewport[0]!.getBoundingClientRect();
    cy.get('.react-flow__node[data-id="' + nodeId + '"]')
      .should('be.visible')
      .and('have.class', 'selected')
      .should(($node) => {
        const node = $node[0]!.getBoundingClientRect();
        expect(
          Math.abs(node.left + node.width / 2 - viewport.left - viewport.width / 2)
        ).to.be.lessThan(12);
        expect(
          Math.abs(node.top + node.height / 2 - viewport.top - viewport.height / 2)
        ).to.be.lessThan(12);
      });
  });
}

describe('Canvas minimap node focus live', () => {
  beforeEach(function () {
    skipWhenFirstAuthoringLiveEnvIsMissing(this);
  });

  it('centers distant nodes without changing their positions or the saved graph', () => {
    cy.viewport(1440, 900);
    readLiveGraphDraft(resolveLiveWorkspaceSession(), { failOnStatusCode: false })
      .its('status')
      .should('eq', 404);
    visitWithLiveWorkspaceSession('/canvas');
    cy.get('[data-slot="canvas-playground-template-choice"]', { timeout: 20_000 })
      .should('have.length', 1)
      .should('be.enabled')
      .click();
    cy.get('[data-testid="canvas-viewport"]').should('be.visible');
    createModel(200, 280);
    cy.get('.react-flow__node').should('have.length', 1);
    for (let index = 0; index < 5; index += 1) {
      cy.get('.react-flow__controls-zoomout').click();
    }
    createModel(1120, 430);
    cy.get('.react-flow__node').should('have.length', 2);
    cy.get('.react-flow__minimap-node').should('have.length', 2);
    waitForSavedNodes().as('savedGraph');

    cy.get('.react-flow__node').then(($nodes) => {
      const nodes = [...$nodes].map((node) => ({
        id: node.getAttribute('data-id')!,
        position: node.style.transform,
        title: node.querySelector('[data-slot="graph-node-card-title"]')!.textContent!,
      }));
      cy.get('.react-flow__minimap-node').then(($shapes) => {
        const distance = Math.abs(
          Number($shapes[1]!.getAttribute('x')) - Number($shapes[0]!.getAttribute('x'))
        );
        expect(distance, 'distance between canonical node positions').to.be.greaterThan(1000);
      });

      cy.get('.react-flow__minimap-node').eq(1).click();
      assertNodeCentered(nodes[1]!.id);
      cy.screenshot('minimap-target-centered', { capture: 'fullPage' });
      cy.get('.react-flow__minimap-node').eq(0).click();
      assertNodeCentered(nodes[0]!.id);

      cy.get('[data-slot="canvas-viewport-context-surface"]')
        .focus()
        .trigger('keydown', { key: 'f', ctrlKey: true });
      cy.get('[data-slot="canvas-graph-search-control"] input[type="search"]')
        .should('be.focused')
        .type(nodes[1]!.title);
      assertNodeCentered(nodes[1]!.id);
      cy.get('[data-slot="canvas-graph-search-control"] input[type="search"]').type('{esc}');

      cy.get('.react-flow__viewport')
        .invoke('attr', 'style')
        .then((before) => {
          cy.get('.react-flow__minimap svg').then(($svg) => {
            const bounds = $svg[0]!.getBoundingClientRect();
            cy.window().then((window) => {
              const start = { clientX: bounds.left + 12, clientY: bounds.top + 12 };
              const end = { clientX: start.clientX + 24, clientY: start.clientY + 12 };
              $svg[0]!.dispatchEvent(
                new window.MouseEvent('mousedown', {
                  ...start,
                  button: 0,
                  buttons: 1,
                  bubbles: true,
                  view: window,
                })
              );
              window.dispatchEvent(
                new window.MouseEvent('mousemove', {
                  ...end,
                  button: 0,
                  buttons: 1,
                  bubbles: true,
                  view: window,
                })
              );
              window.dispatchEvent(
                new window.MouseEvent('mouseup', {
                  ...end,
                  button: 0,
                  buttons: 0,
                  bubbles: true,
                  view: window,
                })
              );
            });
          });
          cy.get('.react-flow__viewport').should('not.have.attr', 'style', before);
        });
      for (const node of nodes) {
        cy.get('.react-flow__node[data-id="' + node.id + '"]').should(($node) =>
          expect($node[0]!.style.transform).to.equal(node.position)
        );
      }
    });
    cy.get('@savedGraph').then((before) => {
      waitForSavedNodes().should('deep.equal', before);
    });
  });
});
