/**
 * Owned concern: prove the latest Model output edit survives a delayed save acknowledgement.
 * @baseline GH-3578: a real second edit must not be replaced by the first saved snapshot.
 * @decision Hold only the post-PUT GET response while using current Output controls.
 * @consequence Both writes complete in order and the final selection survives reload.
 * @version 1.0.0
 */
import {
  prepareFieldSelection,
  openModelOutputs,
  reloadFieldSelection,
} from '../../support/relationalWorkbench/fieldSelection';
import { semanticWrites } from '../../support/relationalWorkbench/persistence';
import { savedOutputs } from '../../support/relationalWorkbench/savedOutputs';

describe('card output edits during save acknowledgement', () => {
  let release: (() => void) | undefined;
  afterEach(() => release?.());
  for (const sourceCount of [2, 3] as const) {
    it(`persists the newest output selection with ${sourceCount} inputs`, () => {
      prepareFieldSelection(sourceCount);
      openModelOutputs();
      cy.get('[data-slot="canvas-model-save-status"]').should('have.text', 'Synced');
      const toggle =
        '[data-slot="canvas-model-output-inspector"] [data-slot="relation-output-toggle"][data-field-name="order_id"]';
      let acknowledgementHeld = false;
      let writesBefore = 0;
      cy.window().then((window) => {
        writesBefore = semanticWrites('join-transform').length;
        const fetch = window.fetch.bind(window);
        const gate = new Promise<void>((resolve) => {
          release = resolve;
        });
        let wrote = false;
        window.fetch = async (input, init) => {
          const request = new window.Request(input, init);
          const response = await fetch(input, init);
          if (new URL(request.url).pathname === '/workspace/graph/draft') {
            if (request.method === 'PUT') wrote = true;
            if (request.method === 'GET' && wrote && !acknowledgementHeld) {
              acknowledgementHeld = true;
              await gate;
            }
          }
          return response;
        };
      });
      cy.get(toggle).should('have.attr', 'data-included', 'true').and('be.enabled').click();
      cy.get(toggle).should('have.attr', 'data-included', 'false');
      cy.wrap(null).should(() => expect(acknowledgementHeld).to.equal(true));
      cy.get(toggle).should('be.enabled').and('not.have.attr', 'aria-disabled', 'true').click();
      cy.get(toggle).should('have.attr', 'data-included', 'true');
      cy.then(() => release!());
      cy.wrap(null, { timeout: 20_000 }).should(() => {
        expect(semanticWrites('join-transform')).to.have.length(writesBefore + 2);
        expect(savedOutputs().outputs.map((field) => field.displayName)).to.include('order_id');
      });
      cy.get('[data-slot="canvas-model-save-status"]').should('have.text', 'Synced');
      cy.get(toggle).should('have.attr', 'data-included', 'true');
      reloadFieldSelection();
      cy.get(toggle).should('have.attr', 'data-included', 'true');
    });
  }
});
