/**
 * Owned concern: prove unary editing, persistence and discardable removal through Canvas gestures.
 * @baseline GH-3578: an applied operation opens inspection before its explicit Edit action.
 * @decision Enter the existing draft editor before exercising the canonical operator form.
 * @consequence Values, relation identities and Cancel restoration remain observable end to end.
 * @version 1.0.0
 */
import { SortField_SortDirection } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { deriveSubstraitSchemas } from '@dvt/substrait-analysis';

import { decodeDvtSubstraitSemanticDocument } from '../../../src/app/views/canvas/canvasDvtSubstraitSemanticDocument';
import {
  connectWorkbenchProducer,
  openWorkbenchModel,
  revisitWorkbenchCanvas,
  stageWorkbenchUnary,
} from '../../support/relationalWorkbench/navigation';
import { form, openEditor, activateMenu } from '../../support/relationalWorkbench/operatorEditor';
import {
  semanticDocumentFromWrite,
  semanticWrites,
} from '../../support/relationalWorkbench/persistence';

function savedIndex(): ReturnType<typeof deriveSubstraitSchemas>['index'] {
  const write = semanticWrites('join-transform').at(-1);
  expect(write, 'saved canonical document').not.to.equal(undefined);
  return deriveSubstraitSchemas(
    decodeDvtSubstraitSemanticDocument(semanticDocumentFromWrite(write!))
  ).index;
}

