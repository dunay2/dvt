/** Retained authoring is inspectable, but withdrawn dependencies are never published or previewed. */
import { getE2eApiCalls } from '../../support/e2eApiStub';
import { visitWorkbenchCanvas } from '../../support/relationalWorkbench/navigation';
import { stubWorkbenchScenario } from '../../support/relationalWorkbench/scenario';

describe('Withdrawn Transform inputs', () => {
  it('shows only country as Input/Output and retains the other fields as red non-draggable diagnostics', () => {
    cy.viewport(1600, 1000);
    stubWorkbenchScenario('withdrawn-projection');
    visitWorkbenchCanvas();
    cy.get('.react-flow__node[data-id="transform-customers"] [data-slot="canvas-node-shell"]')
      .should('be.visible')
      .focus()
      .type('{enter}');
    cy.get('[data-slot="canvas-relational-tree-workbench"]').should('be.visible');
    cy.get('[data-operator="project"]').closest('li').as('transform');
    cy.get('@transform').find('[data-slot="canvas-relational-node-expand"]').click();
    cy.get('@transform').should('contain.text', 'Derived: 1');
    cy.get('@transform')
      .find('[data-semantic-node-id*="/output/"]')
      .should('have.length', 1)
      .and('contain.text', 'country');
    cy.get('@transform')
      .find('[data-semantic-node-id*="/input/"][data-kind="field"]')
      .should('have.length', 1)
      .and('contain.text', 'country');
    cy.get('@transform')
      .find('[data-unavailable="true"]')
      .should('have.length', 2)
      .each(($field) => {
        cy.wrap($field).should('have.attr', 'draggable', 'false');
        cy.wrap($field).find('span').last().should('have.css', 'color', 'rgb(239, 68, 68)');
      });
    cy.get('@transform').find('[data-slot="canvas-node-execute"]').should('be.disabled');
    cy.screenshot('withdrawn-input-valid-output-and-red-references');
    cy.then(() => expect(getE2eApiCalls(/\/transforms\/.*\/data-sample/, 'GET')).to.have.length(0));
  });
});
