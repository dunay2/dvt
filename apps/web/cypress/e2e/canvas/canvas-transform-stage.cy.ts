/** Real editor + stateful draft transport: Transform owns dataset field authoring. */
import { getE2eApiCalls } from '../../support/e2eApiStub';
import { visitWorkbenchCanvas } from '../../support/relationalWorkbench/navigation';
import { stubWorkbenchScenario } from '../../support/relationalWorkbench/scenario';

const inspector = '[data-slot="canvas-transform-inspector"]';
const form = '[data-slot="canvas-derived-output-form"]';
const card = '[data-slot="canvas-relational-tree-node"][data-operator="project"]';

function openModel(): void {
  cy.get('.react-flow__node[data-id="join-transform"] [data-slot="canvas-node-shell"]')
    .should('be.visible')
    .focus()
    .type('{enter}');
  cy.get('[data-slot="canvas-relational-tree-workbench"]').should('be.visible');
}

describe('Semantic dataset Transform', () => {
  it('adds fields in one fixed inspector, persists, and reopens the same Transform', () => {
    cy.viewport(1440, 900);
    stubWorkbenchScenario('saved-join');
    visitWorkbenchCanvas();
    openModel();
    cy.get('[data-slot="canvas-relational-tree-node"][data-operator="read"]').first().click();
    cy.get('[data-slot="canvas-derived-output-trigger"]').should('not.exist');
    cy.get('[data-slot="canvas-operation-menu-trigger"]').click();
    cy.get('[data-operation="field_transform"]')
      .should('have.attr', 'aria-disabled', 'false')
      .click();
    cy.get(inspector)
      .should('be.visible')
      .and(($panel) => {
        const bounds = $panel[0]!.getBoundingClientRect();
        expect(bounds.right).to.be.closeTo(1440, 30);
      });
    cy.get(card).should('have.length', 1);
    cy.get(form).should('not.exist');
    for (const alias of ['normalized_name', 'fallback_name']) {
      cy.get(inspector).find('[data-slot="canvas-derived-output-trigger"]').click();
      cy.get(form).within(() => {
        cy.get('input[name="alias"]').type(alias);
        cy.get('button[type="submit"]').should('be.enabled').click();
      });
      cy.get(form).should('not.exist');
    }
    cy.get(inspector).find('[data-slot="canvas-operation-output-tab"]').click();
    cy.get(inspector).find('input').filter('[value="normalized_name"]').should('exist');
    cy.get(card).should('have.length', 1);
    cy.wrap(null).should(() => {
      const saved = JSON.stringify(getE2eApiCalls('/workspace/graph/draft', 'PUT').at(-1)?.body);
      expect(saved).to.include('normalized_name').and.include('fallback_name');
    });
    visitWorkbenchCanvas();
    openModel();
    cy.get(card).should('have.length', 1).click();
    cy.get(inspector).should('be.visible');
    cy.get(form).should('not.exist');
    cy.get(inspector).find('[data-slot="canvas-operation-output-tab"]').click();
    cy.get(inspector).find('input').filter('[value="fallback_name"]').should('exist');
    cy.screenshot('transform-fixed-output');
    cy.get('[data-slot="canvas-relational-tree-node"][data-operator="join"]').click();
    cy.get('[data-slot="canvas-derived-output-trigger"]').should('not.exist');
  });
});
