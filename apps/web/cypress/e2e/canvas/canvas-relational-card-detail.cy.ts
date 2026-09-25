/** Explicit card detail survives zoom without layout, writes or data execution. */
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
  it('expands each local tree explicitly and preserves geometry across zoom and Fit', () => {
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
    cy.get('[data-slot="canvas-relational-tree-node"]').each(($card) => {
      cy.wrap($card).closest('li').find('[data-slot="canvas-relational-node-expand"]').click();
      cy.wrap($card)
        .closest('li')
        .find(
          '[data-slot="canvas-relational-card-detail"] [data-slot="canvas-relational-expression-node"]'
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
    cy.get('[data-slot="canvas-relational-tree-layout"]').then(($layout) => {
      const geometry = (): (string | null)[][] =>
        [
          ...$layout[0].querySelectorAll(
            ':scope > ul > li, :scope > svg path, [data-slot="canvas-relational-tree-output"]'
          ),
        ].map((element) => [element.getAttribute('style'), element.getAttribute('d')]);
      const before = geometry();
      const count = $layout.find('[data-slot="canvas-relational-card-detail"]').length;
      for (const deltaY of [-800, 500, -150, 200]) {
        cy.get('[data-slot="canvas-relational-tree-viewport"]').trigger('wheel', {
          deltaY,
          eventConstructor: 'WheelEvent',
        });
        cy.then(() => expect(geometry()).to.deep.equal(before));
        cy.get('[data-slot="canvas-relational-card-detail"]').should('have.length', count);
      }
      cy.get('[data-slot="canvas-relational-tree-fit"]').click();
      cy.then(() => expect(geometry()).to.deep.equal(before));
    });
    cy.get('[data-slot="canvas-relational-node-expand"]').each(($button) =>
      cy.wrap($button).click()
    );
    cy.get('[data-slot="canvas-relational-card-detail"]').should('not.exist');
    cy.then(() => {
      expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(writes);
      expect(getE2eApiCalls(/\/transforms\/join-transform\/data-sample/, 'GET')).to.have.length(0);
    });
  });
});
