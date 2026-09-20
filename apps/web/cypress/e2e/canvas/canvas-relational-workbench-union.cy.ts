/** Owned concern: author one canonical UNION ALL in the global semantic editor. */
import {
  visitWorkbenchCanvas,
  openWorkbenchModel,
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
    cy.get('[data-slot="dvt-select-operation-union-all"]').click();
    cy.get('[data-slot="canvas-relational-tree-apply"]').should('not.be.disabled').click();

    cy.wrap(null).should(() => {
      expect(semanticWrites('union-transform')).to.have.length(1);
    });
    cy.get('[data-slot="canvas-relational-tree"]').should('contain.text', 'UNION ALL');
  });
});
