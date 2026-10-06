/** Owned concern: prove card-owned Source and Transform exploration against the live draft. */
import { getVisibleCanvasNode } from '../../support/canvasExecutionSelection';
import { resetE2eApiStubs } from '../../support/e2eApiStub';
import { seedLiveSelectedClosureDraft } from '../../support/liveCanvasDraftAuthoring';
import {
  hasLiveProtectedRuntimeEnv,
  visitWithLiveWorkspaceSession,
} from '../../support/liveProtectedRuntime';
import { livePostgresDatabaseName } from '../../support/liveWarehouseSourceImport';
import { openWorkbenchModel } from '../../support/relationalWorkbench/navigation';

describe('Canvas live data exploration', () => {
  beforeEach(function () {
    if (!hasLiveProtectedRuntimeEnv()) this.skip();
    resetE2eApiStubs();
  });

  it('explores Source and Model rows without a plan preview or published Run', () => {
    cy.viewport(1920, 1080);
    let previewRequests = 0;
    let runRequests = 0;

    seedLiveSelectedClosureDraft({
      authoringGenerated: true,
      terminalTransformPreview: true,
      sourceDatabaseName: livePostgresDatabaseName(),
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

    visitWithLiveWorkspaceSession('/canvas', {
      onBeforeLoad(window) {
        window.localStorage.setItem(
          'dvt-web-application-language',
          JSON.stringify({ state: { language: 'es' }, version: 0 })
        );
      },
    });
    cy.press(Cypress.Keyboard.Keys.TAB);
    getVisibleCanvasNode('dvt-transform-1')
      .find('[data-slot="canvas-node-execute"]')
      .focus()
      .should('be.enabled')
      .and('have.css', 'opacity', '1');
    cy.press(Cypress.Keyboard.Keys.SPACE);
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

    cy.press(Cypress.Keyboard.Keys.TAB);
    getVisibleCanvasNode('source-1')
      .find('[data-slot="canvas-node-execute"]')
      .focus()
      .should('be.enabled')
      .and('have.css', 'opacity', '1');
    cy.press(Cypress.Keyboard.Keys.SPACE);
    cy.wait('@sourceRows', { timeout: 30_000 }).then(({ response }) => {
      expect(response?.statusCode).to.equal(200);
      expect(response?.body.columns.map((column: { name: string }) => column.name)).to.deep.equal([
        'order_id',
        'client_id',
        'customer',
        'amount',
      ]);
    });
    cy.get('[data-slot="bottom-operational-drawer-tab"][data-tab="data:source-1"]').should(
      'have.attr',
      'aria-selected',
      'true'
    );
    cy.get('[data-slot="bottom-operational-drawer-data"]')
      .should('contain.text', 'customer')
      .and('contain.text', 'Ada');
    cy.get('[data-slot="bottom-operational-data-table"] thead [data-column-id]')
      .should('have.length', 1)
      .and('have.text', 'customer');
    cy.get('[data-slot="bottom-operational-data-table"] tbody tr').should('have.length', 3);
    cy.screenshot('source-published-preview');
    openWorkbenchModel('dvt-transform-1');
    cy.press(Cypress.Keyboard.Keys.TAB);
    cy.get('[data-slot="canvas-relational-tree-node"][data-operator="read"]')
      .parent()
      .find('[data-slot="canvas-node-execute"]')
      .should('contain.text', 'Vista previa')
      .focus()
      .should('have.css', 'opacity', '1');
    cy.press(Cypress.Keyboard.Keys.SPACE);
    cy.wait('@sourceRows', { timeout: 30_000 }).then(({ request, response }) => {
      expect(response?.statusCode).to.equal(200);
      expect(new URL(request.url).searchParams.get('objectId')).to.equal(
        `relation/${livePostgresDatabaseName()}/raw/orders`
      );
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
