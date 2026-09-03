import {
  clickCanvasContextMenuItem,
  expectPreviewExecutionPlanUnavailableFromCanvasContextMenu,
  getVisibleCanvasNode,
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
    cy.get('[data-slot="canvas-empty-state"]').should('be.visible');
    cy.contains('button', 'Add first dbt node').should('not.exist');
    openCanvasContextMenuAt(520, 300);
    cy.get('[data-slot="canvas-context-menu"]').should(($menu) => {
      expect($menu.text()).to.match(/Add\.\.\.|Añadir\.\.\./);
    });
    cy.get('[data-slot="canvas-context-menu"]').should('not.contain.text', 'Add source');
    cy.get('[data-slot="canvas-context-menu"]').should('not.contain.text', 'Añadir origen');
    clickCanvasContextMenuItem(/Add\.\.\.|Añadir\.\.\./);
    cy.get('[role="dialog"]').should(($dialog) => {
      expect($dialog.text()).to.match(/Add source|Añadir origen/);
    });
    cy.get('body').type('{esc}', { force: true });
    cy.get('[role="dialog"]').should('not.exist');
    expectPreviewExecutionPlanUnavailableFromCanvasContextMenu();
    cy.get('[data-slot="canvas-toolbar-run-command"]').should('not.exist');
    cy.then(() => {
      expect(getE2eApiCalls('/plans/preview', 'POST')).to.have.length(0);
      expect(getE2eApiCalls('/runs/start', 'POST')).to.have.length(0);
    });
  });

  it('keeps canonical Transform authoring visible without the retired execution actions', () => {
    stubCanvasRuntimeApis({ title: 'Canonical Transform' });

    visitCanvasWithSettledBootstrap();

    cy.contains('Canonical Transform').should('be.visible');
    getVisibleCanvasNode('src_orders').find('[data-slot="canvas-node-shell"]').rightclick();
    cy.get('[data-slot="canvas-node-context-menu"]').should('be.visible');
    cy.get('[data-slot="canvas-node-context-menu-item"]')
      .should('have.length.greaterThan', 0)
      .should(($items) => {
        expect($items.text()).not.to.match(/Select for execution|Seleccionar para ejecución/);
      });
    cy.get('body').type('{esc}', { force: true });
    expectPreviewExecutionPlanUnavailableFromCanvasContextMenu();
    cy.get('[data-slot="canvas-toolbar-run-command"]').should('not.exist');
    cy.then(() => {
      expect(getE2eApiCalls('/plans/preview', 'POST')).to.have.length(0);
      expect(getE2eApiCalls('/runs/start', 'POST')).to.have.length(0);
    });
  });

  it('honors the empty-guide preference and restores it from Canvas properties', () => {
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
    cy.get('[data-slot="canvas-empty-state"]').should('not.exist');

    openCanvasContextMenuAt(520, 300);
    clickCanvasContextMenuItem(/Canvas properties|Propiedades del canvas/);
    cy.get('[data-slot="canvas-properties-empty-guide"]').click();
    cy.get('[data-slot="workbench-properties-apply"]').click();

    cy.get('[data-slot="canvas-empty-state"]').should('be.visible');
    cy.contains('button', 'Add first dbt node').should('not.exist');
  });

  it('keeps shell and Canvas context actions keyboard operable without losing focus', () => {
    stubCanvasRuntimeApis({
      canvasKind: 'dbt',
      emptyCanvas: true,
      title: 'Warehouse dbt',
    });

    visitCanvasWithSettledBootstrap();

    cy.get('[data-slot="canvas-empty-guide-preference"]').uncheck();
    cy.get('[data-slot="canvas-empty-state"]').should('not.exist');

    cy.get('[data-slot="app-shell-skip-link"]').focus();
    cy.press(Cypress.Keyboard.Keys.ENTER);
    cy.focused().should('have.attr', 'id', 'app-shell-main-content');

    cy.get('[data-slot="canvas-viewport-context-surface"]')
      .focus()
      .then(($surface) => {
        $surface.get(0)?.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'ContextMenu',
            code: 'ContextMenu',
            bubbles: true,
            cancelable: true,
          })
        );
      });

    cy.get('[data-slot="canvas-context-menu"] [role="menuitem"]').first().should('have.focus');
    cy.press(Cypress.Keyboard.Keys.END);
    cy.focused().should('have.attr', 'data-menu-action', 'open-canvas-settings');
    cy.press(Cypress.Keyboard.Keys.ENTER);

    cy.get('[data-slot="canvas-settings-dialog"]')
      .should('be.visible')
      .should(($dialog) => {
        expect($dialog[0]?.contains(Cypress.$(':focus')[0])).to.equal(true);
      });
    cy.press(Cypress.Keyboard.Keys.ESC);

    cy.get('[data-slot="canvas-settings-dialog"]').should('not.exist');
    cy.focused()
      .should('have.attr', 'data-slot', 'canvas-viewport-context-surface')
      .should(($focused) => {
        expect($focused[0]).not.to.equal(Cypress.$('body')[0]);
      });
  });
});
