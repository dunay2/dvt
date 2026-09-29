/** Real staged-to-staged field drag and persisted Transform chain. */
import { getE2eApiCalls } from '../../support/e2eApiStub';
import {
  openWorkbenchModel,
  visitWorkbenchCanvas,
} from '../../support/relationalWorkbench/navigation';
import { dragWorkbenchField } from '../../support/relationalWorkbench/pointer';
import { stubWorkbenchScenario } from '../../support/relationalWorkbench/scenario';

const card = '[data-slot="canvas-relational-tree-node"][data-operator="project"]';

describe('Staged Transform field chain', () => {
  it('drags one staged Transform result into a second Transform and reopens the chain', () => {
    cy.viewport(1280, 720);
    stubWorkbenchScenario('saved-join');
    visitWorkbenchCanvas();
    openWorkbenchModel();
    cy.get('[data-slot="canvas-relational-output-input-port"]').focus().type('{del}');
    cy.get('[data-slot="canvas-operation-menu-trigger"]').click();
    cy.get('[data-operation="field_transform"]').click();
    cy.get('[data-operator="join"]')
      .closest('li')
      .find('[data-slot="canvas-relational-node-expand"]')
      .click();
    cy.get('[data-slot="canvas-relational-tree-fit"]').click();
    const stagedCards = '[data-pending-operation="true"]';
    cy.get('[data-operator="join"]')
      .closest('li')
      .find('[data-field-selection="output"]')
      .first()
      .as('chainSourceField');
    dragWorkbenchField(
      '@chainSourceField',
      `${stagedCards} [data-slot="canvas-relational-input-port"]`
    );
    const inspector = '[data-slot="canvas-transform-inspector"]';
    cy.get(inspector).find('[data-slot="canvas-derived-output-trigger"]').click();
    cy.get('[data-slot="canvas-derived-output-form"]').within(() => {
      cy.get('input[name="alias"]').type('normalized_customer_id');
      cy.get('[data-slot="formula-editor"] .monaco-editor textarea').type(
        'UPPER(TRIM("customer_id"))',
        { force: true }
      );
      cy.get('button[type="submit"]').should('be.enabled').click();
    });
    cy.get(stagedCards).first().find('[data-slot="canvas-relational-node-expand"]').click();
    cy.get(stagedCards).first().find('[data-field-selection="output"]').should('have.length', 2);
    cy.get('[data-slot="canvas-operation-menu-trigger"]').click();
    cy.get('[data-operation="field_transform"]').click();
    cy.get(stagedCards).should('have.length', 2);
    cy.get('[data-slot="canvas-relational-tree-fit"]').click();
    dragWorkbenchField(
      `${stagedCards}:first [data-field-selection="output"]:last`,
      `${stagedCards}:last [data-slot="canvas-relational-input-port"]`
    );
    cy.get(stagedCards)
      .last()
      .find('[data-slot="canvas-relational-input-port"]')
      .should('have.attr', 'data-connected', 'true');
    cy.get(stagedCards).last().find('[data-slot="canvas-relational-node-expand"]').click();
    cy.get(stagedCards)
      .last()
      .find('[data-field-selection="output"]')
      .should('have.length', 1)
      .and('contain.text', 'normalized_customer_id');
    cy.window().then((window) => {
      const dataTransfer = new window.DataTransfer();
      cy.get(stagedCards)
        .last()
        .find('[data-slot="canvas-relational-output-port"]')
        .trigger('dragstart', { dataTransfer });
      cy.get('[data-slot="canvas-relational-output-input-port"]')
        .trigger('dragover', { dataTransfer })
        .trigger('drop', { dataTransfer });
    });
    cy.get('[data-slot="canvas-relational-output-input-port"]').should(
      'have.attr',
      'data-connected',
      'true'
    );
    let writes = 0;
    cy.then(() => {
      writes = getE2eApiCalls('/workspace/graph/draft', 'PUT').length;
    });
    cy.get('[data-slot="canvas-relational-tree-apply"]').should('be.enabled').click();
    cy.wrap(null).should(() => {
      const saves = getE2eApiCalls('/workspace/graph/draft', 'PUT');
      expect(saves.length).to.be.greaterThan(writes);
      expect(JSON.stringify(saves.at(-1)?.body)).to.include('pending-operation:');
      expect(JSON.stringify(saves.at(-1)?.body)).to.include('normalized_customer_id');
    });
    visitWorkbenchCanvas();
    openWorkbenchModel();
    cy.get(card).should('have.length', 2);
    cy.get(card).first().closest('li').find('[data-slot="canvas-relational-node-expand"]').click();
    cy.get(card)
      .first()
      .closest('li')
      .find('[data-field-selection="output"]')
      .should('have.length', 1)
      .and('contain.text', 'normalized_customer_id');
  });
});
