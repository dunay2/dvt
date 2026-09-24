/** Select either operand, author a Filter, persist and reopen its canonical identity. */
import { indexSubstraitRelations } from '@dvt/substrait-analysis';

import { decodeDvtSubstraitSemanticDocument } from '../../../src/app/views/canvas/canvasDvtSubstraitSemanticDocument';
import { dvtSubstraitTextComparison } from '../../../src/app/views/canvas/canvasDvtSubstraitTextComparison';
import { getE2eApiCalls } from '../../support/e2eApiStub';
import { exteriorOutputColumns } from '../../support/relationalWorkbench/columns';
import {
  openWorkbenchModel,
  visitWorkbenchCanvas,
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
      cy.get('[data-operator="read"]')
        .eq(operand)
        .then(($read) => {
          inputId = $read.attr('data-relation-id')!;
        })
        .click();
      cy.get('[data-slot="canvas-operation-menu-trigger"]').click();
      cy.get('[data-operation="filter"]').should('have.attr', 'aria-disabled', 'false').click();
      cy.get('[data-slot="canvas-relational-operator-form"] input').type('active');
      cy.get('[data-slot="canvas-relational-operator-form"] button[type="submit"]').click();
      cy.get('[data-operator="filter"]').should('have.length', 1);
      cy.then(() => {
        for (const write of semanticWrites('join-transform')) {
          const indexed = indexSubstraitRelations(
            decodeDvtSubstraitSemanticDocument(semanticDocumentFromWrite(write))
          );
          if (!indexed.ok) throw indexed.error;
          expect(
            [...indexed.index.relations.values()].some(
              (entry) => entry.relation.relType.case === 'filter'
            )
          ).to.equal(false);
        }
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
        expect(join.inputs[operand]).to.equal(filterId);
      });
      cy.get('[data-slot="canvas-model-tab-close"]').click();
      visitWorkbenchCanvas();
      exteriorOutputColumns('join-transform').should((names) =>
        expect(names).to.deep.equal(outputs)
      );
      openWorkbenchModel();
      cy.get('[data-operator="filter"]')
        .should(($filter) => expect($filter.attr('data-relation-id')).to.equal(filterId))
        .click();
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
      cy.get('[data-slot="canvas-relational-operator-form"] button[type="button"]').first().click();
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
