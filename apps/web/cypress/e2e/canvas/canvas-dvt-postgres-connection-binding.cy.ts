/**
 * Owned concern: prove DVT PostgreSQL connection authoring, persistence, and inheritance.
 * @baseline GH-3578: the current inspector owns provider-neutral translated labels.
 * @decision Bind an ordinary manual source; imported source authority is independently guarded.
 * @consequence The persisted Source→Model→Sink chain proves inheritance at the current Sink UI.
 * @version 1.0.0
 */
import {
  CONNECTION_REF_SCHEMA_VERSION,
  WorkspaceGraphDraftSaveRequestSchema,
} from '@dvt/contracts';

import { resolveCanvasViewCopy } from '../../../src/app/views/canvas/copy';
import { stubStatefulCanvasDraftAuthoring } from '../../support/canvasDraftAuthoring';
import { getE2eApiCalls, stubE2eJsonApi, waitForE2eApiCall } from '../../support/e2eApiStub';
import { revisitWorkbenchCanvas } from '../../support/relationalWorkbench/navigation';
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
    .rightclick();
  cy.contains('[data-slot="canvas-node-context-menu-item"]', /^(Properties|Propiedades)$/).click();
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
  it('binds a manual source, tests, persists, reloads, and shows inheritance in EN and ES', () => {
    const english = resolveCanvasViewCopy('en');
    const spanish = resolveCanvasViewCopy('es');
    stubDvtConnectionAuthoring();
    cy.viewport(1280, 720);
    visitDvtCanvas();

    openNode('src_orders');
    waitForE2eApiCall('/workspace/warehouse/connections', 'GET');
    cy.contains('label', english.inspectorDvtConnectionLabel).scrollIntoView().should('be.visible');
    cy.get('select[name="dvt-source-connection"]').select(CONNECTION_ID);
    cy.contains('button', 'Test connection').click();
    waitForE2eApiCall(`/workspace/warehouse/connections/${CONNECTION_ID}/test`, 'POST');
    cy.contains('Connection available.').should('be.visible');
    cy.contains('[data-slot="canvas-node-workbench-panel"] button', 'Apply')
      .should('be.enabled')
      .click();

    cy.wrap(null).should(() => {
      const { draft } = WorkspaceGraphDraftSaveRequestSchema.parse(
        getE2eApiCalls('/workspace/graph/draft', 'PUT').at(-1)?.body
      );
      expect(
        draft.nodes.find((node) => node.id === 'src_orders')?.metadata?.connectionRef
      ).to.deep.equal({
        schemaVersion: CONNECTION_REF_SCHEMA_VERSION,
        provider: 'postgres',
        connectionId: CONNECTION_ID,
      });
      expect(
        draft.edges.map(({ sourceId, targetId, relation }) => [sourceId, targetId, relation])
      ).to.have.deep.members([
        ['src_orders', 'model_orders', 'lineage'],
        ['model_orders', 'orders_dashboard', 'lineage'],
      ]);
      for (const node of draft.nodes) {
        if (node.id !== 'src_orders') {
          expect(node.metadata).not.to.have.property('connectionRef');
        }
      }
    });

    cy.get('[data-slot="canvas-node-workbench-close"]').click();
    revisitWorkbenchCanvas(visitDvtCanvas);

    openNode('src_orders');
    cy.get('select[name="dvt-source-connection"]').should('have.value', CONNECTION_ID);
    assertNoSeriousAccessibilityViolations();
    cy.get('[data-slot="canvas-node-workbench-close"]').click();

    openNode('orders_dashboard');
    cy.get('[data-slot="canvas-node-workbench-tab-sink"]').click();
    cy.contains(english.inspectorDvtInheritedConnectionLabel).scrollIntoView().should('be.visible');
    cy.contains('code', CONNECTION_ID).should('be.visible');
    cy.get('[data-slot="canvas-node-workbench-close"]').click();

    cy.get('[data-slot="shell-menu-trigger"]').click();
    cy.get('[data-slot="shell-language-option-es"]').click();
    cy.get('html').should('have.attr', 'lang', 'es');
    openNode('src_orders');
    cy.contains('label', spanish.inspectorDvtConnectionLabel).scrollIntoView().should('be.visible');
    cy.get('select[name="dvt-source-connection"]').should('have.value', CONNECTION_ID);
    cy.contains('button', spanish.inspectorDvtConnectionTestLabel).should('be.visible');
    assertNoSeriousAccessibilityViolations();
  });
});
