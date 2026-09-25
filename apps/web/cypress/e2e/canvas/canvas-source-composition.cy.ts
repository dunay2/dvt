import { getE2eApiCalls, waitForE2eApiCall } from '../../support/e2eApiStub';
import {
  workbenchOperation,
  openWorkbenchOperations,
} from '../../support/relationalWorkbench/operationMenu';
import { form, openEditor, activateMenu } from '../../support/relationalWorkbench/operatorEditor';
import { visitWithE2eWorkspaceSession } from '../../support/workspaceSession';

describe('source-composition', () => {
  for (const applied of [false, true]) {
    it(`stages a dragged source on a ${applied ? 'saved' : 'local'} filtered projection without losing it`, () => {
      openEditor();
      cy.get('[data-operator="join"]').rightclick();
      activateMenu('canvas-relational-remove-left');
      workbenchOperation('filter').click();
      cy.get(form).find('input').type('C-001');
      cy.get(form).find('button[type="submit"]').click();
      if (applied) {
        cy.get('[data-slot="canvas-relational-tree-apply"]').click();
        cy.get('[data-slot="canvas-relational-tree-apply"]').should('not.exist');
      }
      const viewport = applied
        ? '[data-slot="canvas-relational-tree-viewport"]'
        : '[data-slot="canvas-relational-tree-draft-viewport"]';
      const join = '[data-slot="dvt-select-operation-inner-join"]';

      cy.get('[data-operator="filter"]').then(($filter) => {
        const identity = $filter.attr('data-relation-id');
        cy.window().then((window) => {
          const dataTransfer = new window.DataTransfer();
          cy.contains('[data-slot="canvas-relational-tree-source"]', 'orders')
            .should('have.attr', 'draggable', 'true')
            .trigger('dragstart', { dataTransfer });
          cy.get('[data-operator="filter"]').should(($current) =>
            expect($current[0]).to.equal($filter[0])
          );
          cy.get(viewport).trigger('dragover', { dataTransfer }).trigger('drop', { dataTransfer });
        });
        cy.get('[data-operator="filter"]').should('have.attr', 'data-relation-id', identity);
        cy.get('[data-slot="canvas-relational-tree-apply"]').should('be.disabled');
        openWorkbenchOperations();
        cy.get(join).should('have.attr', 'aria-disabled', 'false').click();
        cy.get('[role="alertdialog"]').should('contain.text', 'filters and windows');
        cy.contains('[role="alertdialog"] button', 'Cancel').click();
        cy.get('[data-operator="filter"]').should('have.attr', 'data-relation-id', identity);
        openWorkbenchOperations();
        cy.get(join).click();
        cy.contains('[role="alertdialog"] button', 'Apply').click();
      });
      cy.get('[data-slot="canvas-relational-tree-append-input"]').click();
      cy.get('[data-operator="join"]').should('have.length', 1);
      cy.get('[data-operator="read"]').should('have.length', 2);
      cy.get('[data-operator="filter"]').rightclick();
      activateMenu('canvas-relational-edit-operation');
      cy.get(form).find('input').should('have.value', 'C-001');
      cy.get(form).find('button[type="submit"]').click();
      let writesBeforeApply = 0;
      cy.then(() => {
        writesBeforeApply = getE2eApiCalls('/workspace/graph/draft', 'PUT').length;
      });
      cy.get('[data-slot="canvas-relational-tree-apply"]').click();
      cy.get('[data-slot="canvas-relational-tree-apply"]').should('not.exist');
      cy.wrap(null).should(() => {
        expect(getE2eApiCalls('/workspace/graph/draft', 'PUT').length).to.be.greaterThan(
          writesBeforeApply
        );
      });
      visitWithE2eWorkspaceSession('/canvas');
      waitForE2eApiCall('/workspace/graph/draft', 'GET');
      cy.get('.react-flow__node[data-id$="-transform"] [data-slot="canvas-node-shell"]')
        .first()
        .dblclick(40, 18);
      cy.get('[data-operator="join"]').should('have.length', 1);
      cy.get('[data-operator="read"]').should('have.length', 2);
      cy.screenshot(`projection-source-drop-${applied ? 'saved' : 'local'}`);
    });
  }
});
