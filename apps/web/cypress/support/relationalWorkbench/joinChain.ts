/** Owned concern: author a four-source JOIN chain through UI with explicit field defaults. */
import { visitWorkbenchCanvas, openWorkbenchModel } from './navigation';
import { workbenchOperation } from './operationMenu';
import { semanticWrites } from './persistence';

export function authorFourSourceChain(): void {
  cy.viewport(1280, 720);
  visitWorkbenchCanvas('es');

  openWorkbenchModel('join-transform');
  cy.contains('[data-slot="canvas-relational-tree-source"]', 'customers').click();
  cy.contains('[data-slot="canvas-relational-tree-source"]', 'orders').click();
  workbenchOperation('inner_join').should('have.attr', 'aria-disabled', 'false').click();
  cy.get('[data-slot="canvas-relational-tree-draft"] [data-operator="join"]').should(
    'have.length',
    1
  );

  cy.contains('[data-slot="canvas-relational-tree-source"]', 'shipments').click();
  cy.get('[data-slot="canvas-relational-tree-existing-field"]')
    .should('contain.text', 'customer_id')
    .find('option:selected')
    .should('have.text', 'customer_id');
  cy.get('[data-slot="canvas-relational-tree-connected-field"]').should(
    'have.value',
    'customer_id'
  );
  cy.get('[data-slot="canvas-relational-tree-append-input"]').should('be.enabled').click();
  cy.get('[data-slot="canvas-relational-tree-draft"] [data-operator="join"]').should(
    'have.length',
    2
  );
  cy.get('[data-slot="canvas-relational-tree-draft"] [data-operator="read"]').should(
    'have.length',
    3
  );

  cy.contains('[data-slot="canvas-relational-tree-source"]', 'tickets').click();
  cy.get('[data-slot="canvas-relational-tree-existing-field"] option:selected').should(
    'have.text',
    'customer_id'
  );
  cy.get('[data-slot="canvas-relational-tree-connected-field"]').should(
    'have.value',
    'customer_id'
  );
  cy.get('[data-slot="canvas-relational-tree-append-input"]').click();
  cy.get('[data-slot="canvas-relational-tree-draft"] [data-operator="join"]').should(
    'have.length',
    3
  );
  cy.get('[data-slot="canvas-relational-tree-draft"] [data-operator="read"]').should(
    'have.length',
    4
  );
  cy.wrap(null).should(() => expect(semanticWrites('join-transform')).to.have.length(0));
}
