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
      cy.get('textarea[name="formula"]').type("UPPER('hola')");
      cy.get('button[type="submit"]').should('be.enabled').click();
    });
    cy.get(form).should('not.exist');

    cy.get(inspector).find('[data-slot="canvas-derived-output-trigger"]').click();
    cy.get(form).within(() => {
      cy.get('input[name="alias"]').type('fallback_name');
      cy.get('textarea[name="formula"]').type("''");
      cy.get('button[type="submit"]').should('be.enabled').click();
    });
    cy.get(form).should('not.exist');

    cy.get(inspector).find('[data-slot="canvas-derived-output-trigger"]').click();
    cy.get(form).within(() => {
      cy.get('input[name="alias"]').type('total');
      cy.get('textarea[name="formula"]').type('(2 + 3) * 4');
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
          cy.get('textarea[name="formula"]')
            .should('have.value', "''")
            .clear()
            .type("CONCAT('hola', ' ', 'mundo')");
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
      .find('[data-slot="relation-output-toggle"]')
      .first()
      .as('outputToggle')
      .focus()
      .click()
      .should('have.attr', 'data-included', 'false')
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
    cy.get(form).find('textarea[name="formula"]').invoke('val').should('contain', "'mundo'");
    cy.get(card).closest('li').find('[data-slot="canvas-relational-node-expand"]').click();
    cy.get(card)
      .closest('li')
      .find('[data-slot="canvas-relational-card-detail"]')
      .should('contain.text', 'INPUT')
      .and('contain.text', 'OUTPUT');
    let writesBeforeDrag = 0;
    cy.then(() => {
      writesBeforeDrag = getE2eApiCalls('/workspace/graph/draft', 'PUT').length;
    });
    cy.get(form)
      .find('textarea[name="formula"]')
      .clear()
      .type('UPPER()')
      .then(($field) => {
        $field[0]!.setSelectionRange(6, 6);
      });
    cy.window().then((window) => {
      const dataTransfer = new window.DataTransfer();
      cy.get(card)
        .closest('li')
        .find(
          '[data-slot="canvas-relational-expression-node"][data-kind="expression"][draggable="true"]'
        )
        .first()
        .trigger('dragstart', { dataTransfer });
      cy.get(form)
        .find('textarea[name="formula"]')
        .trigger('dragover', { dataTransfer })
        .trigger('drop', { dataTransfer })
        .should('have.value', 'UPPER("normalized_name")');
    });
    cy.get(form).find('button[type="submit"]').should('be.enabled');
    cy.then(() =>
      expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(writesBeforeDrag)
    );
    cy.screenshot('transform-name-formula-edit');
    cy.get(form).find('[data-slot="canvas-derived-output-cancel"]').click();
    cy.get(inspector).find('[data-slot="canvas-operation-output-tab"]').click();
    cy.get(inspector).find('input').filter('[value="fallback_name"]').should('exist');
    cy.screenshot('transform-fixed-output');
    cy.get('[data-slot="canvas-relational-tree-node"][data-operator="join"]').click();
    cy.get('[data-slot="canvas-derived-output-trigger"]').should('not.exist');
  });
});
