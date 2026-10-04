/** Owned concern: author one canonical UNION ALL in the global semantic editor. */
import {
  visitWorkbenchCanvas,
  openWorkbenchModel,
  connectWorkbenchProducer,
} from '../../support/relationalWorkbench/navigation';
import { semanticWrites } from '../../support/relationalWorkbench/persistence';
import { stubWorkbenchScenario } from '../../support/relationalWorkbench/scenario';

describe('Workbench UNION ALL', () => {
  beforeEach(() => stubWorkbenchScenario('pending-set'));
  it('authors UNION ALL in the global tab and persists one canonical operation', () => {
    cy.viewport(1400, 900);
    visitWorkbenchCanvas();

    openWorkbenchModel('union-transform');
    cy.contains('[data-slot="canvas-relational-tree-source"]', 'customers_north').click();
    cy.contains('[data-slot="canvas-relational-tree-source"]', 'customers_south').click();
    cy.get('[data-slot="canvas-operation-menu-trigger"]').click();
    cy.get('[data-slot="dvt-select-operation-union-all"]').click();
    cy.get('[data-pending-operation="true"]').last().as('union', { type: 'static' });
    for (const [port, source] of ['customers_north', 'customers_south'].entries()) {
      cy.contains('[data-slot="canvas-relational-tree-node"][data-operator="read"]', source)
        .closest('li')
        .as('producer');
      connectWorkbenchProducer('@producer', '@union', port);
    }
    connectWorkbenchProducer('@union', '[data-slot="canvas-relational-output-input-port"]', null);
    cy.get('[data-slot="canvas-relational-tree-apply"]').should('not.be.disabled').click();

    cy.wrap(null).should(() => {
      expect(semanticWrites('union-transform')).to.have.length(1);
    });
    cy.get('[data-slot="canvas-relational-tree"]').should('contain.text', 'UNION ALL');
  });
});
