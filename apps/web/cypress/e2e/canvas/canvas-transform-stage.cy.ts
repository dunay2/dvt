/** Real editor + stateful draft transport: Transform owns dataset field authoring. */
import { getE2eApiCalls } from '../../support/e2eApiStub';
import { visitWorkbenchCanvas } from '../../support/relationalWorkbench/navigation';
import { dragWorkbenchField } from '../../support/relationalWorkbench/pointer';
import { stubWorkbenchScenario } from '../../support/relationalWorkbench/scenario';

const inspector = '[data-slot="canvas-transform-inspector"]';
const form = '[data-slot="canvas-derived-output-form"]';
const card = '[data-slot="canvas-relational-tree-node"][data-operator="project"]';
const formulaInput = '[data-slot="formula-editor"] .monaco-editor textarea';
const formulaText = '[data-slot="formula-editor"] .view-lines';

function openModel(): void {
  cy.get('.react-flow__node[data-id="join-transform"] [data-slot="canvas-node-shell"]')
    .should('be.visible')
    .focus()
    .type('{enter}');
  cy.get('[data-slot="canvas-relational-tree-workbench"]').should('be.visible');
}

describe('Semantic dataset Transform', () => {
  it('connects exactly one dragged Output field into an empty Transform and keeps it after reopen', () => {
    cy.viewport(1280, 720);
    stubWorkbenchScenario('saved-join');
    visitWorkbenchCanvas();
    openModel();
    cy.get('[data-slot="canvas-operation-menu-trigger"]').click();
    cy.get('[data-operation="field_transform"]').click();
    cy.get('[data-operator="join"]')
      .closest('li')
      .find('[data-slot="canvas-relational-node-expand"]')
      .click();
    const input = '[data-pending-operation="true"] [data-slot="canvas-relational-input-port"]';
    let fieldName = '';
    const lifecycle: string[] = [];
    cy.window().then((window) => {
      for (const type of ['dragstart', 'pointercancel', 'dragover', 'drop', 'dragend']) {
        window.document.addEventListener(
          type,
          (event) => {
            if (type !== 'dragover' || !lifecycle.at(-1)?.startsWith('dragover'))
              lifecycle.push(`${type}:${event.isTrusted}`);
          },
          true
        );
      }
    });
    const dropField = (): void => {
      cy.get('[data-slot="canvas-relational-tree-fit"]').click();
      cy.get('[data-operator="join"]')
        .closest('li')
        .find('[data-field-selection="output"]')
        .last()
        .as('connectionField')
        .then(($field) => {
          fieldName = $field.attr('title')!;
          dragWorkbenchField('@connectionField', input);
        });
    };
    // A producer already consumed by terminal Output cannot silently acquire fan-out.
    dropField();
    cy.then(() => expect(lifecycle, 'trusted browser drag lifecycle').to.include('drop:true'));
    cy.get('[data-slot="canvas-field-selection-error"]').should('be.visible');
    cy.get(input).should('not.have.attr', 'data-connected');
    cy.get('[data-slot="canvas-relational-output-input-port"]').focus().type('{del}');
    dropField();
    cy.get(input).should('have.attr', 'data-connected', 'true');
    cy.get('[data-slot="canvas-field-selection-error"]').should('not.exist');
    cy.get(inspector).find('[data-slot="canvas-operation-output-tab"]').click();
    const included = '[data-slot="relation-output-toggle"][data-included="true"]';
    cy.get(inspector)
      .find(included)
      .should('have.length', 1)
      .should(($field) => expect($field.attr('data-field-name')).to.equal(fieldName));
    cy.window().then((window) => {
      const dataTransfer = new window.DataTransfer();
      cy.get('[data-pending-operation="true"] [data-slot="canvas-relational-output-port"]').trigger(
        'dragstart',
        { dataTransfer }
      );
      cy.get('[data-slot="canvas-relational-output-input-port"]')
        .trigger('dragover', { dataTransfer })
        .trigger('drop', { dataTransfer });
    });
    let writes = 0;
    cy.then(() => {
      writes = getE2eApiCalls('/workspace/graph/draft', 'PUT').length;
    });
    cy.get('[data-slot="canvas-relational-tree-apply"]').should('be.enabled').click();
    cy.wrap(null).should(() =>
      expect(getE2eApiCalls('/workspace/graph/draft', 'PUT').length).to.be.greaterThan(writes)
    );
    visitWorkbenchCanvas();
    openModel();
    cy.get(card).click();
    cy.get(inspector).find('[data-slot="canvas-operation-output-tab"]').click();
    cy.get(inspector)
      .find(included)
      .should('have.length', 1)
      .should(($field) => expect($field.attr('data-field-name')).to.equal(fieldName));
    cy.screenshot('transform-single-field-connection-reopened');
  });

  it('adds fields in one fixed inspector, persists, and reopens the same Transform', () => {
    cy.viewport(1280, 720);
    stubWorkbenchScenario('saved-join');
    visitWorkbenchCanvas();
    openModel();
    cy.get('[data-slot="canvas-relational-tree-node"][data-operator="read"]').first().click();
    cy.get('[data-slot="canvas-derived-output-trigger"]').should('not.exist');
    cy.get('[data-slot="canvas-operation-menu-trigger"]').click();
    cy.get('[data-operation="field_transform"]')
      .should('have.attr', 'aria-disabled', 'false')
      .click();
    cy.get('[data-pending-operation="true"]').should('have.length', 1);
    cy.get('[data-slot="canvas-relational-output-input-port"]').focus().type('{del}');
    cy.window().then((window) => {
      const dataTransfer = new window.DataTransfer();
      cy.get('[data-operator="join"]')
        .closest('li')
        .find('[data-slot="canvas-relational-output-port"]')
        .trigger('dragstart', { dataTransfer });
      cy.get('[data-pending-operation="true"] [data-slot="canvas-relational-input-port"]')
        .trigger('dragover', { dataTransfer })
        .trigger('drop', { dataTransfer });
    });
    cy.get(inspector)
      .should('be.visible')
      .and(($panel) => {
        const bounds = $panel[0]!.getBoundingClientRect();
        expect(bounds.right).to.be.closeTo(1280, 30);
      });
    cy.get(form).should('not.exist');
    cy.get(inspector).find('[data-slot="canvas-derived-output-trigger"]').click();
    cy.get(form).within(() => {
      cy.get('input[name="alias"]').type('normalized_name');
      cy.get('[data-slot="formula-operand"][data-kind="field"]').should('not.be.empty');
      cy.contains('.formula-palette-tabs button', 'Functions').click();
      cy.contains('[data-slot="formula-operand"]', 'UPPER').click();
      cy.get(formulaInput).type("'hola'", { force: true });
      cy.get(formulaText).should('contain.text', "UPPER('hola')");
      cy.get('.formula-result').should('contain.text', 'string').and('contain.text', 'UPPER');
      cy.get(formulaInput).type("{selectall}COALESCE(UPPER('hola'), NULL)", { force: true });
      cy.get('.formula-result')
        .should('contain.text', 'NULL')
        .and('not.contain.text', '[object Object]');
      cy.get('[data-slot="formula-editor"] .squiggly-error').should('not.exist');
      cy.get('button[type="submit"]').should(($button) => {
        const bounds = $button[0]!.getBoundingClientRect();
        expect(bounds.bottom).to.be.lessThan(720);
        expect(bounds.top).to.be.greaterThan(0);
      });
      cy.get('button[type="submit"]').should('be.enabled').click();
    });
    cy.get(form).should('not.exist');

    cy.get(inspector).find('[data-slot="canvas-derived-output-trigger"]').click();
    cy.get(form).within(() => {
      cy.get('input[name="alias"]').type('fallback_name');
      cy.get(formulaInput).should('exist');
      cy.contains('.formula-tools button', 'Empty text').click();
      cy.get('.formula-result').should('contain.text', 'no field dependencies');
      cy.get('button[type="submit"]').should('be.enabled').click();
    });
    cy.get(form).should('not.exist');

    cy.get(inspector).find('[data-slot="canvas-derived-output-trigger"]').click();
    cy.get(form).within(() => {
      cy.get('input[name="alias"]').type('total');
      cy.get(formulaInput).type('(2 + 3) * 4', { force: true });
      cy.get('.formula-result').should('contain.text', 'bigint').and('contain.text', 'MULTIPLY');
      cy.get('button[type="submit"]').should('be.enabled').click();
    });
    cy.get(form).should('not.exist');
    cy.get(inspector)
      .find('[data-slot="canvas-derived-output"]')
      .contains('fallback_name')
      .closest('[data-slot="canvas-derived-output"]')
      .as('editableOutput');
    cy.get('@editableOutput')
      .invoke('attr', 'data-field-id')
      .then((fieldId) => {
        cy.get('@editableOutput').find('button').click();
        cy.get(form).within(() => {
          cy.get(formulaText).should('contain.text', "''");
          cy.get(formulaInput).type("{selectall}CONCAT('hola', ' ', 'mundo')", { force: true });
          cy.get('button[type="submit"]').click();
        });
        cy.get(inspector)
          .find(`[data-slot="canvas-derived-output"][data-field-id="${fieldId}"]`)
          .should('contain', 'fallback_name')
          .and('contain', 'CONCAT');
      });
    cy.viewport(1280, 600);
    cy.get(inspector).find('[data-slot="canvas-derived-output-trigger"]').click();
    cy.get(form).within(() => {
      cy.get('input[name="alias"]').type('CAMPO_PRUEBA');
      cy.get('[data-slot="formula-operand"][data-kind="field"]').first().click();
      cy.get(formulaInput).type('{selectall}', { force: true });
      cy.contains('.formula-palette-tabs button', 'Functions').click();
      cy.contains('[data-slot="formula-operand"]', 'TRIM').click();
      cy.get('.formula-result').should('contain.text', 'TRIM');
      cy.get('button[type="submit"]')
        .should('be.enabled')
        .and(($button) => {
          expect($button[0]!.getBoundingClientRect().bottom).to.be.lessThan(600);
        })
        .click();
    });
    cy.get(form).should('not.exist');
    cy.viewport(1280, 720);
    cy.get(inspector).find('[data-slot="canvas-operation-output-tab"]').click();
    cy.get(inspector).find('input').filter('[value="normalized_name"]').should('exist');
    cy.get(inspector)
      .find('[data-slot="relation-output-toggle"]')
      .first()
      .as('outputToggle')
      .focus()
      .click()
      .should('have.attr', 'data-included', 'false')
      .and('be.focused');
    cy.window().then((window) => {
      const dataTransfer = new window.DataTransfer();
      cy.get('[data-pending-operation="true"] [data-slot="canvas-relational-output-port"]').trigger(
        'dragstart',
        { dataTransfer }
      );
      cy.get('[data-slot="canvas-relational-output-input-port"]')
        .trigger('dragover', { dataTransfer })
        .trigger('drop', { dataTransfer });
    });
    cy.get('[data-slot="canvas-relational-tree-apply"]').should('be.enabled').click();
    cy.get(card).should('have.length', 1);
    cy.get('[data-pending-operation="true"]').should('not.exist');
    cy.wrap(null).should(() => {
      const saved = JSON.stringify(getE2eApiCalls('/workspace/graph/draft', 'PUT').at(-1)?.body);
      expect(saved).to.include('normalized_name').and.include('fallback_name');
    });
    visitWorkbenchCanvas();
    openModel();
    cy.get(card).should('have.length', 1).click();
    cy.get(inspector).should('be.visible');
    cy.get(form).should('not.exist');
    cy.get(inspector)
      .find('[data-slot="canvas-derived-output"]')
      .should('have.length', 4)
      .and('contain', 'CAMPO_PRUEBA')
      .and('contain', 'NULL')
      .and('contain', 'CONCAT')
      .and('contain', 'total');
    cy.screenshot('transform-name-formula-properties');
    cy.get(inspector)
      .find('[data-slot="canvas-derived-output"]')
      .contains('fallback_name')
      .closest('[data-slot="canvas-derived-output"]')
      .find('button')
      .click();
    cy.get(form).find('input[name="alias"]').should('have.value', 'fallback_name');
    cy.get(formulaText).should('contain.text', "'mundo'");
    cy.get(card).closest('li').find('[data-slot="canvas-relational-node-expand"]').click();
    cy.get(card)
      .closest('li')
      .find('[data-slot="canvas-relational-card-detail"]')
      .should('contain.text', 'INPUT')
      .and('contain.text', 'OUTPUT');
    let writesBeforeDrag = 0;
    cy.then(() => {
      writesBeforeDrag = getE2eApiCalls('/workspace/graph/draft', 'PUT').length;
    });
    cy.get(formulaInput).type('{selectall}UPPER(){leftarrow}', { force: true });
    cy.window().then((window) => {
      const dataTransfer = new window.DataTransfer();
      cy.get(card)
        .closest('li')
        .find(
          '[data-slot="canvas-relational-expression-node"][data-kind="expression"][draggable="true"]'
        )
        .first()
        .trigger('dragstart', { dataTransfer });
      cy.get('[data-slot="formula-editor"]')
        .trigger('dragover', { dataTransfer })
        .trigger('drop', { dataTransfer });
      cy.get(formulaText).should('contain.text', 'UPPER("normalized_name")');
      cy.get('[data-slot="formula-editor"] .squiggly-error').should('not.exist');
    });
    cy.get(form).find('button[type="submit"]').should('be.enabled');
    cy.then(() =>
      expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(writesBeforeDrag)
    );
    cy.screenshot('transform-name-formula-edit');
    cy.get(form).screenshot('transform-assisted-form');
    cy.get(formulaInput)
      .type('{selectall}UPP', { force: true })
      // Monaco's keyboard input is intentionally covered by its rendered code layer.
      .trigger('keydown', {
        key: ' ',
        code: 'Space',
        keyCode: 32,
        which: 32,
        ctrlKey: true,
        force: true,
      });
    cy.get('.suggest-widget.visible').should('contain.text', 'UPPER');
    cy.get(formulaInput).type('{esc}', { force: true });
    cy.get(form).should('exist');
    cy.get(formulaInput).trigger('keydown', {
      key: ' ',
      code: 'Space',
      keyCode: 32,
      which: 32,
      ctrlKey: true,
      force: true,
    });
    cy.get('.suggest-widget.visible').contains('.monaco-list-row', 'UPPER').click();
    cy.get(formulaText).should('contain.text', 'UPPER()');
    cy.get(formulaInput).type('{selectall}UPPER(missing)', { force: true });
    cy.get('.formula-diagnostic').should('contain.text', 'Unknown');
    cy.get(form).find('button[type="submit"]').should('be.disabled');
    cy.get(form).find('[data-slot="canvas-derived-output-cancel"]').click();
    cy.get(inspector).find('[data-slot="canvas-operation-output-tab"]').click();
    cy.get(inspector).find('input').filter('[value="fallback_name"]').should('exist');
    cy.screenshot('transform-fixed-output');
    cy.get('[data-slot="canvas-relational-tree-node"][data-operator="join"]').click();
    cy.get('[data-slot="canvas-derived-output-trigger"]').should('not.exist');

    // Tree selection is the same canonical Output, not another editor or field edge.
    cy.get(card).click();
    cy.get(card)
      .closest('li')
      .find('[data-slot="canvas-relational-node-expand"]')
      .then(($button) => {
        if ($button.attr('aria-expanded') !== 'true') cy.wrap($button).click();
      });
    // Re-add only the previously excluded passthrough from the producer's Output.
    const selectedFields = '[data-kind="field"][data-field-selection="output"]';
    let beforeMapping = 0;
    let mappedName = '';
    cy.get(card)
      .closest('li')
      .find(selectedFields)
      .then(($fields) => {
        beforeMapping = $fields.length;
      });
    cy.get('[data-operator="join"]')
      .closest('li')
      .find('[data-slot="canvas-relational-node-expand"]')
      .then(($button) => {
        if ($button.attr('aria-expanded') !== 'true') cy.wrap($button).click();
      });
    cy.window().then((window) => {
      const dataTransfer = new window.DataTransfer();
      cy.get('[data-operator="join"]')
        .closest('li')
        .find(selectedFields)
        .first()
        .then(($field) => {
          mappedName = $field.attr('title')!;
        })
        .trigger('dragstart', { dataTransfer });
      cy.get(card)
        .closest('li')
        .find('[data-field-target][data-kind="relation"]')
        .first()
        .trigger('dragover', { dataTransfer })
        .trigger('drop', { dataTransfer });
    });
    cy.get(card)
      .closest('li')
      .find(selectedFields)
      .should(($fields) => expect($fields).to.have.length(beforeMapping + 1));
    // Cancelled and incompatible drops retain the selected expression.
    cy.window().then((window) => {
      const dataTransfer = new window.DataTransfer();
      cy.get(card)
        .closest('li')
        .find('[data-field-selection="output"]')
        .contains('total')
        .closest('[data-slot="canvas-relational-expression-node"]')
        .should('have.attr', 'role', 'button')
        .as('totalToken')
        .trigger('dragstart', { dataTransfer });
      cy.get('[data-slot="canvas-relational-tree-node"][data-operator="join"]').trigger('drop', {
        dataTransfer,
      });
      cy.get('@totalToken').trigger('dragend', { dataTransfer }).should('exist');
    });
    cy.window().then((window) => {
      const dataTransfer = new window.DataTransfer();
      cy.get('@totalToken')
        .trigger('dragstart', { dataTransfer })
        .trigger('keydown', { key: 'Escape' })
        .trigger('dragend', { dataTransfer });
      cy.get('@totalToken').should('exist');
    });
    // Explicit background drop removes exactly this expression; Apply/reopen proves persistence.
    cy.get('@totalToken').scrollIntoView();
    // The viewport center is occupied by a card: target its empty padding explicitly.
    dragWorkbenchField(
      '@totalToken',
      '[data-slot="canvas-relational-tree-viewport"], [data-slot="canvas-relational-tree-draft-viewport"]',
      { x: 5, y: 5 }
    );
    cy.get(card)
      .closest('li')
      .find('[data-field-selection="output"]')
      .should('not.contain.text', 'total');
    let writesBeforeRemoval = 0;
    cy.then(() => {
      writesBeforeRemoval = getE2eApiCalls('/workspace/graph/draft', 'PUT').length;
    });
    cy.get('[data-slot="canvas-relational-tree-apply"]').should('be.enabled').click();
    cy.get(card).click();
    cy.get(inspector)
      .find('[data-slot="canvas-derived-output"]')
      .should('have.length', 3)
      .and('not.contain.text', 'total');
    cy.wrap(null).should(() =>
      expect(getE2eApiCalls('/workspace/graph/draft', 'PUT').length).to.be.greaterThan(
        writesBeforeRemoval
      )
    );
    visitWorkbenchCanvas();
    openModel();
    cy.get(card).click();
    cy.get(inspector)
      .find('[data-slot="canvas-derived-output"]')
      .should('have.length', 3)
      .and('not.contain.text', 'total');
    cy.screenshot('transform-tree-field-selection');
    cy.get(inspector).find('[data-slot="canvas-operation-output-tab"]').click();
    cy.get(inspector)
      .find('[data-slot="relation-output-toggle"]')
      .should(($fields) => {
        expect($fields.filter((_, field) => field.dataset.fieldName === mappedName)).to.have.attr(
          'data-included',
          'true'
        );
      });
  });
});
