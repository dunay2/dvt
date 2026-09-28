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
    cy.viewport(1280, 720);
    stubWorkbenchScenario('saved-join');
    visitWorkbenchCanvas();
    openModel();
    cy.get('[data-slot="canvas-relational-tree-node"][data-operator="read"]').first().click();
    cy.get('[data-slot="canvas-derived-output-trigger"]').should('not.exist');
    cy.get('[data-slot="canvas-operation-menu-trigger"]').click();
    cy.get('[data-operation="field_transform"]')
      .should('have.attr', 'aria-disabled', 'false')
      .click();
    cy.get('[data-pending-operation="true"]').should('have.length', 1);
    cy.get('[data-slot="canvas-relational-output-input-port"]').focus().type('{del}');
    cy.window().then((window) => {
      const dataTransfer = new window.DataTransfer();
      cy.get('[data-operator="join"]')
        .closest('li')
        .find('[data-slot="canvas-relational-output-port"]')
        .trigger('dragstart', { dataTransfer });
      cy.get('[data-pending-operation="true"] [data-slot="canvas-relational-input-port"]')
        .trigger('dragover', { dataTransfer })
        .trigger('drop', { dataTransfer });
    });
    cy.get(inspector)
      .should('be.visible')
      .and(($panel) => {
        const bounds = $panel[0]!.getBoundingClientRect();
        expect(bounds.right).to.be.closeTo(1280, 30);
      });
    cy.get(form).should('not.exist');
    cy.get(inspector).find('[data-slot="canvas-derived-output-trigger"]').click();
    cy.get(form).within(() => {
      cy.get('input[name="alias"]').type('normalized_name');
      cy.get('[data-slot="derived-formula-node-kind"][data-depth="0"]').select('function');
      cy.get('[data-slot="derived-formula-function"][data-depth="0"]').select('UPPER');
      cy.get('[data-slot="derived-formula-argument"][data-depth="0"][data-argument-index="0"]')
        .find('[data-slot="derived-formula-node-kind"]')
        .select('string-literal');
      cy.get('[data-slot="derived-formula-literal"]').type('hola');
      cy.get('[data-slot="derived-formula-preview"]').should('contain', "UPPER('hola')");
      cy.get('button[type="submit"]').should('be.enabled').click();
    });
    cy.get(form).should('not.exist');

    cy.get(inspector).find('[data-slot="canvas-derived-output-trigger"]').click();
    cy.get(form).within(() => {
      cy.get('input[name="alias"]').type('fallback_name');
      cy.get('[data-slot="derived-formula-node-kind"][data-depth="0"]').select('string-literal');
      cy.get('[data-slot="derived-formula-preview"]').should('have.text', "''");
      cy.get('button[type="submit"]').should('be.enabled').click();
    });
    cy.get(form).should('not.exist');

    cy.get(inspector).find('[data-slot="canvas-derived-output-trigger"]').click();
    cy.get(form).within(() => {
      cy.get('input[name="alias"]').type('total');
      cy.get('[data-slot="derived-formula-node-kind"][data-depth="0"]').select('number-literal');
      cy.get('[data-slot="derived-formula-literal"]').clear().type('2');
      cy.get('[data-slot="derived-formula-node-kind"][data-depth="0"]').select('function');
      cy.get('[data-slot="derived-formula-function"][data-depth="0"]').select('MULTIPLY');
      cy.get('[data-slot="derived-formula-argument"][data-depth="0"][data-argument-index="0"]')
        .find('[data-slot="derived-formula-node-kind"]')
        .select('function');
      cy.get('[data-slot="derived-formula-function"][data-depth="1"]').first().select('ADD');
      cy.get('[data-slot="derived-formula-argument"][data-depth="1"][data-argument-index="1"]')
        .find('[data-slot="derived-formula-literal"]')
        .clear()
        .type('3');
      cy.get('[data-slot="derived-formula-argument"][data-depth="0"][data-argument-index="1"]')
        .find('[data-slot="derived-formula-literal"]')
        .clear()
        .type('4');
      cy.get('[data-slot="derived-formula-preview"]').should('have.text', '((2 + 3) * 4)');
      cy.get('button[type="submit"]').should('be.enabled').click();
    });
    cy.get(form).should('not.exist');
    cy.get(inspector)
      .find('[data-slot="canvas-derived-output"]')
      .contains('fallback_name')
      .closest('[data-slot="canvas-derived-output"]')
      .as('editableOutput');
    cy.get('@editableOutput')
      .invoke('attr', 'data-field-id')
      .then((fieldId) => {
        cy.get('@editableOutput').find('button').click();
        cy.get(form).within(() => {
          cy.get('[data-slot="derived-formula-preview"]').should('have.text', "''");
          cy.get('[data-slot="derived-formula-node-kind"][data-depth="0"]').select('function');
          cy.get('[data-slot="derived-formula-function"][data-depth="0"]').select('CONCAT');
          cy.get('[data-slot="derived-formula-argument"][data-depth="0"][data-argument-index="0"]')
            .find('[data-slot="derived-formula-literal"]')
            .type('hola');
          cy.get('[data-slot="derived-formula-argument"][data-depth="0"][data-argument-index="1"]')
            .find('[data-slot="derived-formula-node-kind"]')
            .select('function');
          cy.get('[data-slot="derived-formula-function"][data-depth="1"]').select('CONCAT');
          cy.get('[data-slot="derived-formula-argument"][data-depth="1"][data-argument-index="0"]')
            .find('[data-slot="derived-formula-literal"]')
            .type(' ');
          cy.get('[data-slot="derived-formula-argument"][data-depth="1"][data-argument-index="1"]')
            .find('[data-slot="derived-formula-literal"]')
            .type('mundo');
          cy.get('[data-slot="derived-formula-preview"]').should('contain', 'CONCAT');
          cy.get('button[type="submit"]').click();
        });
        cy.get(inspector)
          .find(`[data-slot="canvas-derived-output"][data-field-id="${fieldId}"]`)
          .should('contain', 'fallback_name')
          .and('contain', 'CONCAT');
      });
    cy.get(inspector).find('[data-slot="canvas-operation-output-tab"]').click();
    cy.get(inspector).find('input').filter('[value="normalized_name"]').should('exist');
    cy.get(inspector)
      .find('input[type="checkbox"]')
      .first()
      .as('outputCheckbox')
      .focus()
      .uncheck()
      .should('not.be.checked')
      .and('be.focused');
    cy.window().then((window) => {
      const dataTransfer = new window.DataTransfer();
      cy.get('[data-pending-operation="true"] [data-slot="canvas-relational-output-port"]').trigger(
        'dragstart',
        { dataTransfer }
      );
      cy.get('[data-slot="canvas-relational-output-input-port"]')
        .trigger('dragover', { dataTransfer })
        .trigger('drop', { dataTransfer });
    });
    cy.get('[data-slot="canvas-relational-tree-apply"]').should('be.enabled').click();
    cy.get(card).should('have.length', 1);
    cy.get('[data-pending-operation="true"]').should('not.exist');
    cy.wrap(null).should(() => {
      const saved = JSON.stringify(getE2eApiCalls('/workspace/graph/draft', 'PUT').at(-1)?.body);
      expect(saved).to.include('normalized_name').and.include('fallback_name');
    });
    visitWorkbenchCanvas();
    openModel();
    cy.get(card).should('have.length', 1).click();
    cy.get(inspector).should('be.visible');
    cy.get(form).should('not.exist');
    cy.get(inspector)
      .find('[data-slot="canvas-derived-output"]')
      .should('have.length', 3)
      .and('contain', 'CONCAT')
      .and('contain', 'total');
    cy.screenshot('transform-name-formula-properties');
    cy.get(inspector)
      .find('[data-slot="canvas-derived-output"]')
      .contains('fallback_name')
      .closest('[data-slot="canvas-derived-output"]')
      .find('button')
      .click();
    cy.get(form).find('input[name="alias"]').should('have.value', 'fallback_name');
    cy.get(form).find('[data-slot="derived-formula-preview"]').should('contain', "'mundo'");
    cy.screenshot('transform-name-formula-edit');
    cy.get(form).find('[data-slot="canvas-derived-output-cancel"]').click();
    cy.get(inspector).find('[data-slot="canvas-operation-output-tab"]').click();
    cy.get(inspector).find('input').filter('[value="fallback_name"]').should('exist');
    cy.screenshot('transform-fixed-output');
    cy.get('[data-slot="canvas-relational-tree-node"][data-operator="join"]').click();
    cy.get('[data-slot="canvas-derived-output-trigger"]').should('not.exist');
  });
});
