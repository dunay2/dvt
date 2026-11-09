import { getE2eApiCalls, waitForE2eApiCall } from '../../support/e2eApiStub';
import {
  connectWorkbenchProducer,
  stageWorkbenchUnary,
} from '../../support/relationalWorkbench/navigation';
import {
  workbenchOperation,
  closeWorkbenchOperations,
} from '../../support/relationalWorkbench/operationMenu';
import { form, openEditor } from '../../support/relationalWorkbench/operatorEditor';

describe('model-session', () => {
  afterEach(() => {
    // A failed assertion must not leave this test's dirty Model blocking the next navigation.
    const discard = '[data-slot="canvas-draft-discard"]';
    const model = '[data-slot="canvas-model-editor"]';
    cy.get('body').then(($body) => {
      if ($body.find(discard).length > 0) {
        cy.get(discard).should('be.enabled').click();
        cy.get(model).should('not.exist');
      } else if ($body.find(model).length > 0) {
        cy.get('[data-slot="canvas-model-tab-close"]').click();
        cy.get('body')
          .should(($current) => {
            expect($current.find(model).length === 0 || $current.find(discard).length > 0).to.equal(
              true
            );
          })
          .then(($current) => {
            if ($current.find(discard).length > 0) cy.get(discard).should('be.enabled').click();
          });
        cy.get(model).should('not.exist');
      }
    });
  });
  it('keeps editing or applies local composition changes before closing the Model', () => {
    openEditor();
    waitForE2eApiCall('/workspace/graph/draft', 'PUT');
    let initialWrites = 0;
    cy.then(() => {
      initialWrites = getE2eApiCalls('/workspace/graph/draft', 'PUT').length;
    });
    stageWorkbenchUnary('aggregate', '[data-operator="join"]', true);
    cy.get(form).find('button[type="submit"]').click();
    cy.get('[data-operator="aggregate"]').closest('li').as('aggregate');
    connectWorkbenchProducer(
      '@aggregate',
      '[data-slot="canvas-relational-output-input-port"]',
      null
    );
    cy.get('[data-operator="aggregate"]').should('have.length', 1);

    cy.get('[data-slot="canvas-model-tab-close"]').click();
    cy.get('[role="alertdialog"]').should('be.visible');
    cy.contains('[role="alertdialog"] button', 'Keep editing').click();
    cy.get('[data-slot="canvas-model-editor"]').should('be.visible');
    cy.get('[data-operator="aggregate"]').should('have.length', 1);

    cy.get('[data-slot="canvas-model-tab-close"]').click();
    cy.contains('[role="alertdialog"] button', 'Apply and continue')
      .should(($button) => {
        const button = $button[0]!;
        const document = button.ownerDocument;
        const bounds = button.getBoundingClientRect();
        const hit = document.elementFromPoint(
          bounds.left + bounds.width / 2,
          bounds.top + bounds.height / 2
        );
        const layers = Array.from(
          document.querySelectorAll<HTMLElement>(
            '[data-slot="alert-dialog-overlay"], [data-slot="alert-dialog-content"]'
          )
        ).map((element) => ({
          slot: element.dataset.slot,
          id: element.id,
          state: element.dataset.state,
          ariaHidden: element.getAttribute('aria-hidden'),
          pointerEvents: getComputedStyle(element).pointerEvents,
          zIndex: getComputedStyle(element).zIndex,
          parent: element.parentElement?.dataset.slot ?? element.parentElement?.tagName,
        }));
        expect(
          hit === button || button.contains(hit),
          `Modal hit test: ${JSON.stringify({ layers, modelEditors: document.querySelectorAll('[data-slot="canvas-model-editor"]').length, hit: hit?.outerHTML.slice(0, 300) })}`
        ).to.equal(true);
      })
      .click();
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
    stageWorkbenchUnary('aggregate', '[data-operator="join"]', true);
    cy.get(form).find('button[type="submit"]').click();
    cy.get('[data-operator="aggregate"]').closest('li').as('aggregate');
    connectWorkbenchProducer(
      '@aggregate',
      '[data-slot="canvas-relational-output-input-port"]',
      null
    );
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
    cy.get('[data-slot="canvas-model-tab-close"]').click();
    cy.get('[data-slot="canvas-model-editor"]').should('not.exist');
    cy.get('[data-slot="canvas-model-main-tab"]').should('not.exist');
    cy.get('[data-slot="canvas-workspace-tab"]').should('have.attr', 'aria-selected', 'true');
    cy.then(() => expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(0));
  });
});
