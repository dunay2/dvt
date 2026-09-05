/**
 * Owned concern: prove Canvas graph search and filtering against the live
 * protected runtime without intercepting or directly seeding the graph draft.
 */
import {
  clickCanvasAddCatalogAction,
  clickCanvasContextMenuAction,
  openCanvasContextMenuAt,
} from '../../support/canvasExecutionSelection';
import {
  hasLiveProtectedRuntimeEnv,
  readLiveGraphDraft,
  resolveLiveWorkspaceSession,
  visitWithLiveWorkspaceSession,
} from '../../support/liveProtectedRuntime';

type DraftSnapshot = Readonly<{
  revision: string;
  nodeIds: readonly string[];
}>;

function addDbtNode(registrationKind: 'dvt:transform' | 'dbt:seed', x: number, y: number): void {
  openCanvasContextMenuAt(x, y);
  clickCanvasContextMenuAction('open-add-node-catalog');
  clickCanvasAddCatalogAction('create-node', registrationKind);
}

function waitForDraftNodeCount(
  expectedCount: number,
  attemptsRemaining = 40
): Cypress.Chainable<DraftSnapshot> {
  return readLiveGraphDraft(resolveLiveWorkspaceSession(), { failOnStatusCode: false }).then(
    (response) => {
      if (response.status === 200) {
        const body = response.body as {
          kind: string;
          record: { revision: string; draft: { nodeIds: string[] } };
        };
        if (body.kind === 'ok' && body.record.draft.nodeIds.length === expectedCount) {
          return {
            revision: body.record.revision,
            nodeIds: [...body.record.draft.nodeIds].sort(),
          };
        }
      }

      if (attemptsRemaining <= 0) {
        throw new Error(
          `Timed out waiting for ${expectedCount} persisted Canvas nodes. ` +
            `Last response: ${JSON.stringify(response.body)}`
        );
      }

      return cy.wait(250).then(() => waitForDraftNodeCount(expectedCount, attemptsRemaining - 1));
    }
  );
}

function openGraphSearch(): Cypress.Chainable<JQuery<HTMLInputElement>> {
  cy.get('[data-slot="canvas-viewport-context-surface"]')
    .focus()
    .trigger('keydown', { key: 'f', ctrlKey: true });

  return cy
    .get<HTMLInputElement>('[data-slot="canvas-graph-search-control"] input[type="search"]')
    .should('be.focused');
}

function openGraphFilters(): Cypress.Chainable<JQuery<HTMLElement>> {
  cy.get('button[aria-label="Filter graph"], button[aria-label="Filtrar grafo"]')
    .should('be.visible')
    .click();
  return cy.get('[data-slot="canvas-graph-filter-control"]').should('be.visible');
}

describe('Canvas graph search and filtering live protected runtime', () => {
  beforeEach(function () {
    if (!hasLiveProtectedRuntimeEnv()) {
      this.skip();
    }
  });

  it('authors, searches, navigates, filters, and clears without mutating the draft', () => {
    visitWithLiveWorkspaceSession('/canvas');

    cy.contains('Create canvas', { timeout: 20_000 }).should('be.visible');
    cy.get('[data-slot="canvas-playground-empty-state"]')
      .contains('button', 'dbt canvas')
      .should('be.enabled')
      .click();
    cy.get('[data-slot="canvas-viewport"]').should('be.visible');
    cy.get('[data-slot="canvas-empty-state"]').should('not.exist');

    addDbtNode('dvt:transform', 320, 250);
    cy.contains('[data-slot="graph-node-card-title"]', 'Model 1')
      .should('be.visible')
      .and('have.text', 'Model 1');
    addDbtNode('dvt:transform', 620, 250);
    cy.contains('[data-slot="graph-node-card-title"]', 'Model 2').should('be.visible');
    addDbtNode('dbt:seed', 900, 250);
    cy.contains('[data-slot="graph-node-card-title"]', 'Seed 1').should('be.visible');

    waitForDraftNodeCount(3).as('draftBeforeReadOnlyQueries');

    openGraphSearch().type('Model');
    cy.get('[data-slot="canvas-graph-search-control"] output').should('have.text', '1 / 2');
    cy.get('.react-flow__node.canvas-graph-search-active-node').should('contain.text', 'Model 1');

    cy.get('[data-slot="canvas-graph-search-control"] input[type="search"]').type('{enter}');
    cy.get('[data-slot="canvas-graph-search-control"] output').should('have.text', '2 / 2');
    cy.get('.react-flow__node.canvas-graph-search-active-node').should('contain.text', 'Model 2');
    cy.get('[data-slot="canvas-graph-search-control"] input[type="search"]').type('{shift}{enter}');
    cy.get('.react-flow__node.canvas-graph-search-active-node').should('contain.text', 'Model 1');

    openGraphFilters().within(() => {
      cy.get('select').eq(0).select('role');
      cy.get('select').eq(1).select('transform');
      cy.get('button[aria-label="Add filter"], button[aria-label="Anadir filtro"]').click();
      cy.contains('2 of 3 nodes visible').should('be.visible');
      cy.contains('button', /^(Hide|Ocultar)$/).click();
    });
    cy.get('.react-flow__node').should('have.length', 2);
    cy.get('[data-slot="canvas-graph-search-control"] output').should('have.text', '1 / 2');

    cy.get('[data-slot="canvas-graph-filter-control"]')
      .find(
        'button[aria-label="Clear graph filters"], button[aria-label="Limpiar filtros del grafo"]'
      )
      .click();
    cy.get('.react-flow__node').should('have.length', 3);
    cy.get('[data-slot="canvas-graph-search-control"] input[type="search"]').type('{esc}');
    cy.get('[data-slot="canvas-graph-search-control"]').should('not.exist');

    cy.get<DraftSnapshot>('@draftBeforeReadOnlyQueries').then((before) => {
      waitForDraftNodeCount(3).then((after) => {
        expect(after).to.deep.equal(before);
      });
    });
  });
});
