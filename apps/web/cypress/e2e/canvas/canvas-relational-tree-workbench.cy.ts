/** Owned concern: keyboard Model entry and workspace navigation, without authoring scenarios. */
import { getE2eApiCalls } from '../../support/e2eApiStub';
import { visitWorkbenchCanvas } from '../../support/relationalWorkbench/navigation';
import { stubWorkbenchScenario } from '../../support/relationalWorkbench/scenario';

describe('Workbench navigation', () => {
  beforeEach(() => {
    stubWorkbenchScenario('saved-join');
  });
  it('opens a fixed source inspector on click without replacing the Canvas or requesting rows', () => {
    cy.viewport(1280, 720);
    visitWorkbenchCanvas();
    // Wait for the fixture's initial fit (capped at 82%), not an arbitrary delay.
    cy.get('.react-flow__viewport')
      .should(($viewport) => {
        expect($viewport[0]!.style.transform).to.contain('scale(0.82)');
      })
      .then(($viewport) => {
        const viewport = $viewport[0]!;
        const transform = viewport.getAttribute('style');
        cy.get('.react-flow__node [data-slot="canvas-node-shell"]').first().click(40, 18);
        cy.get('[data-slot="canvas-node-workbench-overlay"]')
          .should('be.visible')
          .and(($panel) => {
            expect($panel[0]!.tagName).to.equal('ASIDE');
            const bounds = $panel[0]!.getBoundingClientRect();
            expect(bounds.right).to.be.closeTo(1280, 30);
            expect(bounds.width).to.be.at.most(450);
          });
        cy.get('[data-slot="canvas-node-workbench-tab-columns"]').should(
          'have.attr',
          'aria-selected',
          'true'
        );
        cy.get('[data-slot="canvas-node-workbench-drag-handle"]').should('not.exist');
        cy.get('.react-flow__viewport').should(($current) => {
          expect($current[0]).to.equal(viewport);
          expect($current.attr('style')).to.equal(transform);
        });
        cy.get('[data-slot="canvas-node-workbench-close"]').click();
        cy.get('[data-slot="canvas-node-workbench-overlay"]').should('not.exist');
        cy.get('.react-flow__viewport').should(($current) =>
          expect($current[0]).to.equal(viewport)
        );
      });
    cy.then(() => {
      const calls = getE2eApiCalls(/.*/);
      expect(calls.filter((call) => call.method === 'PUT')).to.have.length(0);
      expect(calls.filter((call) => /sample|preview/.test(call.url.pathname))).to.have.length(0);
    });
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

    cy.get('[data-slot="canvas-model-main-tab"]').should('have.attr', 'aria-selected', 'true');
    cy.get('[data-slot="canvas-model-view-tab"]').should('not.exist');
    cy.get('[data-slot="bottom-operational-drawer-tab"][data-tab="semantic"]').should('not.exist');
    cy.get('[data-slot="canvas-relational-tree-workbench"]').should('be.visible');
    cy.get('[data-slot="canvas-relational-tree-source"]')
      .should('have.length', 2)
      .each(($source) => {
        cy.wrap($source).should('contain.text', 'Participating');
      });
    cy.get('[data-slot="canvas-relational-tree"]').should('contain.text', 'JOIN');
    cy.get('[data-slot="canvas-relational-tree-layout"]')
      .should('have.attr', 'data-layout', 'graph')
      .and('have.attr', 'data-direction', 'left-to-right');
    cy.get('[data-slot="canvas-relational-tree-viewport"]').should('be.visible');
    cy.get('[data-slot="canvas-relational-tree-node"][data-operator="read"]')
      .should('have.length', 2)
      .each(($card) => {
        cy.wrap($card).should('not.contain.text', 'READ');
        cy.wrap($card).find('[data-slot="canvas-relational-node-title"]').should('not.be.empty');
      });
    cy.get('[data-slot="canvas-relational-tree-input-label"][data-role="left"] text')
      .should('be.visible')
      .and('have.text', 'L');
    cy.get('[data-slot="canvas-relational-tree-input-label"][data-role="right"] text')
      .should('be.visible')
      .and('have.text', 'R');
    cy.get('[data-slot="canvas-model-toolbar"]').should(($toolbar) => {
      expect($toolbar[0]!.getBoundingClientRect().height).to.be.at.most(48);
      expect($toolbar.find('[role="tab"], button')).to.have.length(0);
    });
    cy.get('[data-slot="canvas-model-editor"]').should(($editor) => {
      const footer = $editor.find('[data-slot="canvas-model-toolbar"]')[0]!;
      const viewport = $editor.find('[data-slot="canvas-relational-tree-viewport"]')[0]!;
      expect(footer.tagName).to.equal('FOOTER');
      expect(footer.getBoundingClientRect().top).to.be.at.least(
        viewport.getBoundingClientRect().bottom
      );
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
    cy.get('[data-slot="canvas-model-view-tab"]').should('not.exist');
    cy.screenshot('semantic-editor-compact');
    cy.get('[data-slot="canvas-model-tab-close"]').click();
    cy.get('.react-flow__node[data-id="join-transform"]').should('exist');
  });
});
