/**
 * Owned concern: preserve Filter authoring on either input of the original JOIN.
 * @baseline GH-3578: operation placement does not infer a connection from selection.
 * @decision Use explicit input connections and Edit before changing applied configuration.
 * @consequence Apply/reload retain identities, output order and zero implicit queries.
 * @version 1.0.0
 */
import { indexSubstraitRelations } from '@dvt/substrait-analysis';

import { decodeDvtSubstraitSemanticDocument } from '../../../src/app/views/canvas/canvasDvtSubstraitSemanticDocument';
import { dvtSubstraitTextComparison } from '../../../src/app/views/canvas/canvasDvtSubstraitTextComparison';
import { getE2eApiCalls } from '../../support/e2eApiStub';
import { exteriorOutputColumns } from '../../support/relationalWorkbench/columns';
import {
  openWorkbenchModel,
  visitWorkbenchCanvas,
  connectWorkbenchProducer,
  revisitWorkbenchCanvas,
  stageWorkbenchUnary,
} from '../../support/relationalWorkbench/navigation';
import {
  semanticDocumentFromWrite,
  semanticWrites,
} from '../../support/relationalWorkbench/persistence';
import { stubWorkbenchScenario } from '../../support/relationalWorkbench/scenario';

describe('Filter on selected input (controlled API boundary)', () => {
  for (const operand of [0, 1])
    it(`persists a filter on operand ${operand} without querying data implicitly`, () => {
      stubWorkbenchScenario('saved-join');
      cy.viewport(1440, 1000);
      visitWorkbenchCanvas();
      let outputs: string[];
      exteriorOutputColumns('join-transform').then((names) => {
        outputs = names;
      });
      openWorkbenchModel();
      let inputId = '';
      let filterId = '';
      let joinId = '';
      cy.get('[data-operator="read"]')
        .eq(operand)
        .then(($read) => {
          inputId = $read.attr('data-relation-id')!;
        });
      cy.get('[data-slot="canvas-relational-tree-node"][data-operator="join"]')
        .then(($join) => {
          joinId = $join.attr('data-relation-id')!;
        })
        .click();
      cy.get('[data-slot="canvas-relational-edit"]').click();
      cy.get(`[data-slot="canvas-relational-edge-action"][data-port="${operand}"]`)
        .focus()
        .type('{del}');
      cy.then(() =>
        stageWorkbenchUnary('filter', `[data-operator="read"][data-relation-id="${inputId}"]`)
      );
      cy.get('[data-slot="canvas-relational-operator-form"] input').type('active');
      cy.get('[data-slot="canvas-relational-operator-form"] button[type="submit"]').click();
      cy.get('[data-operator="filter"]').should('have.length', 1);
      cy.get('[data-operator="filter"]').closest('li').as('filter');
      cy.get('[data-slot="canvas-relational-tree-node"][data-operator="join"]')
        .closest('li')
        .as('join');
      connectWorkbenchProducer('@filter', '@join', operand);
      cy.then(() => {
        expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(0);
      });
      cy.get('[data-slot="canvas-relational-tree-apply"]').should('be.enabled').click();
      cy.wrap(null).should(() => {
        const write = semanticWrites('join-transform').at(-1);
        expect(write).not.to.equal(undefined);
        const draft = decodeDvtSubstraitSemanticDocument(semanticDocumentFromWrite(write!));
        const indexed = indexSubstraitRelations(draft);
        if (!indexed.ok) throw indexed.error;
        const filter = [...indexed.index.relations.values()].find(
          (entry) => entry.relation.relType.case === 'filter'
        )!;
        expect(filter.inputs).to.deep.equal([inputId]);
        filterId = filter.binding.relationId;
        const join = [...indexed.index.relations.values()].find(
          (entry) => entry.relation.relType.case === 'join'
        )!;
        expect(indexed.index.rootId, 'original JOIN identity').to.equal(joinId);
        expect(join.inputs[operand]).to.equal(filterId);
      });
      cy.get('[data-slot="canvas-model-save-status"]').should('have.text', 'Synced');
      cy.get('[data-slot="canvas-model-tab-close"]').click();
      revisitWorkbenchCanvas();
      exteriorOutputColumns('join-transform').should((names) =>
        expect(names).to.deep.equal(outputs)
      );
      openWorkbenchModel();
      cy.get('[data-operator="filter"]')
        .should(($filter) => expect($filter.attr('data-relation-id')).to.equal(filterId))
        .click();
      cy.get('[data-slot="canvas-relational-edit"]').click();
      cy.get('[data-slot="canvas-relational-operator-form"] input').should('have.value', 'active');
      cy.get('[data-slot="canvas-relational-operator-form"] input').clear().type('updated');
      cy.get('[data-slot="canvas-relational-operator-form"] button[type="submit"]').click();
      cy.get('[data-slot="canvas-relational-tree-apply"]').click();
      cy.wrap(null).should(() => {
        const document = decodeDvtSubstraitSemanticDocument(
          semanticDocumentFromWrite(semanticWrites('join-transform').at(-1)!)
        );
        const indexed = indexSubstraitRelations(document);
        if (!indexed.ok) throw indexed.error;
        const filter = indexed.index.relations.get(filterId)!.relation.relType;
        expect(filter.case).to.equal('filter');
        if (filter.case === 'filter')
          expect(
            dvtSubstraitTextComparison.inspect(document.plan, filter.value.condition)?.value
          ).to.equal('updated');
      });
      cy.get('[data-operator="filter"]').click();
      cy.get('[data-slot="canvas-relational-edit"]').click();
      cy.contains(
        '[data-slot="canvas-relational-operator-form"] button',
        'Remove operation'
      ).click();
      cy.get('[data-operator="filter"]').should('not.exist');
      cy.get('[data-slot="canvas-relational-tree-apply"]').click();
      cy.wrap(null).should(() => {
        const document = decodeDvtSubstraitSemanticDocument(
          semanticDocumentFromWrite(semanticWrites('join-transform').at(-1)!)
        );
        const indexed = indexSubstraitRelations(document);
        if (!indexed.ok) throw indexed.error;
        expect(indexed.index.relations.has(filterId)).to.equal(false);
        const join = [...indexed.index.relations.values()].find(
          (entry) => entry.relation.relType.case === 'join'
        )!;
        expect(join.inputs[operand]).to.equal(inputId);
      });
      cy.then(() => {
        expect(getE2eApiCalls(/data-sample/, 'GET')).to.have.length(0);
        expect(getE2eApiCalls('/runs/start', 'POST')).to.have.length(0);
      });
    });
});
