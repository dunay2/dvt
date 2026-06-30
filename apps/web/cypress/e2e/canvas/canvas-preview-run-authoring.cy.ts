import {
  clickCanvasContextMenuItem,
  expectPreviewExecutionPlanUnavailableFromCanvasContextMenu,
  openCanvasContextMenuAt,
} from '../../support/canvasExecutionSelection';
import { getE2eApiCalls, waitForE2eApiCall } from '../../support/e2eApiStub';
import {
  stubCanvasRuntimeApis,
  stubPreviewRunShellBootstrap,
  visitCanvasWithSettledBootstrap,
} from '../../support/test/canvasPreviewRunPersisted';
import { visitWithE2eWorkspaceSession } from '../../support/workspaceSession';

describe('Canvas preview-run authoring guardrails', () => {
  beforeEach(() => {
    stubPreviewRunShellBootstrap();
  });

  it('keeps dbt first-node authoring visible while execution actions stay unavailable', () => {
    stubCanvasRuntimeApis({
      canvasKind: 'dbt',
      emptyCanvas: true,
      title: 'Warehouse dbt',
    });

    visitCanvasWithSettledBootstrap();

    cy.contains('Warehouse dbt').should('be.visible');
    cy.contains('Start dbt canvas').should('be.visible');
    cy.contains('button', 'Add first dbt node').should('not.exist');
    openCanvasContextMenuAt(520, 300);
    cy.get('[data-slot="canvas-context-menu"]').should(($menu) => {
      expect($menu.text()).to.match(/Add\.\.\.|Anadir\.\.\./);
    });
    cy.get('[data-slot="canvas-context-menu"]').should('not.contain.text', 'Add source');
    cy.get('[data-slot="canvas-context-menu"]').should('not.contain.text', 'Anadir origen');
    clickCanvasContextMenuItem(/Add\.\.\.|Anadir\.\.\./);
    cy.get('[data-slot="canvas-context-menu"]').should(($menu) => {
      expect($menu.text()).to.match(/Add source|Anadir origen/);
    });
    cy.get('body').type('{esc}', { force: true });
    expectPreviewExecutionPlanUnavailableFromCanvasContextMenu();
    cy.get('[data-slot="canvas-toolbar-run-command"]').should('not.exist');
    cy.then(() => {
      expect(getE2eApiCalls('/plans/preview', 'POST')).to.have.length(0);
      expect(getE2eApiCalls('/runs/start', 'POST')).to.have.length(0);
    });
  });

  it('honors the empty-guide preference and restores it from Canvas settings', () => {
    stubCanvasRuntimeApis({
      canvasKind: 'dbt',
      emptyCanvas: true,
      title: 'Warehouse dbt',
    });

    visitWithE2eWorkspaceSession('/canvas', {
      onBeforeLoad(window) {
        window.localStorage.setItem(
          'dvt-web-ui-layout',
          JSON.stringify({
            state: {
              canvasEmptyStateGuideVisible: false,
            },
            version: 0,
          })
        );
      },
    });
    waitForE2eApiCall('/healthz', 'GET');
    waitForE2eApiCall('/readyz', 'GET');
    waitForE2eApiCall('/version', 'GET');
    waitForE2eApiCall('/db/ready', 'GET');
    waitForE2eApiCall('/capabilities', 'GET');
    waitForE2eApiCall('/workspace/graph/draft', 'GET');

    cy.contains('Warehouse dbt').should('be.visible');
    cy.contains('Start dbt canvas').should('not.exist');

    cy.get('[data-slot="shell-menu-trigger"]').click();
    cy.contains('[role="menuitem"]', /Canvas settings|Configuracion de canvas/).click();
    cy.contains('[role="menuitemcheckbox"]', /Empty canvas guide|Guia de canvas vacio/).click();

    cy.contains('Start dbt canvas').should('be.visible');
    cy.contains('button', 'Add first dbt node').should('not.exist');
  });
});
