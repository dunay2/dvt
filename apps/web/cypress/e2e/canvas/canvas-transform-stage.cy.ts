/** Real editor + stateful draft transport: Transform owns dataset field authoring. */
import {
  DVT_TRANSFORM_AUTHORING_AUTHORITY_METADATA_KEY,
  DvtTransformAuthoringAuthorityV1Schema,
  WorkspaceGraphDraftSaveRequestSchema,
} from '@dvt/contracts';
import { projectSubstraitToPostgresSql } from '@dvt/postgres-projection';
import { indexSubstraitRelations } from '@dvt/substrait-analysis';

import { decodeDvtSubstraitSemanticDocument } from '../../../src/app/views/canvas/canvasDvtSubstraitSemanticDocument';
import { readCanvasTransformDependencyModel } from '../../../src/app/views/canvas/canvasTransformDependencyModel';
import { transformExpressionDependencies } from '../../../src/app/views/canvas/canvasTransformExpressionReferences';
import { getE2eApiCalls } from '../../support/e2eApiStub';
import {
  visitWorkbenchCanvas,
  openWorkbenchModel,
  revisitWorkbenchCanvas,
} from '../../support/relationalWorkbench/navigation';
import { dragWorkbenchField } from '../../support/relationalWorkbench/pointer';
import { stubWorkbenchScenario } from '../../support/relationalWorkbench/scenario';
import { exerciseTransformFormulaAuthoring } from '../../support/relationalWorkbench/transformFormulaJourney';
import { exerciseTransformTreeSelection } from '../../support/relationalWorkbench/transformTreeJourney';

