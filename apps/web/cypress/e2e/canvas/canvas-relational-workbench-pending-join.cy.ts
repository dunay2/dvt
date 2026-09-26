/** Owned concern: create a JOIN with one explicit Apply or zero-write Cancel. */
import {
  visitWorkbenchCanvas,
  openWorkbenchModel,
  dragWorkbenchSource,
} from '../../support/relationalWorkbench/navigation';
import { semanticWrites } from '../../support/relationalWorkbench/persistence';
import { stubWorkbenchScenario } from '../../support/relationalWorkbench/scenario';

describe('Workbench pending-join', () => {
  beforeEach(() => {
    stubWorkbenchScenario('pending-join');
  });
  it('authors a pending JOIN in the global tab with one Apply and zero-write Cancel', () => {
    cy.viewport(1400, 900);
    visitWorkbenchCanvas();

    openWorkbenchModel('join-transform');
    cy.get('[data-slot="canvas-model-main-tab"]').should('have.attr', 'aria-selected', 'true');
    cy.get('[data-slot="canvas-relational-tree-authoring"]').should('not.exist');
    cy.get('[data-slot="canvas-relational-tree-input-slot"]').should('not.exist');
    dragWorkbenchSource('customers');
    cy.get('[data-slot="canvas-operation-menu-trigger"]').click();
    cy.get('[data-slot="dvt-select-operation-projection"]').click();
    cy.get('[data-operator="read"]').should('have.length', 1);
    cy.get('[data-operator="join"]').should('not.exist');
    dragWorkbenchSource('orders');
    cy.get('[data-slot="canvas-operation-menu-trigger"]').click();
    cy.get('[role="combobox"]').type('INNER JOIN{enter}');
    cy.get('[data-slot="canvas-relational-tree-append-input"]').click();
    cy.get('[data-slot="canvas-relational-tree-node"][data-operator="join"]').click();
    cy.get('[data-operator="join"]').should('be.visible');
    cy.get('[data-slot="canvas-relational-tree-cancel"]').click();
    cy.get('[data-slot="canvas-relational-tree-block-canvas"]').should('be.visible');
    cy.get('[data-operator="read"]').should('not.exist');
    cy.get('[data-slot="canvas-relational-tree-apply"]').should('not.exist');
    cy.wrap(null).should(() => {
      expect(semanticWrites('join-transform')).to.have.length(0);
    });

    cy.contains('[data-slot="canvas-relational-tree-source"]', 'customers').click();
    cy.get('[data-slot="source-occurrence-connect"]').click();
    cy.get('[data-slot="canvas-operation-menu-trigger"]').click();
    cy.get('[data-slot="dvt-select-operation-projection"]').click();
    cy.contains('[data-slot="canvas-relational-tree-source"]', 'orders').click();
    cy.get('[data-slot="source-occurrence-connect"]').click();
    cy.get('[data-slot="canvas-operation-menu-trigger"]').click();
    cy.get('[data-slot="dvt-select-operation-inner-join"]').click();
    cy.get('[data-slot="canvas-relational-tree-append-input"]').click();
    cy.get('[data-slot="canvas-relational-tree-apply"]').should('not.be.disabled').click();

    cy.wrap(null).should(() => {
      const saves = semanticWrites('join-transform');
      expect(saves).to.have.length(1);
      const body = saves.at(-1)?.body as {
        draft: { nodes: Array<{ id: string; metadata?: Record<string, unknown> }> };
      };
      const transform = body.draft.nodes.find((node) => node.id === 'join-transform');
      expect(transform?.metadata?.transformAuthoring).to.not.equal(undefined);
    });
    cy.get('[data-slot="canvas-relational-tree"]').should('contain.text', 'JOIN');
  });
});
