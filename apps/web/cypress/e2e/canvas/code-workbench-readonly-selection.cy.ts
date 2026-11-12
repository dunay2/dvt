/** Prove read-only selection and Canvas retention; keep requests, permissions and native gestures observable. */
import {
  INITIAL_SQL,
  stubContextualCodeWorkbenchApis,
} from '../../support/codeWorkbench/bootstrap';
import { getLastE2eApiCall, waitForE2eApiCall } from '../../support/e2eApiStub';
import { visitWithE2eWorkspaceSession } from '../../support/workspaceSession';

describe('Canvas Project Code read-only selection and Canvas retention', () => {
  it('allows selection and copying without changing the file or Canvas position', () => {
    stubContextualCodeWorkbenchApis();

    visitWithE2eWorkspaceSession('/canvas');

    cy.get('.react-flow__node').first().click().should('have.class', 'selected');
    cy.get('.react-flow__viewport')
      .invoke('attr', 'style')
      .then((viewportStyle) => cy.wrap(viewportStyle).as('graphViewportStyle'));

    cy.get('[data-slot="shell-project-code-command"]').click();
    waitForE2eApiCall('/workspace/files', 'GET');
    waitForE2eApiCall(/\/workspace\/files\/.+/, 'GET');

    cy.get('[data-slot="canvas-code-workspace-surface"]')
      .should('be.visible')
      .within(() => {
        cy.get('[data-slot="code-working-tree-status"]')
          .should('be.visible')
          .and('have.attr', 'data-phase', 'read_only');
        cy.contains('button', 'Save').should('not.exist');
        cy.get('[data-testid="monaco-code-editor"]').should('not.exist');
        cy.get('[data-testid="monaco-code-viewer"]')
          .should('be.visible')
          .find('.view-line')
          .first()
          .click();
        cy.get('[data-testid="monaco-code-viewer"] textarea.inputarea')
          .should('have.prop', 'readOnly', true)
          .and('be.focused');
        cy.get('[data-testid="monaco-code-viewer"] textarea.inputarea').type(
          'blocked_workspace_edit',
          { force: true, delay: 0 }
        );
        cy.get('[data-testid="monaco-code-viewer"] .view-line').first().click();
        cy.window().then((window) => {
          const clipboardData = new window.DataTransfer();
          cy.get('[data-testid="monaco-code-viewer"] textarea.inputarea')
            .should('be.focused')
            .then(($input) => {
              const selectAll = {
                key: 'a',
                code: 'KeyA',
                keyCode: 65,
                ctrlKey: Cypress.platform !== 'darwin',
                metaKey: Cypress.platform === 'darwin',
                bubbles: true,
                cancelable: true,
              };
              $input[0]!.dispatchEvent(new window.KeyboardEvent('keydown', selectAll));
              $input[0]!.dispatchEvent(new window.KeyboardEvent('keyup', selectAll));
              $input[0]!.dispatchEvent(
                new window.ClipboardEvent('copy', {
                  clipboardData,
                  bubbles: true,
                  cancelable: true,
                })
              );
              expect(clipboardData.getData('text/plain')).to.equal(INITIAL_SQL);
            });
        });
        cy.get('[data-testid="monaco-code-viewer"] .selected-text').should('exist');
      });

    cy.wrap(null).should(() => {
      expect(getLastE2eApiCall(/\/workspace\/files\/.+/, 'POST')).to.equal(null);
    });

    cy.get('.react-flow__node').first().should('have.class', 'selected');
    cy.get('@graphViewportStyle').then((viewportStyle) => {
      cy.get('.react-flow__viewport').should(($viewport) => {
        expect($viewport.attr('style')).to.equal(viewportStyle);
      });
    });
  });
});
