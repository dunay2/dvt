import {
  getE2eApiCalls,
  installE2eApiFetchStub,
  waitForE2eApiCall,
} from '../../support/e2eApiStub';
import {
  connectWorkbenchProducer,
  stageWorkbenchUnary,
} from '../../support/relationalWorkbench/navigation';
import { form, openEditor } from '../../support/relationalWorkbench/operatorEditor';

describe('join-consumers', () => {
  it('saves and reopens a mixed-input scalar predicate using the shared formula editor', () => {
    openEditor();
    cy.get('[data-operator="join"]').click();
    cy.get('[data-slot="canvas-relational-edit"]').click();
    cy.get('[data-slot="join-predicate-formula-open"]').click();
    const formulaForm = '[data-slot="join-predicate-formula"]';
    const write = (formula: string): void => {
      cy.get(formulaForm).find('.monaco-editor').click();
      cy.get(formulaForm)
        .find('.inputarea')
        .type('{ctrl+a}')
        .type(formula, { parseSpecialCharSequences: false, delay: 0 });
    };
    cy.get('[data-slot="canvas-relational-tree-apply"]').should('be.disabled');
    write('1 + 2');
    cy.get(formulaForm).find('button[type="submit"]').should('be.disabled');
    cy.get(formulaForm).find('[role="alert"]').should('contain.text', 'true, false or NULL');
    cy.get(formulaForm)
      .find('[data-slot="formula-operand"][data-kind="field"] > span')
      .then(($labels) => {
        const labels = [...$labels].map((label) => label.textContent!);
        const left = labels.find((label) => label.startsWith('L.'))!;
        const right = labels.find((label) => label.startsWith('R.'))!;
        expect(left).to.be.a('string');
        expect(right).to.be.a('string');
        write(`CONCAT("${left}", "${right}") = 'match'`);
      });
    cy.get(formulaForm).find('button[type="submit"]').should('be.enabled').click();
    cy.get(formulaForm).should('not.exist');
    let writesBeforeApply = 0;
    cy.then(() => {
      writesBeforeApply = getE2eApiCalls('/workspace/graph/draft', 'PUT').length;
    });
    cy.get('[data-slot="canvas-relational-tree-apply"]').should('be.enabled').click();
    cy.wrap(null).should(() => {
      expect(getE2eApiCalls('/workspace/graph/draft', 'PUT').length).to.be.greaterThan(
        writesBeforeApply
      );
    });
    cy.on('window:before:load', installE2eApiFetchStub);
    cy.reload();
    cy.get('.react-flow__node[data-id$="-transform"] [data-slot="canvas-node-shell"]')
      .first()
      .dblclick(40, 18);
    cy.get('[data-operator="join"]').click();
    cy.get('[data-slot="canvas-relational-edit"]').click();
    cy.get('[data-slot="join-predicate-formula-open"]').click();
    cy.get(formulaForm)
      .find('.view-lines')
      .should('contain.text', 'CONCAT')
      .and('contain.text', 'L.')
      .and('contain.text', 'R.');
    cy.get(formulaForm).contains('button', 'Cancel').click();
    cy.get(formulaForm).should('not.exist');
  });

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
    stageWorkbenchUnary('aggregate', '[data-operator="join"]', true);
    cy.get(form).find('button[type="submit"]').click();
    stageWorkbenchUnary('window', '[data-operator="aggregate"]');
    cy.get(form).find('button[type="submit"]').click();
    cy.get('[data-presentation="window"]').closest('li').as('window');
    connectWorkbenchProducer('@window', '[data-slot="canvas-relational-output-input-port"]', null);
    cy.get('[data-operator="join"]').click();
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
    cy.get('[data-slot="canvas-card-removal-confirm"]').click();
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
