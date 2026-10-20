/** @ownedConcern Share controlled ready-Canvas setup and inspection between functional and nightly proofs. */
import { stubE2eJsonApi, waitForE2eApiCall } from './e2eApiStub';
import { revisitWorkbenchCanvas } from './relationalWorkbench/navigation';
import {
  E2E_PROJECT_WORKSPACE,
  stubShellBootstrapApis,
  visitWithE2eWorkspaceSession,
} from './workspaceSession';

export function stubRuntimeCapabilities(): void {
  stubShellBootstrapApis({
    scopes: ['workspace:graph-draft:view', 'workspace:graph-draft:save', 'run:start'],
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
      id: 'warehouse-b',
      name: 'Warehouse B',
      type: 'postgres',
      database: 'analytics_b',
    },
  ]);
  stubE2eJsonApi('POST', '/workspace/warehouse/connections/warehouse-b/test', {
    connectionId: 'warehouse-b',
    status: 'passed',
    checkedAt: '2026-08-13T00:00:00.000Z',
    objectCount: 1,
  });
}

export function visitReadyCanvas(path = '/canvas'): void {
  revisitWorkbenchCanvas(() =>
    visitWithE2eWorkspaceSession(path, {
      onBeforeLoad(window) {
        window.localStorage.setItem(
          'dvt-web-application-language',
          JSON.stringify({ state: { language: 'en' }, version: 0 })
        );
      },
    })
  );
  waitForE2eApiCall('/healthz', 'GET');
  waitForE2eApiCall('/capabilities', 'GET');
  waitForE2eApiCall('/workspace/graph/draft', 'GET');
}

export function openNodeProperties(nodeId: string): void {
  cy.get(`.react-flow__node[data-id="${nodeId}"] [data-slot="canvas-node-shell"]`).rightclick();
  cy.contains('[data-slot="canvas-node-context-menu-item"]', /^Properties$/).click();
  cy.get('[data-slot="canvas-node-workbench-panel"]').should('be.visible');
}