const inspector = '[data-slot="canvas-transform-inspector"]';
const card = '[data-slot="canvas-relational-tree-node"][data-operator="project"]';

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
    revisitWorkbenchCanvas();
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
    exerciseTransformFormulaAuthoring();
    exerciseTransformTreeSelection();
  });

  it('direct-saves A → B through producer edits and reopen, and preserves a rejected cycle draft', () => {
    const form = '[data-slot="canvas-derived-output-form"]';
    const formulaInput = '[data-slot="formula-editor"] .monaco-editor textarea';
    const formulaText = '[data-slot="formula-editor"] .view-lines';
    const modelId = 'transform-customers';
    const writes = (): ReturnType<typeof getE2eApiCalls> =>
      getE2eApiCalls('/workspace/graph/draft', 'PUT');
    let before = 0;
    let relationId = '';
    let retainedFieldIds: string[] = [];
    const outputIds = new Map<string, string>();
    let savedBody: unknown;
    cy.viewport(1280, 900);
    stubWorkbenchScenario('projection');
    visitWorkbenchCanvas();
    openWorkbenchModel(modelId);
    cy.get('[data-slot="canvas-model-save-status"]').should('have.text', 'Synced');
    cy.then(() => {
      before = writes().length;
    });
    cy.get(card)
      .should('have.length', 1)
      .invoke('attr', 'data-relation-id')
      .then((id) => {
        relationId = id!;
      });
    cy.get(card).click();
    cy.get(inspector).find('[data-slot="canvas-derived-output-trigger"]').should('be.visible');
    cy.get(inspector)
      .find('[data-slot="canvas-derived-output"]')
      .then(($outputs) => {
        retainedFieldIds = [...$outputs].map((output) => output.dataset.fieldId!);
      });
    for (const [ordinal, [alias, formula]] of (
      [
        ['A', "'original'"],
        ['B', 'UPPER(A)'],
      ] as const
    ).entries()) {
      cy.get(inspector).find('[data-slot="canvas-derived-output-trigger"]').click();
      cy.get(form).within(() => {
        cy.get('input[name="alias"]').type(alias);
        if (alias === 'B') {
          cy.get('[data-slot="formula-calculated-fields"]').contains('span', /^A$/).should('exist');
          cy.get('[data-slot="formula-input-fields"]')
            .find('span')
            .should(($names) => {
              expect([...$names].map((name) => name.textContent)).not.to.include('A');
            });
        }
        // Monaco owns this covered keyboard target; the rendered layer proves the draft.
        cy.get(formulaInput).type(formula, { force: true });
        cy.get(formulaText).should('contain.text', formula);
        cy.get('button[type="submit"]').should('be.enabled').click();
      });
      cy.get(form).should('not.exist');
      cy.wrap(null).should(() =>
        expect(writes().length, 'one direct save per accepted formula').to.equal(
          before + ordinal + 1
        )
      );
      cy.get('[data-slot="canvas-model-save-status"]').should('have.text', 'Synced');
      cy.contains(`${inspector} [data-slot="canvas-derived-output"] span`, new RegExp(`^${alias}$`))
        .closest('[data-slot="canvas-derived-output"]')
        .invoke('attr', 'data-field-id')
        .then((id) => {
          outputIds.set(alias, id!);
        });
    }
    cy.contains(`${inspector} [data-slot="canvas-derived-output"] span`, /^A$/)
      .closest('[data-slot="canvas-derived-output"]')
      .find('button')
      .click();
    cy.get(formulaInput).type('{selectall}{backspace}', { force: true });
    cy.get(formulaInput).type("'updated'", { force: true });
    cy.get(formulaText).should('have.text', "'updated'");
    cy.get(form).find('button[type="submit"]').should('be.enabled').click();
    cy.get(form).should('not.exist');
    cy.wrap(null).should(() =>
      expect(writes().length, 'one direct save for the producer edit').to.equal(before + 3)
    );
    cy.get('[data-slot="canvas-model-save-status"]').should('have.text', 'Synced');
    cy.then(async () => {
      expect(writes().length, 'three accepted formula commands').to.equal(before + 3);
      savedBody = writes().at(-1)!.body;
      const { draft } = WorkspaceGraphDraftSaveRequestSchema.parse(savedBody);
      const authority = DvtTransformAuthoringAuthorityV1Schema.parse(
        draft.nodes.find((node) => node.id === modelId)?.metadata?.[
          DVT_TRANSFORM_AUTHORING_AUTHORITY_METADATA_KEY
        ]
      );
      const document = decodeDvtSubstraitSemanticDocument(authority.semanticDocument);
      const indexed = indexSubstraitRelations(document);
      if (!indexed.ok) throw indexed.error;
      expect(indexed.index.rootId).to.equal(relationId);
      const dependencies = readCanvasTransformDependencyModel(
        indexed.index.relations.get(relationId)!,
        (id) => indexed.index.relations.get(id)!
      );
      expect(dependencies.definitions).to.have.length(retainedFieldIds.length + 2);
      expect(dependencies.root.fields.map((field) => field.fieldId)).to.include.members(
        retainedFieldIds
      );
      const a = dependencies.definitions.find(
        (definition) => definition.output?.displayName === 'A'
      )!;
      const b = dependencies.definitions.find(
        (definition) => definition.output?.displayName === 'B'
      )!;
      expect(a.output?.fieldId).to.equal(outputIds.get('A'));
      expect(b.output?.fieldId).to.equal(outputIds.get('B'));
      expect(transformExpressionDependencies(b.expression, b.inputIds)).to.deep.equal([a.id]);
      const projected = await projectSubstraitToPostgresSql(document);
      expect(projected.sql).to.include("'updated'").and.not.include("'original'");
      expect(projected.sql).to.match(/\bupper\s*\(/i);
    });
    revisitWorkbenchCanvas();
    openWorkbenchModel(modelId);
    cy.get('[data-slot="canvas-model-save-status"]').should('have.text', 'Synced');
    cy.get(card)
      .should('have.length', 1)
      .should(($card) => expect($card.attr('data-relation-id')).to.equal(relationId))
      .click();
    cy.contains(`${inspector} [data-slot="canvas-derived-output"] span`, /^B$/)
      .closest('[data-slot="canvas-derived-output"]')
      .find('button')
      .click();
    cy.get(formulaText).should('contain.text', 'UPPER(A)');
    cy.get(form).find('[data-slot="canvas-derived-output-cancel"]').click();
    cy.contains(`${inspector} [data-slot="canvas-derived-output"] span`, /^A$/)
      .closest('[data-slot="canvas-derived-output"]')
      .find('button')
      .click();
    cy.get(formulaText).should('contain.text', "'updated'");
    cy.get(formulaInput).type('{selectall}{backspace}', { force: true });
    cy.get(formulaInput).type('UPPER(B)', { force: true });
    cy.get(formulaText).should('have.text', 'UPPER(B)');
    cy.get(form).find('button[type="submit"]').should('be.enabled').click();
    cy.get(form)
      .find('[role="alert"]')
      .should('contain.text', 'cycle')
      .and('contain.text', 'A')
      .and('contain.text', 'B');
    cy.get(form).find('input[name="alias"]').should('have.value', 'A');
    cy.get(formulaText).should('contain.text', 'UPPER(B)');
    cy.get(card).should('have.length', 1);
    cy.then(() => {
      expect(writes().length, 'cycle rejection does not save').to.equal(before + 3);
      expect(writes().at(-1)!.body).to.deep.equal(savedBody);
    });
    cy.get(form).find('[data-slot="canvas-derived-output-cancel"]').click();
    cy.get(form).should('not.exist');
    cy.then(() => {
      expect(writes().length, 'discarding the rejected draft does not save').to.equal(before + 3);
      expect(writes().at(-1)!.body).to.deep.equal(savedBody);
    });
  });
});
