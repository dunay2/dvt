/** Shared UI gestures; no semantic writes or transport-specific fixture logic. */
import { openWorkbenchModel } from './navigation';

export function authorLineageFormula(nodeId: string, formula: string): void {
  openWorkbenchModel(nodeId);
  cy.get('[data-slot="canvas-relational-tree-node"][data-operator="project"]').click();
  cy.get(
    '[data-slot="canvas-transform-inspector"] [data-slot="canvas-derived-output-trigger"]'
  ).click();
  cy.get('[data-slot="canvas-derived-output-form"]').within(() => {
    cy.get('input[name="alias"]').type('preferred_name');
    // Monaco's keyboard target is covered by its rendered code layer.
    cy.get('[data-slot="formula-editor"] .monaco-editor textarea').type(formula, { force: true });
    cy.get('.formula-result').should('contain.text', 'COALESCE').and('contain.text', 'TRIM');
    cy.get('button[type="submit"]').should('be.enabled').click();
  });
  cy.get('[data-slot="canvas-derived-output-form"]').should('not.exist');
  cy.get('[data-slot="canvas-model-save-status"]').should('contain.text', 'Synced');
}

export function inspectLineageOutput(nodeId: string, expression: string): void {
  const card = `.react-flow__node[data-id="${nodeId}"]`;
  cy.get(card).contains('[role="tab"]', 'Output').click();
  cy.get(card)
    .find('[data-slot="graph-node-column-toggle"]')
    .then(($toggle) => {
      if ($toggle.attr('aria-expanded') !== 'true') cy.wrap($toggle).click();
    });
  cy.get(
    `${card} [data-slot="graph-node-column-piece"][data-column-name="preferred_name"]`
  ).click();
  cy.get('[data-slot="canvas-contextual-workbench"]').should('contain.text', expression);
  cy.get(
    '[data-slot="canvas-contextual-workbench"] [data-slot="canvas-relational-expression-node"]'
  ).should('have.length', 4);
}
