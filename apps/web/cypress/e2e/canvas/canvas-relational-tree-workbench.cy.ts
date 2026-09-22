/** Owned concern: keyboard Model entry and workspace navigation, without authoring scenarios. */
import { visitWorkbenchCanvas } from '../../support/relationalWorkbench/navigation';
import { stubWorkbenchScenario } from '../../support/relationalWorkbench/scenario';

describe('Workbench navigation', () => {
  beforeEach(() => {
    stubWorkbenchScenario('saved-join');
  });
  it('opens and closes the Model by its supported keyboard and workspace controls', () => {
    cy.viewport(1280, 720);
    visitWorkbenchCanvas();

    cy.get('.react-flow__node[data-id="join-transform"] [data-slot="canvas-node-shell"]')
      .should('have.attr', 'aria-keyshortcuts', 'Enter')
      .should('be.visible')
      .focus()
      .should('be.focused')
      .type('{enter}');

    cy.get('[data-slot="canvas-model-view-tab"][data-view="editor"]').should(
      'have.attr',
      'aria-selected',
      'true'
    );
    cy.get('[data-slot="canvas-model-view-tab"]').should('have.length', 3);
    cy.get('[data-slot="bottom-operational-drawer-tab"][data-tab="semantic"]').should('not.exist');
    cy.get('[data-slot="canvas-relational-tree-workbench"]').should('be.visible');
    cy.get('[data-slot="canvas-relational-tree-source"]')
      .should('have.length', 2)
      .each(($source) => {
        cy.wrap($source).should('contain.text', 'Participating');
      });
    cy.get('[data-slot="canvas-relational-tree"]')
      .should('contain.text', 'JOIN')
      .and('contain.text', 'Left input')
      .and('contain.text', 'Right input');
    cy.get('[data-slot="canvas-relational-tree-layout"]')
      .should('have.attr', 'data-layout', 'graph')
      .and('have.attr', 'data-direction', 'left-to-right')
      .find('[data-slot="canvas-relational-tree-children"][data-child-count="2"]')
      .should('exist');
    cy.get('[data-slot="canvas-relational-tree-viewport"]').should('be.visible');
    cy.get('[data-slot="canvas-relational-tree-node"][data-operator="read"]')
      .should('have.length', 2)
      .each(($card) => {
        cy.wrap($card).should('not.contain.text', 'READ');
        cy.wrap($card).find('[data-slot="canvas-relational-node-title"]').should('not.be.empty');
      });
    cy.get('[data-slot="canvas-relational-tree-input-label"][data-role="left"] text')
      .should('be.visible')
      .and('have.text', 'L')
      .and('have.css', 'fill', 'rgb(248, 250, 252)');
    cy.get('[data-slot="canvas-relational-tree-input-label"][data-role="right"] text')
      .should('be.visible')
      .and('have.text', 'R')
      .and('have.css', 'fill', 'rgb(248, 250, 252)');
    cy.get('[data-slot="canvas-model-toolbar"]').should(($toolbar) => {
      expect($toolbar[0]!.getBoundingClientRect().height).to.be.at.most(48);
      expect($toolbar.find('[role="tab"]')).to.have.length(3);
    });
    cy.get('[data-slot="canvas-relational-tree-zoom"]')
      .invoke('text')
      .should('match', /^\d+%$/);
    cy.screenshot('semantic-editor-wide');

    cy.contains('[data-slot="canvas-relational-tree-source"]', 'customers').click();
    cy.get('[data-slot="canvas-relational-tree-detail"]').should('not.exist');
    cy.get('[data-slot="canvas-relational-tree-workbench"] button[aria-label="Zoom out"]').click();
    cy.get(
      '[data-slot="canvas-relational-tree-workbench"] button[aria-label="Fit graph to view"]'
    ).click();
    cy.get('[data-slot="canvas-relational-tree-zoom"]')
      .invoke('text')
      .should('match', /^\d+%$/);
    cy.get('[data-slot="canvas-node-workbench-overlay"]').should('not.exist');
    cy.viewport(1024, 720);
    cy.get('[data-slot="canvas-relational-tree-detail"]').should('not.exist');
    cy.get('[data-slot="canvas-model-view-tab"]').should('have.length', 3);
    cy.screenshot('semantic-editor-compact');
    cy.get('[data-slot="canvas-model-tab-close"]').click();
    cy.get('.react-flow__node[data-id="join-transform"]').should('exist');
  });
});
