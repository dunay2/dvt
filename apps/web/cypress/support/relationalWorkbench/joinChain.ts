/** Author JOIN chains through producer outputs and explicit consumer Input ports. */
import {
  visitWorkbenchCanvas,
  openWorkbenchModel,
  dragWorkbenchSource,
  connectWorkbenchProducer,
} from './navigation';
import { workbenchOperation } from './operationMenu';
import { semanticWrites } from './persistence';

export function joinWorkbenchProducers(left: string, right: string, alias: string): void {
  workbenchOperation('inner_join').click();
  cy.get('[data-pending-operation="true"]').last().as(alias, { type: 'static' });
  connectWorkbenchProducer(left, '@' + alias, 0);
  connectWorkbenchProducer(right, '@' + alias, 1);
  cy.get('[data-slot="canvas-staged-operation-inspector"]')
    .should('contain.text', 'customer_id')
    .and('contain.text', '=');
}

export function authorFourSourceChain(): void {
  cy.viewport(1440, 900);
  visitWorkbenchCanvas('es');
  openWorkbenchModel('join-transform');
  for (const [index, source] of ['customers', 'orders', 'shipments', 'tickets'].entries()) {
    dragWorkbenchSource(source);
    cy.contains('[data-slot="canvas-relational-tree-node"][data-operator="read"]', source)
      .closest('li')
      .as('source' + index, { type: 'static' });
    if (index === 0) continue;
    joinWorkbenchProducers(
      index === 1 ? '@source0' : '@join' + (index - 1),
      '@source' + index,
      'join' + index
    );
    cy.get('[data-slot="canvas-relational-tree-draft"] [data-operator="join"]').should(
      'have.length',
      index
    );
  }
  connectWorkbenchProducer('@join3', '[data-slot="canvas-relational-output-input-port"]', null);
  cy.get('[data-slot="canvas-relational-tree-draft"] [data-operator="read"]').should(
    'have.length',
    4
  );
  cy.wrap(null).should(() => expect(semanticWrites('join-transform')).to.have.length(0));
}
