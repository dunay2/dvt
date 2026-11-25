import {
  getE2eApiCalls,
  installE2eApiFetchStub,
  waitForE2eApiCall,
} from '../../support/e2eApiStub';
import { registerEmptyModelDeletionJourney } from '../../support/emptyModelDeletion';
import {
  connectWorkbenchProducer,
  stageWorkbenchUnary,
  visitWorkbenchCanvas,
  setWorkbenchInputsOpen,
} from '../../support/relationalWorkbench/navigation';
import {
  workbenchOperation,
  closeWorkbenchOperations,
} from '../../support/relationalWorkbench/operationMenu';
import { form, openEditor } from '../../support/relationalWorkbench/operatorEditor';
import { stubWorkbenchScenario } from '../../support/relationalWorkbench/scenario';

describe('model-session', () => {
  registerEmptyModelDeletionJourney();
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
  it('opens the first Model and restores the last chosen Model after route exit and reload', () => {
    stubWorkbenchScenario('generated', { includeLooseNode: true });
    const enterSemantic = (): void => {
      cy.get('[data-slot="shell-model-semantic-command"]')
        .should('have.attr', 'aria-disabled', 'false')
        .click();
    };
    const canvas = '#shell-canvas-navigation';
    const inspector = '[data-slot="canvas-node-workbench-overlay"]:visible';
    const row = (id: string): string =>
      `[data-slot="canvas-explorer-panel"]:visible [data-element-id="${id}"]`;
    const assertModel = (id: string, name: string): void => {
      cy.get(row(id)).should('have.attr', 'aria-pressed', 'true');
      cy.get('[data-slot="canvas-model-editor"]:visible')
        .should('have.attr', 'aria-label')
        .and('include', name);
    };

    visitWorkbenchCanvas();
    enterSemantic();
    assertModel('dvt-transform-1', 'Transform 1');
    cy.get(canvas).click();
    cy.get(row('dvt-transform-1')).click();
    cy.get(inspector).should('contain.text', 'Transform 1');
    enterSemantic();
    assertModel('dvt-transform-1', 'Transform 1');
    cy.get(row('orphan-transform-1')).click();
    assertModel('orphan-transform-1', 'Orphan transform');
    const modelTabs = '[data-slot="canvas-model-main-tab"]';
    cy.get(modelTabs).should('have.length', 2);
    cy.contains(modelTabs, 'Transform 1').click();
    assertModel('dvt-transform-1', 'Transform 1');
    cy.contains(modelTabs, 'Orphan transform').click();
    assertModel('orphan-transform-1', 'Orphan transform');
    cy.get('[data-slot="left-navigation-link"][href="/admin"]').click();
    cy.location('pathname').should('eq', '/admin');
    cy.get(canvas).click();
    enterSemantic();
    assertModel('orphan-transform-1', 'Orphan transform');
    cy.get(canvas).click();
    cy.get(row('dvt-transform-1')).click();
    enterSemantic();
    assertModel('dvt-transform-1', 'Transform 1');
    cy.get(row('orphan-transform-1')).click();
    assertModel('orphan-transform-1', 'Orphan transform');
    cy.on('window:before:load', installE2eApiFetchStub);
    cy.reload();
    enterSemantic();
    assertModel('orphan-transform-1', 'Orphan transform');
    cy.get(row('source-1')).click();
    assertModel('orphan-transform-1', 'Orphan transform');
    cy.get('[data-slot="canvas-workspace-tab"]').click();
    cy.get('[data-slot="shell-model-semantic-command"]').should(
      'have.attr',
      'aria-pressed',
      'false'
    );
    cy.get(row('source-1')).click();
    cy.get(inspector).should('contain.text', 'Source 1');
    enterSemantic();
    assertModel('orphan-transform-1', 'Orphan transform');
    cy.then(() => expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(0));
  });
  it('keeps editing or applies local composition changes before closing the Model', () => {
    openEditor();
    waitForE2eApiCall('/workspace/graph/draft', 'PUT');
    let initialWrites = 0;
    cy.then(() => {
      initialWrites = getE2eApiCalls('/workspace/graph/draft', 'PUT').length;
    });
    stageWorkbenchUnary({
      operation: 'aggregate',
      producer: '[data-operator="join"]',
      disconnectOutput: true,
    });
    cy.get(form).find('button[type="submit"]').click();
    cy.get('[data-operator="aggregate"]').closest('li').as('aggregate');
    connectWorkbenchProducer({
      producer: '@aggregate',
      consumer: '[data-slot="canvas-relational-output-input-port"]',
      port: null,
    });
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
    stageWorkbenchUnary({
      operation: 'aggregate',
      producer: '[data-operator="join"]',
      disconnectOutput: true,
    });
    cy.get(form).find('button[type="submit"]').click();
    cy.get('[data-operator="aggregate"]').closest('li').as('aggregate');
    connectWorkbenchProducer({
      producer: '@aggregate',
      consumer: '[data-slot="canvas-relational-output-input-port"]',
      port: null,
    });
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
    setWorkbenchInputsOpen(true);
    cy.get('[data-slot="canvas-relational-tree-source"]').should('have.attr', 'draggable', 'false');
    setWorkbenchInputsOpen(false);
    cy.get('[data-slot="canvas-model-tab-close"]').click();
    cy.get('[data-slot="canvas-model-editor"]').should('not.exist');
    cy.get('[data-slot="canvas-model-main-tab"]').should('not.exist');
    cy.get('[data-slot="canvas-workspace-tab"]').should('have.attr', 'aria-selected', 'true');
    cy.then(() => expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(0));
  });
});
