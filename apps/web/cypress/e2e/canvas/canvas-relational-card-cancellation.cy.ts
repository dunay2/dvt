/** Owned concern: cancelled native card gestures preserve automatic layout and query boundaries. */
import { getE2eApiCalls } from '../../support/e2eApiStub';
import { verifyCompleteTreeFit } from '../../support/relationalWorkbench/geometry';
import {
  connectWorkbenchProducer,
  openWorkbenchModel,
  visitWorkbenchCanvas,
} from '../../support/relationalWorkbench/navigation';
import { workbenchOperation } from '../../support/relationalWorkbench/operationMenu';
import { semanticWrites } from '../../support/relationalWorkbench/persistence';
import { moveWorkbenchCard } from '../../support/relationalWorkbench/pointer';
import { stubWorkbenchScenario } from '../../support/relationalWorkbench/scenario';

const viewport = '[data-slot="canvas-relational-tree-viewport"]';
const join = '[data-slot="canvas-relational-tree-node"][data-operator="join"]';
const output = '[data-slot="canvas-relational-tree-output"]';
const position = (element: HTMLElement): number[] => [
  Number.parseFloat(element.style.left),
  Number.parseFloat(element.style.top),
];

describe('Relational card drag cancellation', () => {
  for (const reason of ['Escape', 'pointercancel', 'lostpointercapture']) {
    it(`${reason} restores layout and leaves automatic cards free to reflow`, () => {
      stubWorkbenchScenario('saved-join');
      cy.viewport(1200, 600);
      visitWorkbenchCanvas();
      openWorkbenchModel();
      verifyCompleteTreeFit(viewport);
      let pointerId = -1;
      let outputX = 0;
      cy.get(output).then(($output) => {
        outputX = position($output[0]!)[0]!;
      });
      cy.get(join).then(($card) => {
        const element = $card[0]!;
        const before = position(element.parentElement!);
        const writes = semanticWrites('join-transform').length;
        const queryPattern = /\/(data-sample|preview|runs|execute)(\/|$)/;
        const queries = getE2eApiCalls(queryPattern).length;
        element.addEventListener(
          'pointerdown',
          (event) => {
            pointerId = event.pointerId;
          },
          { once: true }
        );
        moveWorkbenchCard(join, 40, 24, undefined, () => {
          cy.get(join).should(($held) => {
            expect($held[0]).to.equal(element);
            expect(element.hasPointerCapture(pointerId), 'native pointer capture').to.equal(true);
            expect(position(element.parentElement!)).not.to.deep.equal(before);
          });
          if (reason === 'Escape') cy.press(Cypress.Keyboard.Keys.ESC);
          else
            cy.then(() => {
              if (reason === 'lostpointercapture') element.releasePointerCapture(pointerId);
              else
                element.dispatchEvent(
                  new element.ownerDocument.defaultView!.PointerEvent('pointercancel', {
                    bubbles: true,
                    pointerId,
                  })
                );
            });
        });
        cy.get(join).should(($held) => {
          expect($held[0]).to.equal(element);
          expect(position($held[0]!.parentElement!)).to.deep.equal(before);
          expect(element.dataset.dragging).to.equal(undefined);
        });
        cy.then(() => {
          expect(semanticWrites('join-transform')).to.have.length(writes);
          expect(getE2eApiCalls(queryPattern)).to.have.length(queries);
        });
      });
      // Insert a real operation through the existing authoring controls, not a test-state mutation.
      cy.get('[data-slot="canvas-relational-output-input-port"]').focus().type('{del}');
      workbenchOperation('filter').click();
      cy.get(join).closest('li').as('producer');
      cy.get('[data-pending-operation="true"]').last().as('filter');
      connectWorkbenchProducer('@producer', '@filter');
      cy.get('[data-slot="canvas-relational-operator-form"] input').type('active');
      cy.get('[data-slot="canvas-relational-operator-form"] button[type="submit"]').click();
      connectWorkbenchProducer(
        '@filter',
        '[data-slot="canvas-relational-output-input-port"]',
        null
      );
      let writesBeforeApply = 0;
      cy.then(() => {
        writesBeforeApply = getE2eApiCalls('/workspace/graph/draft', 'PUT').length;
      });
      cy.get('[data-slot="canvas-relational-tree-apply"]').should('be.enabled').click();
      cy.get('[data-pending-operation="true"]').should('not.exist');
      cy.get('[data-operator="filter"]').should('have.length', 1);
      cy.wrap(null).should(() => {
        expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(
          writesBeforeApply + 1
        );
      });
      cy.get('[data-slot="canvas-model-save-status"]').should('have.text', 'Synced');
      cy.get(output).should(($output) =>
        expect(position($output[0]!)[0]).to.be.greaterThan(outputX)
      );
      cy.get('[data-slot="canvas-relational-tree-fit"]').click();
      cy.screenshot(`cancel-${reason}-then-reflow`, { capture: 'viewport', scale: true });
    });
  }
});
