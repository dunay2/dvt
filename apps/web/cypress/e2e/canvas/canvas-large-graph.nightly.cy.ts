/** @ownedConcern Prove interaction operability on the canonical 1000-node graph in the nightly controlled runtime. */
import { stubStatefulCanvasDraftAuthoring } from '../../support/canvasDraftAuthoring';
import {
  openNodeProperties,
  stubRuntimeCapabilities,
  visitReadyCanvas,
} from '../../support/canvasReadyAuthoring';

describe('Canvas large-graph nightly', () => {
  beforeEach(() => {
    stubRuntimeCapabilities();
  });

  it(
    'keeps critical Canvas interactions operable on the canonical 1,000-node graph',
    { defaultCommandTimeout: 30_000 },
    () => {
      stubStatefulCanvasDraftAuthoring({ largeGraph: true });

      visitReadyCanvas();

      cy.contains('Large Canvas regression fixture').should('be.visible');
      cy.get('.react-flow__node[data-id="large-node-00-00"]')
        .should('exist')
        .click({ force: true });
      cy.get('.react-flow__node[data-id="large-node-00-00"]').should('have.class', 'selected');
      cy.get('[data-slot="canvas-node-floating-toolbar"]').should('not.exist');

      cy.get('.react-flow__node[data-id="large-node-01-00"]')
        .should('exist')
        .click({ force: true });
      cy.get('.react-flow__node[data-id="large-node-01-00"]').should('have.class', 'selected');
      cy.get('[data-slot="canvas-node-floating-toolbar"]').should('not.exist');

      cy.get('.react-flow__viewport')
        .invoke('attr', 'style')
        .then((initialTransform) => {
          cy.get('.react-flow__controls-zoomin').click({ force: true });
          cy.get('.react-flow__viewport').should(($viewport) => {
            expect($viewport.attr('style')).not.to.equal(initialTransform);
          });
        });

      cy.get('.react-flow__viewport')
        .invoke('attr', 'style')
        .then((zoomedTransform) => {
          cy.window().then((browserWindow) => {
            cy.get('.react-flow__pane')
              .trigger('mousedown', {
                button: 0,
                clientX: 520,
                clientY: 360,
                force: true,
                view: browserWindow,
              })
              .trigger('mousemove', {
                buttons: 1,
                clientX: 620,
                clientY: 420,
                force: true,
                view: browserWindow,
              })
              .trigger('mouseup', {
                button: 0,
                clientX: 620,
                clientY: 420,
                force: true,
                view: browserWindow,
              });
          });
          cy.get('.react-flow__viewport').should(($viewport) => {
            expect($viewport.attr('style')).not.to.equal(zoomedTransform);
          });
        });

      openNodeProperties('large-node-01-00');
      cy.get('[data-slot="canvas-node-workbench-panel"]')
        .should('be.visible')
        .and('contain.text', 'large-node-01-00');
      cy.get('[data-slot="canvas-node-workbench-close"]').click();
      cy.get('[data-slot="canvas-node-workbench-panel"]').should('not.exist');
    }
  );
});
