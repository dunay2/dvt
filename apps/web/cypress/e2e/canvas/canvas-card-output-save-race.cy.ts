/** A delayed save acknowledgement must not discard the next canonical output edit. */
import {
  prepareFieldSelection,
  toggleColumns,
} from '../../support/relationalWorkbench/fieldSelection';
import { semanticWrites } from '../../support/relationalWorkbench/persistence';
import { savedOutputs } from '../../support/relationalWorkbench/savedOutputs';

describe('card output edits during save acknowledgement', () => {
  for (const sourceCount of [2, 3] as const) {
    it(`persists the newest output selection with ${sourceCount} inputs`, () => {
      prepareFieldSelection(sourceCount);
      toggleColumns('join-transform');
      const toggle =
        '.react-flow__node[data-id="join-transform"] [data-column-name="order_id"] [data-slot="graph-node-column-output-state"]';
      let release!: () => void;
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
      cy.get(toggle).should('have.attr', 'aria-pressed', 'true').click();
      cy.get(toggle).should('have.attr', 'aria-pressed', 'false');
      cy.wrap(null).should(() => expect(acknowledgementHeld).to.equal(true));
      cy.get(toggle).should('have.attr', 'aria-disabled', 'false').click();
      cy.get(toggle).should('have.attr', 'aria-pressed', 'true');
      cy.then(() => release());
      cy.wrap(null, { timeout: 20_000 }).should(() => {
        expect(semanticWrites('join-transform').length).to.be.greaterThan(writesBefore + 1);
        expect(savedOutputs().outputs.map((field) => field.displayName)).to.include('order_id');
      });
      cy.get(toggle).should('have.attr', 'aria-pressed', 'true');
    });
  }
});
