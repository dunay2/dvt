/**
 * Owned concern: prove staged Transform chaining through durable save and fresh reads.
 * @baseline GH-3578: sending a draft is not a persistence acknowledgement.
 * @decision Reuse the save-status and fresh-navigation boundaries before reopening.
 * @consequence The restored chain is checked against its acknowledged draft.
 * @version 1.0.0
 */
import { getE2eApiCalls } from '../../support/e2eApiStub';
import {
  openWorkbenchModel,
  revisitWorkbenchCanvas,
  visitWorkbenchCanvas,
} from '../../support/relationalWorkbench/navigation';
import { stubWorkbenchScenario } from '../../support/relationalWorkbench/scenario';
import { connectStagedTransformChain } from '../../support/relationalWorkbench/transformChainJourney';

const card = '[data-slot="canvas-relational-tree-node"][data-operator="project"]';

describe('Staged Transform field chain', () => {
  it('drags one staged Transform result into a second Transform and reopens the chain', () => {
    cy.viewport(1280, 720);
    stubWorkbenchScenario('saved-join');
    visitWorkbenchCanvas();
    openWorkbenchModel();
    connectStagedTransformChain(
      '[data-operator="join"]',
      'customer_id',
      'normalized_customer_id',
      'UPPER(TRIM("customer_id"))'
    );
    let writes = 0;
    cy.then(() => {
      writes = getE2eApiCalls('/workspace/graph/draft', 'PUT').length;
    });
    cy.get('[data-slot="canvas-relational-tree-apply"]').should('be.enabled').click();
    cy.wrap(null).should(() => {
      const saves = getE2eApiCalls('/workspace/graph/draft', 'PUT');
      expect(saves.length).to.be.greaterThan(writes);
      expect(JSON.stringify(saves.at(-1)?.body)).to.include('pending-operation:');
      expect(JSON.stringify(saves.at(-1)?.body)).to.include('normalized_customer_id');
    });
    cy.get('[data-slot="canvas-relational-tree-apply"]').should('not.exist');
    cy.get('[data-slot="canvas-model-save-status"]').should('contain.text', 'Synced');
    revisitWorkbenchCanvas();
    openWorkbenchModel();
    cy.get(card).should('have.length', 2);
    cy.get(card).first().closest('li').find('[data-slot="canvas-relational-node-expand"]').click();
    cy.get(card)
      .first()
      .closest('li')
      .find('[data-field-selection="output"]')
      .should('have.length', 1)
      .and('contain.text', 'normalized_customer_id');
  });
});
