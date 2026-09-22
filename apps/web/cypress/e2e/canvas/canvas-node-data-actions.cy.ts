/** UI contract: explicit Play queries data below without navigating or authoring. */
import { stubStatefulCanvasDraftAuthoring } from '../../support/canvasDraftAuthoring';
import {
  getE2eApiCalls,
  stubE2eApi,
  stubE2eJsonApi,
  waitForE2eApiCall,
} from '../../support/e2eApiStub';
import {
  E2E_PROJECT_WORKSPACE,
  stubShellBootstrapApis,
  visitWithE2eWorkspaceSession,
} from '../../support/workspaceSession';

const sourcePath = '/workspace/warehouse/connections/warehouse-a/source-data-sample';
const transformPath =
  /\/workspace\/graph\/canvases\/[^/]+\/transforms\/dvt-transform-1\/data-sample/;
const sample = {
  contractVersion: 1,
  columns: [{ name: 'order_id', type: 'integer', nullable: false }],
  rows: [{ values: ['7'] }],
  limit: 20,
  truncated: false,
  sampledAt: '2026-09-22T10:00:00Z',
};

describe('Canvas explicit data action', () => {
  beforeEach(() => {
    cy.viewport(1920, 1080);
    stubShellBootstrapApis({
      scopes: ['workspace:graph-draft:view', 'workspace:graph-draft:save'],
    });
    stubE2eJsonApi('GET', '/workspace/context', {
      defaultWorkspace: E2E_PROJECT_WORKSPACE,
      availableWorkspaces: [E2E_PROJECT_WORKSPACE],
    });
    stubE2eJsonApi('GET', '/capabilities', {
      apiVersion: '1.0.0',
      minFrontendVersion: '0.0.1',
      plugins: { dvt: { available: true } },
    });
    stubStatefulCanvasDraftAuthoring({ canvasKind: 'transformation', authoringGenerated: true });
    stubE2eJsonApi('GET', sourcePath, {
      ...sample,
      connectionId: 'warehouse-a',
      objectId: 'raw.orders',
    });
    stubE2eApi('GET', transformPath, ({ url }) => ({
      body: {
        ...sample,
        canvasId: url.pathname.split('/')[4],
        transformNodeId: 'dvt-transform-1',
        draftRevision: 'revision-1',
        semanticPlanSha256: 'a'.repeat(64),
      },
    }));
    visitWithE2eWorkspaceSession('/canvas', {
      onBeforeLoad(window) {
        window.localStorage.setItem(
          'dvt-web-application-language',
          JSON.stringify({ state: { language: 'en' }, version: 0 })
        );
      },
    });
    waitForE2eApiCall('/workspace/graph/draft', 'GET');
  });

  for (const nodeId of ['source-1', 'dvt-transform-1']) {
    it(`loads ${nodeId} below only after Play, including native keyboard activation`, () => {
      const card = `.react-flow__node[data-id="${nodeId}"]`;
      const path = nodeId === 'source-1' ? sourcePath : transformPath;
      let saves = 0;
      cy.then(() => {
        saves = getE2eApiCalls('/workspace/graph/draft', 'PUT').length;
      });
      cy.get(card).find('[data-slot="graph-node-card-title"]').click();
      cy.get(card).find('[data-slot="graph-node-operational-rail"]').dblclick();
      cy.then(() => expect(getE2eApiCalls(path, 'GET')).to.have.length(0));
      cy.get(card)
        .find('[data-slot="canvas-node-execute"]')
        .focus()
        .should('be.visible')
        .then(() => cy.press(Cypress.Keyboard.Keys.ENTER));
      waitForE2eApiCall(path, 'GET');
      cy.get(`[data-slot="bottom-operational-drawer-tab"][data-tab="data:${nodeId}"]`).should(
        'have.attr',
        'aria-selected',
        'true'
      );
      cy.get('[data-slot="bottom-operational-drawer-data"]')
        .should('contain.text', 'order_id')
        .and('contain.text', '7');
      cy.get('[data-slot="canvas-model-editor"]').should('not.exist');
      cy.then(() => {
        expect(getE2eApiCalls(path, 'GET')).to.have.length(1);
        expect(getE2eApiCalls(path, 'GET')[0]!.url.searchParams.get('limit')).to.equal('20');
        expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(saves);
        expect(getE2eApiCalls('/plans/preview', 'POST')).to.have.length(0);
        expect(getE2eApiCalls('/runs/start', 'POST')).to.have.length(0);
      });
    });
  }
});
