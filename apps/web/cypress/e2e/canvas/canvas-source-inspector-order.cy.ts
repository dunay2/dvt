/** Owned concern: prove Source Inspector list ordering remains visible and local. */
import { stubStatefulCanvasDraftAuthoring } from '../../support/canvasDraftAuthoring';
import {
  getE2eApiCalls,
  installE2eApiFetchStub,
  stubE2eJsonApi,
  waitForE2eApiCall,
} from '../../support/e2eApiStub';
import {
  E2E_PROJECT_WORKSPACE,
  stubShellBootstrapApis,
  visitWithE2eWorkspaceSession,
} from '../../support/workspaceSession';

function stubCanvas(): void {
  stubShellBootstrapApis({ scopes: ['workspace:graph-draft:view', 'workspace:graph-draft:save'] });
  stubE2eJsonApi('GET', '/workspace/context', {
    defaultWorkspace: E2E_PROJECT_WORKSPACE,
    availableWorkspaces: [E2E_PROJECT_WORKSPACE],
  });
  stubE2eJsonApi('GET', '/capabilities', {
    apiVersion: '1.0.0',
    minFrontendVersion: '0.0.1',
    plugins: { dvt: { available: true } },
  });
  stubStatefulCanvasDraftAuthoring({
    canvasKind: 'transformation',
    columnMapping: true,
    sourceInspectorOrdering: true,
  });
}

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
  cy.get('.react-flow__node[data-id="source-orders"]').should('be.visible');
}

function openSourceSection(sectionId: 'columns' | 'inputs-outputs'): void {
  cy.get('.react-flow__node[data-id="source-orders"] [data-slot="canvas-node-shell"]')
    .should('be.visible')
    .rightclick();
  cy.contains('[data-slot="canvas-node-context-menu-item"]', 'Properties').click();
  cy.get(`[data-slot="canvas-node-workbench-tab-${sectionId}"]`).click();
}

function expectOrder(
  selector: string,
  dataKey: 'columnName' | 'relationshipId',
  expected: string[]
): void {
  cy.get(selector).then(($rows) => {
    expect([...$rows].map((row) => (row as HTMLElement).dataset[dataKey])).to.deep.equal(expected);
  });
}

function dragBefore(movedSelector: string, targetSelector: string): void {
  cy.window().then((window) => {
    const dataTransfer = new window.DataTransfer();
    cy.get(movedSelector).trigger('dragstart', { dataTransfer });
    cy.get(targetSelector).then(($target) => {
      const target = $target.get(0);
      const clientY = target.getBoundingClientRect().top + 1;
      cy.wrap($target)
        .trigger('dragover', { clientY, dataTransfer })
        .trigger('drop', { clientY, dataTransfer });
    });
  });
}

describe('Canvas Source Inspector ordering', () => {
  beforeEach(() => stubCanvas());

  it('reorders fields and outputs without mutating the graph and restores both orders', () => {
    cy.viewport(1440, 900);
    visitCanvas();

    openSourceSection('columns');
    dragBefore('[data-column-name="amount"]', '[data-column-name="order_id"]');
    expectOrder('[data-slot="source-column-row"]', 'columnName', [
      'amount',
      'order_id',
      'customer',
      'status',
      'created_at',
      'region',
    ]);
    cy.get('[data-column-name="amount"]')
      .should('be.focused')
      .and('have.attr', 'aria-selected', 'true');
    cy.get('[data-slot="canvas-node-workbench-close"]').click();

    openSourceSection('inputs-outputs');
    cy.get('[data-relationship-id="output:edge-source-model-secondary"]')
      .focus()
      .trigger('keydown', { key: 'ArrowUp', altKey: true });
    expectOrder('[data-slot="source-relationship-row"]', 'relationshipId', [
      'output:edge-source-model-secondary',
      'output:edge-source-model',
    ]);
    cy.get('[data-relationship-id="output:edge-source-model-secondary"]')
      .should('be.focused')
      .and('have.attr', 'aria-selected', 'true');
    cy.get('[data-slot="canvas-node-workbench-close"]').click();

    expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(0);
    cy.window().then((window) => {
      expect(window.localStorage.getItem('dvt-web-canvas-interaction')).to.contain(
        'inspectorListOrdersByNode'
      );
    });

    cy.visit('/canvas', {
      onBeforeLoad(window) {
        installE2eApiFetchStub(window);
      },
    });
    waitForE2eApiCall('/workspace/graph/draft', 'GET');
    cy.get('.react-flow__node[data-id="source-orders"]').should('be.visible');

    openSourceSection('columns');
    expectOrder('[data-slot="source-column-row"]', 'columnName', [
      'amount',
      'order_id',
      'customer',
      'status',
      'created_at',
      'region',
    ]);
    cy.get('[data-slot="canvas-node-workbench-close"]').click();

    openSourceSection('inputs-outputs');
    expectOrder('[data-slot="source-relationship-row"]', 'relationshipId', [
      'output:edge-source-model-secondary',
      'output:edge-source-model',
    ]);
    expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(0);
  });
});
