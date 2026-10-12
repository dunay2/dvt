import {
  getE2eApiCalls,
  installE2eApiFetchStub,
  waitForE2eApiCall,
} from '../../support/e2eApiStub';
import {
  connectWorkbenchProducer,
  stageWorkbenchUnary,
  visitWorkbenchCanvas,
  openWorkbenchModel,
} from '../../support/relationalWorkbench/navigation';
import { form, openEditor } from '../../support/relationalWorkbench/operatorEditor';
import {
  semanticWrites,
  semanticDocumentFromWrite,
} from '../../support/relationalWorkbench/persistence';
import { stubWorkbenchScenario } from '../../support/relationalWorkbench/scenario';

describe('join-consumers', () => {
  it('shows the canonical JOIN type without repeating a stale saved code through Apply and reopen', () => {
    const draft = stubWorkbenchScenario('saved-join');
    const stored = draft.nodes.find((node) => node.id === 'join-transform')!.metadata!
      .transformAuthoring as {
      semanticDocument: {
        sidecar: {
          relations: Array<{ relationId: string; displayName?: string | null }>;
          fields: unknown[];
        };
      };
    };
    stored.semanticDocument.sidecar.relations.at(-1)!.displayName = 'left_join';
    const original = structuredClone(stored.semanticDocument);
    cy.viewport(1440, 900);
    visitWorkbenchCanvas();
    openWorkbenchModel('join-transform');
    const card = '[data-slot="canvas-relational-tree-node"][data-operator="join"]';
    cy.get(card).should('contain.text', 'INNER JOIN').and('not.contain.text', 'left_join');
    cy.get(card).click();
    const applyType = (label: string): void => {
      cy.get('[data-slot="canvas-relational-edit"]').click();
      cy.get('[data-slot="canvas-operation-properties-tab"]:visible').click();
      cy.get('[data-slot="canvas-relational-tree-join-type"]').select(label);
      cy.get(card).should('contain.text', label).and('not.contain.text', 'left_join');
      let writesBeforeApply = 0;
      cy.then(() => {
        writesBeforeApply = semanticWrites('join-transform').length;
      });
      cy.get('[data-slot="canvas-relational-tree-apply"]').should('be.enabled').click();
      cy.wrap(null).should(() => {
        const writes = semanticWrites('join-transform');
        expect(writes.length).to.be.greaterThan(writesBeforeApply);
        const saved = semanticDocumentFromWrite(writes.at(-1)!) as typeof original;
        expect(saved.sidecar.relations).to.deep.equal(original.sidecar.relations);
        expect(saved.sidecar.fields).to.deep.equal(original.sidecar.fields);
      });
    };
    applyType('LEFT JOIN');
    applyType('INNER JOIN');
    cy.on('window:before:load', installE2eApiFetchStub);
    cy.reload();
    openWorkbenchModel('join-transform');
    cy.get(card).should('contain.text', 'INNER JOIN').and('not.contain.text', 'left_join');
    cy.get('[data-slot="canvas-relational-tree-output-open"]').click();
    cy.get('[data-slot="canvas-model-composition-steps"]')
      .should('contain.text', 'INNER JOIN')
      .and('not.contain.text', 'left_join');
  });
  it('creates and reopens a calculated SELECT field from JOIN Output without requiring a predicate', () => {
    openEditor();
    cy.get('[data-operator="join"]').click();
    cy.get('[data-slot="canvas-relational-edit"]').click();
    cy.get('[data-slot="canvas-operation-output-tab"]:visible').click();
    cy.get('[data-slot="canvas-derived-output-trigger"]:visible').click();
    cy.get('[data-canvas-inspector="true"]:visible [data-slot="canvas-relation-outputs"]').should(
      'not.be.visible'
    );
    const formulaForm = '[data-slot="canvas-derived-output-form"]';
    cy.get(formulaForm).find('input[name="alias"]').type('combined');
    cy.get(formulaForm)
      .find('[data-slot="formula-operand"][data-kind="field"] > span')
      .then(($labels) => {
        const formula = `CONCAT("${$labels.first().text()}", "${$labels.last().text()}")`;
        cy.get(formulaForm).find('.monaco-editor').click();
        cy.get(formulaForm)
          .find('.inputarea')
          .type(formula, { parseSpecialCharSequences: false, delay: 0 });
      });
    cy.get('[data-slot="canvas-relational-tree-apply"]').should('be.disabled');
    cy.get(formulaForm).find('button[type="submit"]').should('be.enabled').click();
    cy.get('[data-slot="canvas-transform-inspector"] [data-slot="canvas-derived-output"]:visible')
      .should('contain.text', 'combined')
      .and('contain.text', 'CONCAT');
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
    cy.get('[data-operator="project"][data-presentation="field_transform"]').click();
    cy.get('[data-slot="canvas-derived-output"]:visible').should('contain.text', 'combined');
    cy.get('[aria-label="Edit combined"]').click();
    cy.get('[data-canvas-inspector="true"]:visible [data-slot="canvas-relation-outputs"]').should(
      'not.be.visible'
    );
    cy.get(formulaForm).find('.view-lines').should('contain.text', 'CONCAT');
    cy.get('[data-slot="canvas-derived-output-cancel"]').click();
    cy.get('[data-canvas-inspector="true"]:visible [data-slot="canvas-relation-outputs"]').should(
      'be.visible'
    );
  });

  it('saves and reopens a mixed-input scalar predicate using the shared formula editor', () => {
    openEditor();
    cy.get('[data-operator="join"]').click();
    cy.get('[data-slot="canvas-operation-output-tab"]:visible').click();
    cy.get('[data-slot="canvas-relational-edit"]').click();
    cy.get('[data-slot="canvas-operation-output-tab"]:visible').should(
      'have.attr',
      'aria-selected',
      'true'
    );
    cy.get('[data-slot="canvas-operation-properties-tab"]:visible').click();
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
    cy.get('[data-slot="canvas-operation-output-tab"]:visible').click();
    cy.get('[data-canvas-inspector="true"]:visible')
      .invoke('attr', 'data-relation-id')
      .as('editedJoinId');
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
    cy.get('@editedJoinId').then((relationId) => {
      cy.get('[data-canvas-inspector="true"]:visible').should(
        'have.attr',
        'data-relation-id',
        relationId
      );
    });
    cy.get('[data-slot="canvas-operation-output-tab"]:visible').should(
      'have.attr',
      'aria-selected',
      'true'
    );
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
