/** One stateful journey through Transform Output selection and definition removal. */
import {
  DVT_TRANSFORM_AUTHORING_AUTHORITY_METADATA_KEY,
  DvtTransformAuthoringAuthorityV1Schema,
  type WorkspaceGraphAuthoringDraft,
} from '@dvt/contracts';
import { indexSubstraitRelations, readSubstraitAuthoringGroup } from '@dvt/substrait-analysis';

import { decodeDvtSubstraitSemanticDocument } from '../../../src/app/views/canvas/canvasDvtSubstraitSemanticDocument';
import { readCanvasTransformDependencyModel } from '../../../src/app/views/canvas/canvasTransformDependencyModel';
import { getE2eApiCalls } from '../e2eApiStub';

import { openWorkbenchModel, visitWorkbenchCanvas } from './navigation';
import { dragWorkbenchField } from './pointer';

const inspector = '[data-slot="canvas-transform-inspector"]';
const card = '[data-slot="canvas-relational-tree-node"][data-operator="project"]';

function expectSavedExpressionCount(count: number): void {
  cy.wrap(null).should(() => {
    const saved = getE2eApiCalls('/workspace/graph/draft', 'PUT').at(-1)?.body as {
      draft: WorkspaceGraphAuthoringDraft;
    };
    const authority = DvtTransformAuthoringAuthorityV1Schema.parse(
      saved.draft.nodes.find((node) => node.id === 'join-transform')!.metadata?.[
        DVT_TRANSFORM_AUTHORING_AUTHORITY_METADATA_KEY
      ]
    );
    const indexed = indexSubstraitRelations(
      decodeDvtSubstraitSemanticDocument(authority.semanticDocument)
    );
    if (!indexed.ok) throw indexed.error;
    const group = readSubstraitAuthoringGroup(indexed.index, indexed.index.rootId);
    expect(group, 'explicit Transform ownership').not.to.equal(null);
    const model = readCanvasTransformDependencyModel(group!.root, (id) =>
      indexed.index.relations.get(id)!
    );
    expect(model.definitions, 'saved expression definitions in this Transform').to.have.length(
      count
    );
  });
}

export function exerciseTransformTreeSelection(): void {
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
  cy.get(card)
    .closest('li')
    .find('[data-slot="canvas-relational-expression-remove"]')
    .should('have.length', 3);
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
  cy.get('[data-slot="canvas-relational-tree-apply"]').should('not.exist');
  cy.get('[data-slot="canvas-model-save-status"]').should('contain.text', 'Synced');
  expectSavedExpressionCount(3);
  visitWorkbenchCanvas();
  openWorkbenchModel();
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
  // Reproduce the reported TRIM: exclude its output, then delete its complete definition.
  cy.get(card)
    .closest('li')
    .find('[data-slot="canvas-relational-node-expand"]')
    .then(($button) => {
      if ($button.attr('aria-expanded') !== 'true') cy.wrap($button).click();
    });
  cy.get(inspector)
    .find('[data-slot="relation-output-toggle"][data-field-name="CAMPO_PRUEBA"]')
    .click()
    .should('have.attr', 'data-included', 'false');
  // An excluded calculated result must remain recognizable, not just expression_N.
  cy.get(inspector)
    .find('[data-slot="relation-output-toggle"][data-included="false"]')
    .filter('[data-field-name="CAMPO_PRUEBA"]')
    .as('calculatedOutput', { type: 'static' })
    .closest('[data-slot="relation-output-field"]')
    .find('input')
    .should('have.value', 'CAMPO_PRUEBA');
  cy.get('@calculatedOutput')
    .closest('[data-slot="relation-output-field"]')
    .find('[data-slot="relation-output-expression"]')
    .should(($expression) => expect($expression.text()).to.match(/^TRIM\(.+\)$/));
  cy.get('@calculatedOutput').click().should('have.attr', 'data-included', 'true');
  cy.get('@calculatedOutput')
    .closest('[data-slot="relation-output-field"]')
    .find('[data-slot="relation-output-expression"]')
    .should(($expression) => expect($expression.text()).to.match(/^TRIM\(.+\)$/));
  cy.screenshot('transform-recognizable-calculated-output');
  cy.get('@calculatedOutput').click().should('have.attr', 'data-included', 'false');
  const tree = '[data-operator="project"]';
  let retainedOutputIds: string[] = [];
  cy.get(tree)
    .closest('li')
    .find(selectedFields)
    .then(($fields) => {
      retainedOutputIds = [...$fields].map((field) => field.dataset.fieldId!);
    });
  cy.get(tree)
    .closest('li')
    .find('[data-kind="expression"]')
    .contains('TRIM')
    .closest('[data-slot="canvas-relational-expression-node"]')
    .should(($token) => expect($token).not.to.have.attr('data-field-id'))
    .parent()
    .find('[data-slot="canvas-relational-expression-remove"]')
    .should('be.enabled')
    .click();
  cy.get(tree)
    .closest('li')
    .find('[data-slot="canvas-relational-card-detail"]')
    .should('not.contain.text', 'TRIM');
  cy.get(tree)
    .closest('li')
    .find(selectedFields)
    .should(($fields) => {
      expect([...$fields].map((field) => field.dataset.fieldId)).to.deep.equal(retainedOutputIds);
    });
  cy.then(() => {
    writesBeforeRemoval = getE2eApiCalls('/workspace/graph/draft', 'PUT').length;
  });
  cy.get('[data-slot="canvas-relational-tree-apply"]').should('be.enabled').click();
  cy.wrap(null).should(() =>
    expect(getE2eApiCalls('/workspace/graph/draft', 'PUT').length).to.be.greaterThan(
      writesBeforeRemoval
    )
  );
  cy.get('[data-slot="canvas-relational-tree-apply"]').should('not.exist');
  cy.get('[data-slot="canvas-model-save-status"]').should('contain.text', 'Synced');
  expectSavedExpressionCount(2);
  visitWorkbenchCanvas();
  openWorkbenchModel();
  cy.get(card).click();
  cy.get(inspector)
    .find('[data-slot="canvas-derived-output"]')
    .should('have.length', 2)
    .and('not.contain.text', 'CAMPO_PRUEBA');
  cy.get(card)
    .closest('li')
    .find('[data-slot="canvas-relational-node-expand"]')
    .then(($button) => {
      if ($button.attr('aria-expanded') !== 'true') cy.wrap($button).click();
    });
  cy.get(card)
    .closest('li')
    .find('[data-slot="canvas-relational-card-detail"]')
    .should('not.contain.text', 'TRIM');
  cy.screenshot('transform-trim-definition-removed');
}
