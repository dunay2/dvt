import { getE2eApiCalls, waitForE2eApiCall } from '../../support/e2eApiStub';
import {
  workbenchOperation,
  closeWorkbenchOperations,
} from '../../support/relationalWorkbench/operationMenu';
import { openEditor, addWrapper } from '../../support/relationalWorkbench/operatorEditor';

describe('model-session', () => {
  it('keeps editing or applies local composition changes before closing the Model', () => {
    openEditor();
    waitForE2eApiCall('/workspace/graph/draft', 'PUT');
    let initialWrites = 0;
    cy.then(() => {
      initialWrites = getE2eApiCalls('/workspace/graph/draft', 'PUT').length;
    });
    addWrapper('aggregate');
    cy.get('[data-operator="aggregate"]').should('have.length', 1);

    cy.get('[data-slot="canvas-model-tab-close"]').click();
    cy.get('[role="alertdialog"]').should('be.visible');
    cy.contains('[role="alertdialog"] button', 'Keep editing').click();
    cy.get('[data-slot="canvas-model-editor"]').should('be.visible');
    cy.get('[data-operator="aggregate"]').should('have.length', 1);

    cy.get('[data-slot="canvas-model-tab-close"]').click();
    cy.contains('[role="alertdialog"] button', 'Apply and continue').click();
    cy.get('[data-slot="canvas-model-editor"]').should('not.exist');
    cy.get('[data-slot="canvas-model-main-tab"]').should('not.exist');
    cy.wrap(null).should(() =>
      expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(initialWrites + 1)
    );
  });
  it('discards local composition changes before closing the Model', () => {
    openEditor();
    waitForE2eApiCall('/workspace/graph/draft', 'PUT');
    let initialWrites = 0;
    cy.then(() => {
      initialWrites = getE2eApiCalls('/workspace/graph/draft', 'PUT').length;
    });
    addWrapper('aggregate');
    cy.get('[data-operator="aggregate"]').should('have.length', 1);

    cy.get('[data-slot="canvas-model-tab-close"]').click();
    cy.get('[role="alertdialog"]').should('be.visible');
    cy.contains('[role="alertdialog"] button', 'Discard changes').click();
    cy.get('[data-slot="canvas-model-editor"]').should('not.exist');
    cy.get('[data-slot="canvas-model-main-tab"]').should('not.exist');
    cy.then(() =>
      expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(initialWrites)
    );
  });
  it('does not enable mutations for a read-only model', () => {
    openEditor(false, true);
    workbenchOperation('aggregate').should('have.attr', 'aria-disabled', 'true');
    closeWorkbenchOperations();
    workbenchOperation('window').should('have.attr', 'aria-disabled', 'true');
    closeWorkbenchOperations();
    cy.get('[data-slot="canvas-relational-tree-apply"]').should('not.exist');
    cy.get('[data-operator="join"]').click();
    cy.get('[data-slot="canvas-relational-tree-inline-editor"]:visible').then(($editor) => {
      const properties = $editor[0]!.getBoundingClientRect();
      cy.get('[data-slot="canvas-relational-tree-viewport"]').should(($viewport) => {
        const tree = $viewport[0]!.getBoundingClientRect();
        expect(properties.left).to.be.at.least(tree.right - 1);
        expect(Math.abs(properties.top - tree.top)).to.be.lessThan(2);
      });
    });
    cy.get('[data-slot="canvas-relational-tree-source"]').should('have.attr', 'draggable', 'false');
  });
});
