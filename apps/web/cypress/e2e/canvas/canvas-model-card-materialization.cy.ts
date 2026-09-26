/** Prove card-only materialization uses the durable draft rail, without opening an editor. */
import type { WorkspaceGraphAuthoringDraft } from '@dvt/contracts';

import { stubStatefulCanvasDraftAuthoring } from '../../support/canvasDraftAuthoring';
import { getE2eApiCalls, stubE2eJsonApi, waitForE2eApiCall } from '../../support/e2eApiStub';
import {
  E2E_PROJECT_WORKSPACE,
  stubShellBootstrapApis,
  visitWithE2eWorkspaceSession,
} from '../../support/workspaceSession';

function visitCanvas(): void {
  visitWithE2eWorkspaceSession('/canvas', {
    onBeforeLoad(window) {
      window.localStorage.setItem(
        'dvt-web-application-language',
        JSON.stringify({ state: { language: 'en' }, version: 0 })
      );
    },
  });
  waitForE2eApiCall('/workspace/graph/draft', 'GET');
  // Selection raises overlapping cards, just as it does for a user; do not force the select.
  cy.get('.react-flow__node[data-id="model_orders"]').click('topLeft').as('modelNode');
}

describe('Model card materialization', () => {
  beforeEach(() => {
    stubShellBootstrapApis();
    stubE2eJsonApi('GET', '/workspace/context', {
      defaultWorkspace: E2E_PROJECT_WORKSPACE,
      availableWorkspaces: [E2E_PROJECT_WORKSPACE],
    });
    stubE2eJsonApi('GET', '/capabilities', {
      apiVersion: '1.0.0',
      minFrontendVersion: '0.0.1',
      plugins: { dvt: { available: true } },
    });
    stubStatefulCanvasDraftAuthoring();
  });

  it('persists native materialization and restores the selected value and header icon', () => {
    visitCanvas();
    cy.get('@modelNode')
      .find('[data-slot="graph-node-card-header-rail"] [data-icon="eye"]')
      .should('be.visible');
    cy.get('@modelNode').should('not.contain.text', 'Last run');
    cy.get('@modelNode')
      .find('select[name="model-card-materialization"]')
      .should('have.value', 'view')
      .select('table');
    cy.get('[data-slot="canvas-node-workbench-panel"]').should('not.exist');
    waitForE2eApiCall('/workspace/graph/draft', 'PUT');
    cy.get('@modelNode')
      .find('[data-slot="graph-node-card-header-rail"] [data-icon="table"]')
      .should('be.visible');
    cy.wrap(null).should(() => {
      const saved = getE2eApiCalls('/workspace/graph/draft', 'PUT')
        .map((call) =>
          (call.body as { draft: WorkspaceGraphAuthoringDraft }).draft.nodes.find(
            (node) => node.id === 'model_orders'
          )
        )
        .find(
          (node) =>
            (node?.metadata?.config as { materialized?: string } | undefined)?.materialized ===
            'table'
        );
      expect(saved, 'durably saved native materialization').not.to.be.undefined;
    });
    visitCanvas();
    cy.get('@modelNode')
      .find('select[name="model-card-materialization"]')
      .should('have.value', 'table');
    cy.get('@modelNode')
      .find('[data-slot="graph-node-card-header-rail"] [data-icon="table"]')
      .should('be.visible');
  });
});
