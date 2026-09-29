/** Shared user gesture only; persistence and provider assertions belong to each caller. */
import { connectWorkbenchProducer } from './navigation';
import { workbenchOperation } from './operationMenu';
import { dragWorkbenchField } from './pointer';

export function connectStagedTransformChain(
  producer: string,
  inputName: string,
  outputName: string,
  formula: string
): void {
  const stagedCards = '[data-pending-operation="true"]';
  cy.get('[data-slot="canvas-relational-output-input-port"]').focus().type('{del}');
  workbenchOperation('field_transform').click();
  cy.get(producer).closest('li').find('[data-slot="canvas-relational-node-expand"]').click();
  cy.get('[data-slot="canvas-relational-tree-fit"]').click();
  cy.get(producer)
    .closest('li')
    .contains(
      '[data-kind="field"][draggable="true"]:not([data-field-selection="input"])',
      inputName
    )
    .as('chainSourceField');
  dragWorkbenchField(
    '@chainSourceField',
    `${stagedCards} [data-slot="canvas-relational-input-port"]`
  );
  cy.get(
    '[data-slot="canvas-transform-inspector"] [data-slot="canvas-derived-output-trigger"]'
  ).click();
  cy.get('[data-slot="canvas-derived-output-form"]').within(() => {
    cy.get('input[name="alias"]').type(outputName);
    cy.get('[data-slot="formula-editor"] .monaco-editor textarea').type(formula, { force: true });
    cy.get('button[type="submit"]').should('be.enabled').click();
  });
  cy.get(stagedCards).first().find('[data-slot="canvas-relational-node-expand"]').click();
  cy.get(stagedCards).first().find('[data-field-selection="output"]').should('have.length', 2);
  workbenchOperation('field_transform').click();
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
    .and('contain.text', outputName);
  connectWorkbenchProducer(
    `${stagedCards}:last`,
    '[data-slot="canvas-relational-output-input-port"]',
    null
  );
  cy.get('[data-slot="canvas-relational-output-input-port"]').should(
    'have.attr',
    'data-connected',
    'true'
  );
}
