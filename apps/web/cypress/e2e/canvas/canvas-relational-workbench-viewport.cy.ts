/** Owned concern: zoom and source-rail layout preserve the draft, search and graph fit. */
import {
  verifyWheelZoom,
  revealCardDetails,
  verifyCompleteTreeFit,
} from '../../support/relationalWorkbench/geometry';
import {
  visitWorkbenchCanvas,
  openWorkbenchModel,
} from '../../support/relationalWorkbench/navigation';
import { semanticWrites } from '../../support/relationalWorkbench/persistence';
import { stubWorkbenchScenario } from '../../support/relationalWorkbench/scenario';

describe('Workbench viewport', () => {
  beforeEach(() => {
    stubWorkbenchScenario(
      'saved-join',
      'Customer orders with a deliberately long workspace name for reflow'
    );
  });
  it('keeps zoom and source search while expanding and collapsing the rail', () => {
    let writesBeforeZoom = 0;
    cy.viewport(1280, 720);
    visitWorkbenchCanvas();
    openWorkbenchModel();
    verifyWheelZoom('[data-slot="canvas-relational-tree-viewport"]');
    cy.then(() => {
      writesBeforeZoom = semanticWrites('join-transform').length;
    });
    revealCardDetails(1);
    cy.get('[data-slot="canvas-relational-tree-detail"]').should('not.exist');
    cy.get('[data-slot="canvas-relational-card-detail"]')
      .scrollIntoView()
      .should('contain.text', 'EQUAL');
    cy.screenshot('semantic-editor-card-expressions');
    cy.then(() => expect(semanticWrites('join-transform')).to.have.length(writesBeforeZoom));
    verifyCompleteTreeFit('[data-slot="canvas-relational-tree-viewport"]');
    cy.get('[data-slot="canvas-relational-card-detail"]').should('have.length', 1);
    cy.get('[data-slot="canvas-relational-tree-sources"] input').type('customers');
    cy.get('[data-slot="canvas-relational-tree-zoom"]')
      .invoke('text')
      .then((zoom) => {
        cy.get('[data-slot="canvas-relational-tree-viewport"]').then(($viewport) => {
          const width = $viewport[0].clientWidth;
          cy.get('[data-slot="canvas-relational-tree-sources-toggle"]')
            .click()
            .should('have.attr', 'aria-expanded', 'false');
          cy.get('[data-slot="canvas-relational-tree-viewport"]').should(($next) => {
            expect($next[0].clientWidth).to.be.greaterThan(width);
          });
        });
        cy.get('[data-slot="canvas-relational-tree-zoom"]').should('have.text', zoom);
      });
    cy.get('[data-slot="canvas-relational-tree-source-list"]').should('not.be.visible');
    verifyCompleteTreeFit('[data-slot="canvas-relational-tree-viewport"]');
    cy.screenshot('semantic-editor-sources-collapsed');
    cy.get('[data-slot="canvas-relational-tree-sources-toggle"]')
      .focus()
      .type('{enter}')
      .should('have.attr', 'aria-expanded', 'true');
    cy.get('[data-slot="canvas-relational-tree-sources"] input')
      .should('have.value', 'customers')
      .clear();
    cy.get('[data-slot="canvas-relational-tree-detail"]').should('not.exist');
    // 1280x900 at 200% browser zoom has a 640x450 CSS viewport; this tests reflow,
    // independently of the graph's own zoom control.
    cy.viewport(640, 450);
    cy.get('[data-slot="shell-active-canvas-identity"]').should(($identity) => {
      const bounds = $identity[0]!.getBoundingClientRect();
      $identity.find('[role="tab"], [data-slot="canvas-model-tab-close"]').each((_, control) => {
        const tab = control.getBoundingClientRect();
        expect(tab.left).to.be.at.least(bounds.left);
        expect(tab.right).to.be.at.most(bounds.right);
      });
    });
    cy.get('[data-slot="canvas-relational-tree-node"][data-operator="join"]').click();
    cy.get('[data-canvas-inspector="true"]:visible').should(($panel) => {
      const bounds = $panel[0]!.getBoundingClientRect();
      expect(bounds.left).to.be.at.least(0);
      expect(bounds.right).to.be.at.most(640);
      expect(bounds.bottom).to.be.at.most(450);
    });
    cy.get('[data-slot="canvas-relational-collapse"]').should('be.visible').click();
    cy.get('[data-slot="canvas-model-toolbar"]').should(($footer) => {
      expect($footer[0]!.getBoundingClientRect().bottom).to.be.at.most(450);
    });
    cy.screenshot('semantic-editor-200-percent-equivalent-reflow');
  });
});
