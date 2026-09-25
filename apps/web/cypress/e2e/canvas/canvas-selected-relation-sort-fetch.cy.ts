/** The same controls compose and edit either input; Apply owns persistence. */
import { SortField_SortDirection } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { indexSubstraitRelations } from '@dvt/substrait-analysis';

import { decodeDvtSubstraitSemanticDocument } from '../../../src/app/views/canvas/canvasDvtSubstraitSemanticDocument';
import { getE2eApiCalls } from '../../support/e2eApiStub';
import {
  openWorkbenchModel,
  visitWorkbenchCanvas,
} from '../../support/relationalWorkbench/navigation';
import { workbenchOperation } from '../../support/relationalWorkbench/operationMenu';
import {
  semanticDocumentFromWrite,
  semanticWrites,
} from '../../support/relationalWorkbench/persistence';
import { stubWorkbenchScenario } from '../../support/relationalWorkbench/scenario';

const form = '[data-slot="canvas-relational-operator-form"]';
function savedIndex(): import('@dvt/substrait-analysis').SubstraitRelationIndex {
  const write = semanticWrites('join-transform').at(-1);
  expect(write).not.to.equal(undefined);
  const indexed = indexSubstraitRelations(
    decodeDvtSubstraitSemanticDocument(semanticDocumentFromWrite(write!))
  );
  if (!indexed.ok) throw indexed.error;
  return indexed.index;
}

describe('Selected input Sort/Fetch (controlled API boundary)', () => {
  for (const operand of [0, 1])
    it(`composes, edits, reopens and removes on operand ${operand}`, () => {
      stubWorkbenchScenario('saved-join');
      cy.viewport(1440, 1000);
      visitWorkbenchCanvas();
      openWorkbenchModel();
      let inputId = '';
      let sortId = '';
      let fetchId = '';
      cy.get('[data-operator="read"]')
        .eq(operand)
        .then(($node) => {
          inputId = $node.attr('data-relation-id')!;
        })
        .click();
      workbenchOperation('sort').click();
      cy.get(`${form} button[type="submit"]`).click();
      cy.get('[data-operator="sort"]')
        .then(($node) => {
          sortId = $node.attr('data-relation-id')!;
        })
        .click();
      workbenchOperation('fetch').click();
      cy.contains('[role="dialog"] label', /^LIMIT$/)
        .find('input')
        .type('9');
      cy.get('[role="dialog"] button[type="submit"]').click();
      cy.get('[data-operator="fetch"]').then(($node) => {
        fetchId = $node.attr('data-relation-id')!;
      });
      cy.then(() => {
        const index = savedIndex();
        expect(index.relations.has(sortId)).to.equal(false);
        expect(index.relations.has(fetchId)).to.equal(false);
      });
      cy.get('[data-slot="canvas-relational-tree-apply"]').click();
      cy.wrap(null).should(() => {
        const index = savedIndex();
        expect(index.relations.get(sortId)!.inputs).to.deep.equal([inputId]);
        expect(index.relations.get(fetchId)!.inputs).to.deep.equal([sortId]);
        expect(index.relations.get(index.rootId)!.inputs[operand]).to.equal(fetchId);
      });
      cy.get('[data-slot="canvas-model-tab-close"]').click();
      visitWorkbenchCanvas();
      openWorkbenchModel();
      cy.get('[data-operator="sort"]')
        .should(($node) => expect($node.attr('data-relation-id')).to.equal(sortId))
        .click();
      cy.get(`${form} select`).eq(1).select(String(SortField_SortDirection.DESC_NULLS_FIRST));
      cy.get(`${form} button[type="submit"]`).click();
      cy.get('[data-operator="fetch"]').click();
      cy.contains(`${form} label`, /^LIMIT$/)
        .find('input')
        .should('have.value', '9')
        .clear()
        .type('2');
      cy.get(`${form} button[type="submit"]`).click();
      cy.get('[data-slot="canvas-relational-tree-apply"]').click();
      cy.wrap(null).should(() => {
        const index = savedIndex();
        const sort = index.relations.get(sortId)!.relation.relType;
        const fetch = index.relations.get(fetchId)!.relation.relType;
        expect(sort.case).to.equal('sort');
        expect(fetch.case).to.equal('fetch');
        if (sort.case === 'sort')
          expect(sort.value.sorts[0]!.sortKind).to.deep.equal({
            case: 'direction',
            value: SortField_SortDirection.DESC_NULLS_FIRST,
          });
        if (fetch.case === 'fetch')
          expect(fetch.value.countExpr?.rexType).to.have.nested.property(
            'value.literalType.value',
            2n
          );
        expect(index.relations.get(index.rootId)!.inputs[operand]).to.equal(fetchId);
      });
      cy.get('[data-operator="sort"]').click();
      cy.contains(`${form} button`, 'Remove operation').click();
      cy.get('[data-operator="sort"]').should('not.exist');
      cy.get('[data-slot="canvas-relational-tree-apply"]').click();
      cy.wrap(null).should(() => {
        const index = savedIndex();
        expect(index.relations.has(sortId)).to.equal(false);
        expect(index.relations.get(fetchId)!.inputs).to.deep.equal([inputId]);
      });
      cy.then(() => {
        expect(getE2eApiCalls(/data-sample/, 'GET')).to.have.length(0);
        expect(getE2eApiCalls('/runs/start', 'POST')).to.have.length(0);
      });
    });
});
