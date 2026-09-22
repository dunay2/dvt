/** Proves explicit destination authoring through the existing graph save/read boundary. */
import { stubStatefulCanvasDraftAuthoring } from '../../support/canvasDraftAuthoring';
import { getE2eApiCalls, stubE2eJsonApi, waitForE2eApiCall } from '../../support/e2eApiStub';
import {
  E2E_PROJECT_WORKSPACE,
  stubShellBootstrapApis,
  visitWithE2eWorkspaceSession,
} from '../../support/workspaceSession';

const node = '.react-flow__node[data-id="model-orders"]';
const overlay = '[data-slot="canvas-node-workbench-overlay"]';
const target = {
  schemaVersion: 'dvt-transform-result-target.v1',
  connectionRef: {
    schemaVersion: 'connection-ref.v1',
    provider: 'postgres',
    connectionId: 'canvas-e2e-postgres',
  },
  schema: 'analytics',
  relation: 'orders_result',
};

function visitCanvas(): void {
  visitWithE2eWorkspaceSession('/canvas', {
    onBeforeLoad(window) {
      window.localStorage.setItem(
        'dvt-web-application-language',
        JSON.stringify({ state: { language: 'en' }, version: 0 })
      );
    },
  });
  waitForE2eApiCall('/healthz', 'GET');
  waitForE2eApiCall('/capabilities', 'GET');
  waitForE2eApiCall('/workspace/graph/draft', 'GET');
}

function openProperties(): void {
  cy.get(`${node} [data-slot="graph-node-card-title"]`).rightclick();
  cy.get('[role="menuitem"]').contains('Properties').click();
  cy.get(overlay).should('be.visible');
}

function savedConfig(): Record<string, unknown> | undefined {
  const body = getE2eApiCalls('/workspace/graph/draft', 'PUT').at(-1)?.body as
    | {
        draft: { nodes: Array<{ id: string; metadata?: { config?: Record<string, unknown> } }> };
      }
    | undefined;
  return body?.draft.nodes.find((item) => item.id === 'model-orders')?.metadata?.config;
}

describe('Transform result destination', () => {
  it('requires explicit connection and names, saves and reloads them, then removes only the target', () => {
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
    stubStatefulCanvasDraftAuthoring({ canvasKind: 'transformation', columnMapping: true });
    visitCanvas();
    openProperties();
    cy.get(overlay).within(() => {
      cy.get('select[name="dvt-transform-result-connection"]')
        .should('have.value', '')
        .select(target.connectionRef.connectionId);
      cy.contains('button', 'Apply').should('be.disabled');
      cy.get('select[name="dvt-transform-materialization"]').select('table');
      cy.get('input[name="dvt-transform-result-schema"]').type(target.schema);
      cy.get('input[name="dvt-transform-result-relation"]').type(' invalid ');
      cy.contains('button', 'Apply').should('be.disabled');
      cy.get('input[name="dvt-transform-result-relation"]').clear().type(target.relation);
      cy.contains('button', 'Apply').should('be.enabled').click();
    });
    cy.wrap(null).should(() =>
      expect(savedConfig()).to.deep.equal({ materialized: 'table', resultTarget: target })
    );
    visitCanvas();
    openProperties();
    cy.get(overlay).within(() => {
      cy.get('select[name="dvt-transform-result-connection"]').should(
        'have.value',
        target.connectionRef.connectionId
      );
      cy.get('input[name="dvt-transform-result-schema"]').should('have.value', target.schema);
      cy.get('input[name="dvt-transform-result-relation"]').should('have.value', target.relation);
      cy.get('select[name="dvt-transform-result-connection"]').select('');
      cy.contains('button', 'Apply').should('be.enabled').click();
    });
    cy.wrap(null).should(() => expect(savedConfig()).to.deep.equal({ materialized: 'table' }));
    cy.get(overlay).find('button[aria-label="Close"]').click();
    cy.get(`${node} [data-slot="graph-node-card-title"]`).dblclick();
    cy.get('[data-slot="bottom-operational-drawer-tab"][data-tab="data:model-orders"]').should(
      'have.attr',
      'aria-selected',
      'true'
    );
    cy.get(overlay).should('not.exist');
  });
});
