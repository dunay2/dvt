/** Owned concern: prove card-owned Source and Transform exploration against the live draft. */
import { getVisibleCanvasNode } from '../../support/canvasExecutionSelection';
import { resetE2eApiStubs } from '../../support/e2eApiStub';
import {
  hasLiveProtectedRuntimeEnv,
  seedLiveSelectedClosureDraft,
  visitWithLiveWorkspaceSession,
} from '../../support/liveProtectedRuntime';

describe('Canvas live data exploration', () => {
  beforeEach(function () {
    if (!hasLiveProtectedRuntimeEnv()) this.skip();
    resetE2eApiStubs();
  });

  it('opens independent Source and Transform data tabs without Preview or Run', () => {
    let previewRequests = 0;
    let runRequests = 0;

    seedLiveSelectedClosureDraft({
      authoringGenerated: true,
      terminalTransformPreview: true,
      title: 'Transform row exploration',
    });
    cy.intercept('POST', '**/plans/preview', (request) => {
      previewRequests += 1;
      request.continue();
    });
    cy.intercept('POST', '**/runs/start', (request) => {
      runRequests += 1;
      request.continue();
    });
    cy.intercept(
      'GET',
      '**/workspace/graph/canvases/*/transforms/dvt-transform-1/data-sample?*'
    ).as('transformRows');
    cy.intercept('GET', '**/workspace/warehouse/connections/*/source-data-sample?*').as(
      'sourceRows'
    );

    visitWithLiveWorkspaceSession('/canvas');
    getVisibleCanvasNode('dvt-transform-1').find('[data-slot="canvas-node-shell"]').click();
    cy.get('[data-slot="bottom-operational-drawer-tab"][data-tab="semantic"]').should(
      'have.attr',
      'aria-selected',
      'true'
    );

    getVisibleCanvasNode('dvt-transform-1')
      .find('[data-slot="canvas-node-shell"]')
      .dblclick('bottom', { force: true });
    cy.wait('@transformRows', { timeout: 30_000 }).then((interception) => {
      expect(interception.response?.statusCode).to.equal(200);
      expect(interception.response?.body).to.deep.include({
        contractVersion: 1,
        transformNodeId: 'dvt-transform-1',
        limit: 20,
        truncated: false,
      });
      expect(interception.response?.body.rows).to.have.length(3);
    });
    cy.get('[data-slot="bottom-operational-drawer-tab"][data-tab="data:dvt-transform-1"]').should(
      'have.attr',
      'aria-selected',
      'true'
    );
    cy.get('[data-slot="bottom-operational-drawer-data"]')
      .should('contain.text', 'customer')
      .and('contain.text', 'Ada');

    getVisibleCanvasNode('source-1')
      .find('[data-slot="canvas-node-shell"]')
      .dblclick('bottom', { force: true });
    cy.wait('@sourceRows', { timeout: 30_000 }).its('response.statusCode').should('equal', 200);
    cy.get('[data-slot="bottom-operational-drawer-tab"][data-tab="data:source-1"]').should(
      'have.attr',
      'aria-selected',
      'true'
    );
    cy.get('[data-slot="bottom-operational-drawer-tab"][data-tab="data:dvt-transform-1"]')
      .should('be.visible')
      .click();
    cy.get('[data-slot="bottom-operational-drawer-data"]')
      .should('contain.text', 'customer')
      .and('contain.text', 'Ada');
    cy.then(() => {
      expect(previewRequests).to.equal(0);
      expect(runRequests).to.equal(0);
    });
  });
});
