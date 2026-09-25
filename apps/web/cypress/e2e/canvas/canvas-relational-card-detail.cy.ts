/** Card semantic zoom inspects canonical details without writing or executing data. */
import { indexSubstraitRelations } from '@dvt/substrait-analysis';

import { decodeDvtSubstraitSemanticDocument } from '../../../src/app/views/canvas/canvasDvtSubstraitSemanticDocument';
import { getE2eApiCalls } from '../../support/e2eApiStub';
import { visitWorkbenchCanvas } from '../../support/relationalWorkbench/navigation';
import { workbenchOperation } from '../../support/relationalWorkbench/operationMenu';
import {
  semanticDocumentFromWrite,
  semanticWrites,
} from '../../support/relationalWorkbench/persistence';
import { stubWorkbenchScenario } from '../../support/relationalWorkbench/scenario';

describe('Relational card detail', () => {
  it('shows each local tree at semantic zoom and returns to compact cards without side effects', () => {
    stubWorkbenchScenario('saved-join');
    cy.viewport(1600, 1000);
    visitWorkbenchCanvas();
    cy.get('.react-flow__node[data-id="join-transform"] [data-slot="canvas-node-shell"]')
      .should('be.visible')
      .and('have.attr', 'aria-keyshortcuts', 'Enter')
      .focus();
    cy.focused().should('have.attr', 'data-slot', 'canvas-node-shell').type('{enter}');
    cy.get('[data-slot="canvas-model-editor"]').should('be.visible');
    for (const operation of ['sort', 'fetch']) {
      workbenchOperation(operation).click();
      if (operation === 'fetch')
        cy.contains('[role="dialog"] label', 'LIMIT').find('input').clear().type('73');
      cy.get('[role="dialog"] button[type="submit"]').click();
    }
    cy.get('[data-slot="canvas-relational-tree-apply"]').click();
    cy.wrap(null).should(() => {
      const lastWrite = semanticWrites('join-transform').at(-1);
      expect(lastWrite).not.to.equal(undefined);
      const indexed = indexSubstraitRelations(
        decodeDvtSubstraitSemanticDocument(semanticDocumentFromWrite(lastWrite!))
      );
      if (!indexed.ok) throw indexed.error;
      expect(
        [...indexed.index.relations.values()].map((entry) => entry.relation.relType.case)
      ).to.include.members(['sort', 'fetch']);
    });
    let writes = 0;
    cy.then(() => {
      writes = getE2eApiCalls('/workspace/graph/draft', 'PUT').length;
    });
    // The wheel is the existing precision zoom gesture, not a test-only state setter.
    cy.get('[data-slot="canvas-relational-tree-zoom"]')
      .invoke('text')
      .then((label) => {
        const deltaY = -Math.log(1.3 / (Number.parseInt(label, 10) / 100)) / 0.0015;
        cy.get('[data-slot="canvas-relational-tree-viewport"]').trigger('wheel', {
          deltaY,
          eventConstructor: 'WheelEvent',
        });
      });
    cy.get('[data-slot="canvas-relational-tree-node"]').each(($card) => {
      cy.wrap($card)
        .closest('li')
        .find(
          '[data-slot="canvas-relational-semantic-zoom"] [data-slot="canvas-relational-expression-node"]'
        )
        .should('not.be.empty');
    });
    cy.get('[data-operator="fetch"]')
      .closest('li')
      .should('contain.text', '73')
      .and('contain.text', 'OFFSET');
    cy.get('[data-operator="sort"]')
      .closest('li')
      .should('contain.text', 'ORDER BY')
      .and('contain.text', 'NULLS');
    cy.get('[data-operator="sort"]').scrollIntoView();
    cy.screenshot('relational-card-details');
    cy.get('[data-slot="canvas-relational-tree-viewport"]').trigger('wheel', {
      deltaY: 300,
      eventConstructor: 'WheelEvent',
    });
    cy.get('[data-slot="canvas-relational-semantic-zoom"]').should('not.exist');
    cy.then(() => {
      expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(writes);
      expect(getE2eApiCalls(/\/transforms\/join-transform\/data-sample/, 'GET')).to.have.length(0);
    });
  });
});