describe('unary-lifecycle', () => {
  it('edits FILTER and a source ROW_NUMBER through the same canonical projection', () => {
    openEditor();
    cy.get('[data-operator="join"]').rightclick();
    cy.get('[data-slot="canvas-relational-remove-left"]').click();
    stageWorkbenchUnary('filter', '[data-operator="read"]', true);
    cy.get(form).find('input').type('C-001');
    cy.get(form).find('button[type="submit"]').click();
    cy.get('[data-operator="filter"]').should('have.length', 1);
    let filterId = '';
    let inputId = '';
    cy.get('[data-operator="filter"]').then(($node) => {
      filterId = $node.attr('data-relation-id')!;
    });
    cy.get('[data-operator="read"]').then(($node) => {
      inputId = $node.attr('data-relation-id')!;
    });
    cy.get('[data-operator="filter"]').closest('li').as('filter');
    connectWorkbenchProducer('@filter', '[data-slot="canvas-relational-output-input-port"]', null);
    cy.get('[data-slot="canvas-relational-tree-apply"]').click();
    cy.get('[data-slot="canvas-model-save-status"]').should('have.text', 'Synced');
    cy.then(() => {
      const index = savedIndex();
      expect(index.rootId).to.equal(filterId);
      expect(index.relations.get(filterId)!.inputs).to.deep.equal([inputId]);
    });
    cy.get('[data-operator="filter"]').rightclick();
    activateMenu('canvas-relational-edit-operation');
    cy.get('[data-slot="canvas-relational-edit"]').should('be.visible').click();
    cy.get(form).find('input').should('have.value', 'C-001');
    cy.contains(form + ' button', 'Remove operation').click();
    cy.get('[data-operator="filter"]').should('not.exist');
    stageWorkbenchUnary('window', '[data-operator="read"]', true);
    cy.get(form).find('select').should('exist');
    cy.get(form).find('input').clear().type('source_row');
    cy.get(form).find('button[type="submit"]').click();
    cy.get('[data-slot="canvas-relational-node-title"]').should('contain.text', 'Window');
    cy.get('[data-presentation="window"]').closest('li').as('window');
    connectWorkbenchProducer('@window', '[data-slot="canvas-relational-output-input-port"]', null);
    cy.get('[data-slot="canvas-relational-tree-apply"]').click();
    cy.get('[data-slot="canvas-relational-tree-apply"]').should('not.exist');
    cy.get('[data-slot="canvas-model-save-status"]').should('have.text', 'Synced');
    cy.then(() => {
      const index = savedIndex();
      expect(index.relations.has(filterId)).to.equal(false);
      expect(index.relations.get(index.rootId)!.inputs).to.deep.equal([inputId]);
      expect(index.relations.get(index.rootId)!.fields.at(-1)?.displayName).to.equal('source_row');
    });
  });
  it('authors, reopens, edits and contextually removes ORDER BY below LIMIT', () => {
    openEditor();
    stageWorkbenchUnary('sort', '[data-operator="join"]', true);
    cy.get(form).find('button').contains('Add key').click();
    cy.get(form).find('select[aria-label^="Field"]').should('have.length', 2);
    cy.get(form).find('select[aria-label="Field 2"]').select(1);
    cy.get(form).find('select[aria-label="Direction and nulls 1"]').select('DESC · NULLS LAST');
    cy.get(form).find('button[type="submit"]').click();
    cy.get('[data-operator="sort"]').should('have.length', 1);

    stageWorkbenchUnary('fetch', '[data-operator="sort"]');
    cy.get(form).find('input').eq(0).clear().type('2');
    cy.get(form).find('input').eq(1).clear().type('3');
    cy.get(form).find('button[type="submit"]').click();
    cy.get('[data-operator="fetch"]').should('have.length', 1);
    cy.get('[data-operator="sort"]')
      .invoke('attr', 'data-relation-id')
      .should('be.a', 'string')
      .as('sortRelationId', { type: 'static' });
    cy.get('[data-operator="fetch"]')
      .invoke('attr', 'data-relation-id')
      .should('be.a', 'string')
      .as('fetchRelationId', { type: 'static' });
    cy.get('[data-operator="fetch"]').closest('li').as('fetch');
    connectWorkbenchProducer('@fetch', '[data-slot="canvas-relational-output-input-port"]', null);
    cy.get('[data-slot="canvas-relational-tree-apply"]').click();
    cy.get('[data-slot="canvas-model-save-status"]').should('have.text', 'Synced');
    cy.get('[data-operator="sort"]').should('contain.text', 'DESC NULLS LAST');
    cy.get('[data-operator="fetch"]').should('contain.text', 'LIMIT 3 · OFFSET 2');
    let first: ReturnType<typeof savedIndex>;
    cy.then(() => {
      first = savedIndex();
    });
    cy.get<string>('@sortRelationId').then((relationId) => {
      expect(first.relations.get(first.rootId)!.inputs).to.deep.equal([relationId]);
    });
    cy.get<string>('@fetchRelationId').then((relationId) => {
      expect(first.rootId).to.equal(relationId);
    });

    cy.get('[data-operator="sort"]').rightclick();
    activateMenu('canvas-relational-edit-operation');
    cy.get('[data-slot="canvas-relational-edit"]').should('be.visible').click();
    cy.get('[data-slot="canvas-relational-tree-inline-editor"]')
      .find('select[aria-label="Direction and nulls 1"]')
      .select('ASC · NULLS FIRST');
    cy.get('[data-slot="canvas-relational-tree-inline-editor"] button[type="submit"]').click();
    cy.get('[data-operator="sort"]').should('contain.text', 'ASC NULLS FIRST');
    cy.get('[data-operator="fetch"]').should('exist');

    cy.get('[data-slot="canvas-relational-tree-apply"]').click();
    cy.wrap(null).should(() => {
      const index = savedIndex();
      expect(index.rootId).to.equal(first.rootId);
      expect([...index.relations.keys()]).to.have.members([...first.relations.keys()]);
      const fetched = index.relations.get(index.rootId)!;
      expect(fetched.relation.relType.case).to.equal('fetch');
      expect(fetched.inputs).to.deep.equal(first.relations.get(first.rootId)!.inputs);
      expect(fetched.fields.map((field) => field.fieldId)).to.deep.equal(
        first.relations.get(first.rootId)!.fields.map((field) => field.fieldId)
      );
      if (fetched.relation.relType.case === 'fetch') {
        expect(fetched.relation.relType.value.countExpr?.rexType).to.have.nested.property(
          'value.literalType.value',
          3n
        );
        expect(fetched.relation.relType.value.offsetExpr?.rexType).to.have.nested.property(
          'value.literalType.value',
          2n
        );
      }
      const sorted = index.relations.get(fetched.inputs[0]!)!.relation.relType;
      expect(sorted.case).to.equal('sort');
      if (sorted.case === 'sort') {
        expect(sorted.value.sorts).to.have.length(2);
        expect(sorted.value.sorts[0]!.sortKind).to.deep.equal({
          case: 'direction',
          value: SortField_SortDirection.ASC_NULLS_FIRST,
        });
      }
    });

    cy.get('[data-slot="canvas-model-save-status"]').should('have.text', 'Synced');
    revisitWorkbenchCanvas();
    openWorkbenchModel();
    cy.get<string>('@sortRelationId').then((relationId) => {
      cy.get(`[data-operator="sort"][data-relation-id="${relationId}"]`).rightclick();
    });
    activateMenu('canvas-relational-remove-source');
    cy.get('[data-operator="sort"]').should('not.exist');
    cy.get<string>('@fetchRelationId').then((relationId) => {
      cy.get(`[data-operator="fetch"][data-relation-id="${relationId}"]`).should('exist');
    });
    cy.get('[data-slot="canvas-relational-tree-cancel"]').click();
    cy.get('[data-operator="sort"], [data-operator="fetch"]').should('have.length', 2);
    cy.get<string>('@sortRelationId').then((relationId) => {
      cy.get(`[data-operator="sort"][data-relation-id="${relationId}"]`).should(
        'contain.text',
        'ASC NULLS FIRST'
      );
    });
    cy.get<string>('@fetchRelationId').then((relationId) => {
      cy.get(`[data-operator="fetch"][data-relation-id="${relationId}"]`).should(
        'contain.text',
        'LIMIT 3 · OFFSET 2'
      );
    });
  });
});
