/** Owned concern: prove DVT PostgreSQL connection authoring, persistence, and inheritance. */
import { stubStatefulCanvasDraftAuthoring } from '../../support/canvasDraftAuthoring';
import { getE2eApiCalls, stubE2eJsonApi, waitForE2eApiCall } from '../../support/e2eApiStub';
import {
  E2E_PROJECT_WORKSPACE,
  stubShellBootstrapApis,
  visitWithE2eWorkspaceSession,
} from '../../support/workspaceSession';

const CONNECTION_ID = 'warehouse-b';

function stubDvtConnectionAuthoring(): void {
  stubShellBootstrapApis({
    scopes: [
      'workspace:graph-draft:view',
      'workspace:graph-draft:save',
      'workspace:warehouse-connections:view',
      'workspace:warehouse-connections:test',
      'plan:preview',
    ],
  });
  stubE2eJsonApi('GET', '/workspace/context', {
    defaultWorkspace: E2E_PROJECT_WORKSPACE,
    availableWorkspaces: [E2E_PROJECT_WORKSPACE],
  });
  stubE2eJsonApi('GET', '/capabilities', {
    apiVersion: '1.0.0',
    minFrontendVersion: '0.0.1',
    plugins: {
      dbt: { available: true },
      dvt: { available: true },
    },
  });
  stubE2eJsonApi('GET', '/workspace/warehouse/connections', [
    {
      id: 'warehouse-a',
      name: 'Warehouse A',
      type: 'postgres',
      database: 'analytics_a',
    },
    {
      id: CONNECTION_ID,
      name: 'Warehouse B',
      type: 'postgres',
      database: 'analytics_b',
    },
  ]);
  stubE2eJsonApi('POST', `/workspace/warehouse/connections/${CONNECTION_ID}/test`, {
    connectionId: CONNECTION_ID,
    status: 'passed',
    checkedAt: '2026-08-13T00:00:00.000Z',
    objectCount: 1,
  });
  stubStatefulCanvasDraftAuthoring({
    authoringGenerated: true,
    title: 'DVT PostgreSQL binding',
  });
}

function visitDvtCanvas(language: 'en' | 'es' = 'en'): void {
  visitWithE2eWorkspaceSession('/canvas', {
    onBeforeLoad(window) {
      window.localStorage.setItem(
        'dvt-web-application-language',
        JSON.stringify({ state: { language }, version: 0 })
      );
    },
  });
  waitForE2eApiCall('/workspace/graph/draft', 'GET');
}

function openNode(nodeId: string): void {
  cy.get(`.react-flow__node[data-id="${nodeId}"] [data-slot="canvas-node-shell"]`)
    .should('be.visible')
    .dblclick();
  cy.get('[data-slot="canvas-node-workbench-panel"]').should('be.visible');
}

function assertNoSeriousAccessibilityViolations(): void {
  cy.injectAxe();
  cy.checkA11y(
    '[data-slot="canvas-node-workbench-overlay"]',
    {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
      },
      includedImpacts: ['serious', 'critical'],
    },
    (violations) => {
      expect(violations, JSON.stringify(violations, null, 2)).to.have.length(0);
    }
  );
}

describe('DVT PostgreSQL connection authority', () => {
  it('selects, tests, persists, reloads, and shows one inherited connection in EN and ES', () => {
    stubDvtConnectionAuthoring();
    cy.viewport(1280, 720);
    visitDvtCanvas();

    openNode('source-1');
    waitForE2eApiCall('/workspace/warehouse/connections', 'GET');
    cy.contains('label', 'PostgreSQL connection').scrollIntoView().should('be.visible');
    cy.get('select[name="dvt-source-connection"]').select(CONNECTION_ID);
    cy.contains('button', 'Test connection').click();
    waitForE2eApiCall(`/workspace/warehouse/connections/${CONNECTION_ID}/test`, 'POST');
    cy.contains('Connection available.').should('be.visible');
    cy.contains('[data-slot="canvas-node-workbench-panel"] button', 'Apply')
      .should('be.enabled')
      .click();

    cy.wrap(null).should(() => {
      const savedSource = getE2eApiCalls('/workspace/graph/draft', 'PUT')
        .map((call) => call.body as { draft: { nodes: Array<Record<string, unknown>> } })
        .flatMap((body) => body.draft.nodes)
        .find((node) => {
          const metadata = node.metadata as Record<string, unknown> | undefined;
          const connectionRef = metadata?.connectionRef as
            { connectionId?: string; provider?: string } | undefined;
          return node.id === 'source-1' && connectionRef?.connectionId === CONNECTION_ID;
        });

      expect(savedSource).to.not.be.undefined;
      const latestDraft = getE2eApiCalls('/workspace/graph/draft', 'PUT').at(-1)?.body as
        { draft: { nodes: Array<Record<string, unknown>> } } | undefined;
      for (const node of latestDraft?.draft.nodes ?? []) {
        if (node.id !== 'source-1') {
          expect(node.metadata).not.to.have.property('connectionRef');
        }
      }
    });

    cy.get('[data-slot="canvas-node-workbench-close"]').click();
    visitDvtCanvas();

    openNode('source-1');
    cy.get('select[name="dvt-source-connection"]').should('have.value', CONNECTION_ID);
    assertNoSeriousAccessibilityViolations();
    cy.get('[data-slot="canvas-node-workbench-close"]').click();

    openNode('dvt-transform-1');
    cy.contains('Inherited PostgreSQL connection').scrollIntoView().should('be.visible');
    cy.contains('code', CONNECTION_ID).should('be.visible');
    cy.get('[data-slot="canvas-node-workbench-close"]').click();

    openNode('sink-1');
    cy.get('[data-slot="canvas-node-workbench-tab-sink"]').click();
    cy.contains('Inherited PostgreSQL connection').scrollIntoView().should('be.visible');
    cy.contains('code', CONNECTION_ID).should('be.visible');
    cy.get('[data-slot="canvas-node-workbench-close"]').click();

    cy.get('[data-slot="shell-menu-trigger"]').click();
    cy.get('[data-slot="shell-language-option-es"]').click();
    cy.get('html').should('have.attr', 'lang', 'es');
    openNode('source-1');
    cy.contains('label', 'Conexión PostgreSQL').scrollIntoView().should('be.visible');
    cy.get('select[name="dvt-source-connection"]').should('have.value', CONNECTION_ID);
    cy.contains('button', 'Probar conexión').should('be.visible');
    assertNoSeriousAccessibilityViolations();
  });
});
