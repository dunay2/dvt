/** Owned concern: prove card-owned Source and Transform exploration against the live draft. */
import { getVisibleCanvasNode } from '../../support/canvasExecutionSelection';
import { resetE2eApiStubs } from '../../support/e2eApiStub';
import {
  hasLiveProtectedRuntimeEnv,
  seedLiveSelectedClosureDraft,
  visitWithLiveWorkspaceSession,
} from '../../support/liveProtectedRuntime';
import { openWorkbenchModel } from '../../support/relationalWorkbench/navigation';

describe('Canvas live data exploration', () => {
  beforeEach(function () {
    if (!hasLiveProtectedRuntimeEnv()) this.skip();
    resetE2eApiStubs();
  });

  it('explores Source and Model rows without a plan preview or published Run', () => {
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
    getVisibleCanvasNode('dvt-transform-1').find('[data-slot="canvas-node-execute"]').click();
    cy.get('[data-slot="bottom-operational-drawer-tab"][data-tab="data:dvt-transform-1"]').should(
      'have.attr',
      'aria-selected',
      'true'
    );
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
    cy.get('[data-slot="bottom-operational-drawer-data"]')
      .should('contain.text', 'customer')
      .and('contain.text', 'Ada');

    getVisibleCanvasNode('source-1').find('[data-slot="canvas-node-execute"]').click();
    cy.wait('@sourceRows', { timeout: 30_000 }).its('response.statusCode').should('equal', 200);
    cy.get('[data-slot="bottom-operational-drawer-tab"][data-tab="data:source-1"]').should(
      'have.attr',
      'aria-selected',
      'true'
    );
    cy.get('[data-slot="bottom-operational-drawer-data"]')
      .should('contain.text', 'customer')
      .and('contain.text', 'Ada');
    openWorkbenchModel('dvt-transform-1');
    cy.get('[data-slot="canvas-relational-tree-node"][data-operator="read"]')
      .parent()
      .find('[data-slot="canvas-node-execute"]')
      .focus()
      .click();
    cy.wait('@sourceRows', { timeout: 30_000 }).then(({ request, response }) => {
      expect(response?.statusCode).to.equal(200);
      expect(new URL(request.url).searchParams.get('objectId')).to.equal('relation/dvt/raw/orders');
      expect(response?.body.rows).to.have.length(3);
    });
    cy.get('[data-slot="bottom-operational-drawer-data"]').should('contain.text', 'Ada');
    cy.get('[data-slot="canvas-model-editor"]').should('be.visible');
    cy.then(() => {
      expect(previewRequests).to.equal(0);
      expect(runRequests).to.equal(0);
    });
  });
});
