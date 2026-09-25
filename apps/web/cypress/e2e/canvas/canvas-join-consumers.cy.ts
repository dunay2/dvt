import { getE2eApiCalls, waitForE2eApiCall } from '../../support/e2eApiStub';
import { workbenchOperation } from '../../support/relationalWorkbench/operationMenu';
import { form, openEditor } from '../../support/relationalWorkbench/operatorEditor';

describe('join-consumers', () => {
  it('keeps the selected JOIN editable below grouping and windows, and removes the selected wrapper', () => {
    openEditor();
    waitForE2eApiCall('/workspace/graph/draft', 'PUT');
    let initialWrites = 0;
    cy.then(() => {
      initialWrites = getE2eApiCalls('/workspace/graph/draft', 'PUT').length;
    });
    cy.get('[data-operator="join"]').click();
    cy.get('[data-slot="canvas-relational-expression-node"]').should('have.length.at.least', 3);
    cy.get('[data-slot="semantic-workbench-join-condition-editor"]').should('not.exist');
    cy.get('[data-slot="canvas-relational-edit"]').click();
    workbenchOperation('aggregate').click();
    cy.get(
      '[role="dialog"] ' + form + ', [role="dialog"][data-slot="canvas-relational-operator-form"]'
    )
      .find('button[type="submit"]')
      .click();
    workbenchOperation('window').click();
    cy.get(
      '[role="dialog"] ' + form + ', [role="dialog"][data-slot="canvas-relational-operator-form"]'
    )
      .find('button[type="submit"]')
      .click();
    cy.get('[data-slot="canvas-operation-tree-tab"]:visible').click();
    cy.get('[data-slot="canvas-relational-expression-node"][data-kind="field"]:visible')
      .first()
      .click();
    cy.get('[data-slot="semantic-workbench-join-condition-editor"]').should('be.visible');
    cy.screenshot('selected-join-connected-expression-under-window');
    cy.get('[aria-label="Comparador de la condición"]').select('not_equal');
    cy.get('[data-slot="canvas-relational-tree-apply"]').should('be.disabled');
    cy.contains('button', 'Guardar condición').click();
    cy.contains('[data-operator="project"]', 'Window').rightclick();
    cy.get(
      '[data-slot="context-menu-content"][data-state="open"] [data-slot="canvas-relational-remove-source"]'
    ).click();
    cy.get('[data-slot="canvas-relational-node-title"]').should('not.contain.text', 'Window');
    cy.get('[data-operator="aggregate"]').rightclick();
    cy.get(
      '[data-slot="context-menu-content"][data-state="open"] [data-slot="canvas-relational-remove-source"]'
    ).click();
    cy.get('[data-operator="aggregate"]').should('not.exist');
    cy.get('[data-operator="join"]').should('exist');
    cy.then(() =>
      expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(initialWrites)
    );
    cy.get('[data-slot="canvas-relational-tree-cancel"]').click();
  });
});
