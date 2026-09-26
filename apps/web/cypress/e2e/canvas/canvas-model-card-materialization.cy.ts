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
      window.localStorage.setItem(
        'dvt-web-canvas-interaction',
        JSON.stringify({
          state: {
            impactOverlayEnabled: false,
            columnLevelLineageEnabled: true,
            canvasLayouts: {},
          },
          version: 0,
        })
      );
    },
  });
  waitForE2eApiCall('/workspace/graph/draft', 'GET');
  // Selection raises overlapping cards, just as it does for a user; no forced interactions.
  cy.get('.react-flow__controls-fitview').click();
  cy.get('.react-flow__node[data-id="transform-customers"]').click('topLeft').as('modelNode');
}

describe('Model card materialization', () => {
  beforeEach(() => {
    cy.viewport(1600, 1000);
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
    const draft = stubStatefulCanvasDraftAuthoring({ projectionModel: true });
    const model = draft.nodes.find((node) => node.id === 'transform-customers')!;
    model.metadata = { ...model.metadata, config: { materialized: 'view' } };
  });

  it('changes and persists materialization without replacing or shifting the canvas', () => {
    visitCanvas();
    cy.get('@modelNode')
      .find('[data-slot="graph-node-materialization"] [data-icon="eye"]')
      .should('be.visible');
    cy.get('@modelNode').should('not.contain.text', 'Last run');
    cy.get('@modelNode').contains('button[aria-expanded]', 'Columns').click();
    cy.get('@modelNode').find('[data-slot="graph-node-column-piece"]').should('have.length', 3);
    let model: HTMLElement;
    let viewport: HTMLElement;
    let geometry: string;
    let observer: MutationObserver;
    const disruptions: string[] = [];
    cy.get('@modelNode').then(($node) => {
      model = $node[0]!;
      viewport = model.closest<HTMLElement>('.react-flow__viewport')!;
      geometry = `${viewport.style.transform}|${model.style.transform}|${model.offsetHeight}`;
      observer = new MutationObserver(() => {
        const current = `${viewport.style.transform}|${model.style.transform}|${model.offsetHeight}`;
        if (!model.isConnected || !viewport.isConnected || current !== geometry)
          disruptions.push(current);
      });
      observer.observe(viewport, { subtree: true, childList: true, attributes: true });
    });
    cy.get('@modelNode')
      .find('[data-slot="graph-node-materialization"]')
      .should('have.text', 'view')
      .click();
    cy.get('[role="menuitemradio"]').contains('view').should('have.attr', 'aria-checked', 'true');
    cy.screenshot('model-materialization-menu');
    cy.get('[role="menuitemradio"]').contains('table').click();
    cy.get('[role="menu"]').should('not.exist');
    cy.get('[data-slot="canvas-node-workbench-panel"]').should('not.exist');
    waitForE2eApiCall('/workspace/graph/draft', 'PUT');
    cy.get('@modelNode')
      .find('[data-slot="graph-node-materialization"]')
      .should('have.text', 'table');
    cy.wrap(null).should(() => {
      const saved = getE2eApiCalls('/workspace/graph/draft', 'PUT')
        .map((call) =>
          (call.body as { draft: WorkspaceGraphAuthoringDraft }).draft.nodes.find(
            (node) => node.id === 'transform-customers'
          )
        )
        .find(
          (node) =>
            (node?.metadata?.config as { materialized?: string } | undefined)?.materialized ===
            'table'
        );
      expect(saved, 'durably saved native materialization').not.to.be.undefined;
    });
    cy.get('@modelNode').then(($node) => {
      observer.disconnect();
      expect($node[0], 'same mounted card').to.equal(model);
      expect(disruptions, 'no canvas replacement or geometry changes').to.deep.equal([]);
    });
    cy.get('@modelNode').should('have.class', 'selected');
    cy.get('@modelNode')
      .find('[data-slot="graph-node-materialization"] [data-icon="table"]')
      .should('be.visible');
    cy.screenshot('model-materialization-saved');
    visitCanvas();
    cy.get('@modelNode')
      .find('[data-slot="graph-node-materialization"]')
      .should('have.text', 'table');
  });
});
