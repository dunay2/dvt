/** Real editor + stateful draft transport: Transform owns dataset field authoring. */
import { getE2eApiCalls } from '../../support/e2eApiStub';
import { visitWorkbenchCanvas } from '../../support/relationalWorkbench/navigation';
import { dragWorkbenchField } from '../../support/relationalWorkbench/pointer';
import { stubWorkbenchScenario } from '../../support/relationalWorkbench/scenario';
import { exerciseTransformFormulaAuthoring } from '../../support/relationalWorkbench/transformFormulaJourney';
import { exerciseTransformTreeSelection } from '../../support/relationalWorkbench/transformTreeJourney';

const inspector = '[data-slot="canvas-transform-inspector"]';
const card = '[data-slot="canvas-relational-tree-node"][data-operator="project"]';

function openModel(): void {
  cy.get('.react-flow__node[data-id="join-transform"] [data-slot="canvas-node-shell"]')
    .should('be.visible')
    .focus()
    .type('{enter}');
  cy.get('[data-slot="canvas-relational-tree-workbench"]').should('be.visible');
}

describe('Semantic dataset Transform', () => {
  it('connects exactly one dragged Output field into an empty Transform and keeps it after reopen', () => {
    cy.viewport(1280, 720);
    stubWorkbenchScenario('saved-join');
    visitWorkbenchCanvas();
    openModel();
    cy.get('[data-slot="canvas-operation-menu-trigger"]').click();
    cy.get('[data-operation="field_transform"]').click();
    cy.get('[data-operator="join"]')
      .closest('li')
      .find('[data-slot="canvas-relational-node-expand"]')
      .click();
    const input = '[data-pending-operation="true"] [data-slot="canvas-relational-input-port"]';
    let fieldName = '';
    const lifecycle: string[] = [];
    cy.window().then((window) => {
      for (const type of ['dragstart', 'pointercancel', 'dragover', 'drop', 'dragend']) {
        window.document.addEventListener(
          type,
          (event) => {
            if (type !== 'dragover' || !lifecycle.at(-1)?.startsWith('dragover'))
              lifecycle.push(`${type}:${event.isTrusted}`);
          },
          true
        );
      }
    });
    const dropField = (): void => {
      cy.get('[data-slot="canvas-relational-tree-fit"]').click();
      cy.get('[data-operator="join"]')
        .closest('li')
        .find('[data-field-selection="output"]')
        .last()
        .as('connectionField')
        .then(($field) => {
          fieldName = $field.attr('title')!;
          dragWorkbenchField('@connectionField', input);
        });
    };
    // A producer already consumed by terminal Output cannot silently acquire fan-out.
    dropField();
    cy.then(() => expect(lifecycle, 'trusted browser drag lifecycle').to.include('drop:true'));
    cy.get('[data-slot="canvas-field-selection-error"]').should('be.visible');
    cy.get(input).should('not.have.attr', 'data-connected');
    cy.get('[data-slot="canvas-relational-output-input-port"]').focus().type('{del}');
    dropField();
    cy.get(input).should('have.attr', 'data-connected', 'true');
    cy.get('[data-slot="canvas-field-selection-error"]').should('not.exist');
    cy.get(inspector).find('[data-slot="canvas-operation-output-tab"]').click();
    const included = '[data-slot="relation-output-toggle"][data-included="true"]';
    cy.get(inspector)
      .find(included)
      .should('have.length', 1)
      .should(($field) => expect($field.attr('data-field-name')).to.equal(fieldName));
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
    let writes = 0;
    cy.then(() => {
      writes = getE2eApiCalls('/workspace/graph/draft', 'PUT').length;
    });
    cy.get('[data-slot="canvas-relational-tree-apply"]').should('be.enabled').click();
    cy.wrap(null).should(() =>
      expect(getE2eApiCalls('/workspace/graph/draft', 'PUT').length).to.be.greaterThan(writes)
    );
    visitWorkbenchCanvas();
    openModel();
    cy.get(card).click();
    cy.get(inspector).find('[data-slot="canvas-operation-output-tab"]').click();
    cy.get(inspector)
      .find(included)
      .should('have.length', 1)
      .should(($field) => expect($field.attr('data-field-name')).to.equal(fieldName));
    cy.screenshot('transform-single-field-connection-reopened');
  });

  it('adds fields in one fixed inspector, persists, and reopens the same Transform', () => {
    exerciseTransformFormulaAuthoring();
    exerciseTransformTreeSelection();
  });
});
