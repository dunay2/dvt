import { stubStatefulCanvasDraftAuthoring } from '../../support/canvasDraftAuthoring';
import {
  clickCanvasContextMenuItem,
  openCanvasContextMenuAt,
} from '../../support/canvasExecutionSelection';
import { stubE2eJsonApi, waitForE2eApiCall } from '../../support/e2eApiStub';
import {
  E2E_WORKSPACE_SESSION,
  stubShellBootstrapApis,
  visitWithE2eWorkspaceSession,
} from '../../support/workspaceSession';

type DragPoint = Readonly<{ x: number; y: number }>;

function stubRuntimeCapabilities(): void {
  stubE2eJsonApi('GET', '/capabilities', {
    apiVersion: '1.0.0',
    minFrontendVersion: '0.0.1',
    plugins: {
      dvt: { available: true },
    },
  });
}

function stubWorkspaceContext(): void {
  stubE2eJsonApi('GET', '/workspace/context', {
    defaultWorkspace: E2E_WORKSPACE_SESSION,
    availableWorkspaces: [E2E_WORKSPACE_SESSION],
  });
}

function buildMouseDragEvent(
  point: DragPoint,
  buttons: number,
  view: Cypress.AUTWindow
): MouseEventInit {
  return {
    bubbles: true,
    button: 0,
    buttons,
    cancelable: true,
    clientX: point.x,
    clientY: point.y,
    screenX: point.x,
    screenY: point.y,
    view,
  };
}

function dispatchMouseDragEvent(
  target: EventTarget,
  view: Cypress.AUTWindow,
  type: 'mousedown' | 'mousemove' | 'mouseup',
  point: DragPoint,
  buttons: number
): void {
  target.dispatchEvent(new view.MouseEvent(type, buildMouseDragEvent(point, buttons, view)));
}

function visitCanvasWithStubbedBackend(): void {
  visitWithE2eWorkspaceSession('/canvas');
  waitForE2eApiCall('/healthz', 'GET');
  waitForE2eApiCall('/readyz', 'GET');
  waitForE2eApiCall('/version', 'GET');
  waitForE2eApiCall('/db/ready', 'GET');
  waitForE2eApiCall('/capabilities', 'GET');
  waitForE2eApiCall('/workspace/graph/draft', 'GET');
}

function createTransformationCanvasIfEmpty(): void {
  cy.get('body').then(($body) => {
    const hasEmptyPlayground = $body.find('[data-slot="canvas-playground-empty-state"]').length > 0;
    if (hasEmptyPlayground) {
      cy.get('[data-slot="canvas-playground-empty-state"]')
        .contains('button', /Transformation/i)
        .click();
    }
  });
}

function addSourceNodeFromCanvasContextMenuIfMissing(): void {
  cy.get('body').then(($body) => {
    const hasSourceNode = $body.find('.react-flow__node:contains("Source 1")').length > 0;
    if (!hasSourceNode) {
      openCanvasContextMenuAt(32, 140);
      cy.get('[data-slot="canvas-context-menu"]', { timeout: 20_000 }).should('be.visible');
      clickCanvasContextMenuItem('Add...');
      cy.get('body').then(($nextBody) => {
        const contextMenuText = $nextBody
          .find('[data-slot="canvas-context-menu"] [role="menuitem"]')
          .text();

        if (contextMenuText.includes('Create source node')) {
          clickCanvasContextMenuItem('Create source node');
          return;
        }

        clickCanvasContextMenuItem('Add source');
      });
    }
  });
}

function dragSourceNode(alias: string): void {
  cy.contains('.react-flow__node', 'Source 1', { timeout: 20_000 })
    .should('be.visible')
    .then(($node) => {
      const rect = $node[0].getBoundingClientRect();
      cy.wrap({ left: rect.left, top: rect.top }).as(alias);

      const start = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
      const middle = { x: start.x + 30, y: start.y + 20 };
      const end = { x: start.x + 110, y: start.y + 80 };

      cy.window().then((window) => {
        dispatchMouseDragEvent($node[0], window, 'mousedown', start, 1);
        dispatchMouseDragEvent(window, window, 'mousemove', middle, 1);
        dispatchMouseDragEvent(window, window, 'mousemove', end, 1);
        dispatchMouseDragEvent(window, window, 'mouseup', end, 0);
      });
    });
}

function assertSourceNodeMovedFrom(alias: string): void {
  cy.get<{ left: number; top: number }>(`@${alias}`).then((before) => {
    cy.contains('.react-flow__node', 'Source 1').should(($node) => {
      const rect = $node[0].getBoundingClientRect();
      const distance = Math.abs(rect.left - before.left) + Math.abs(rect.top - before.top);
      expect(distance, 'source node moved after drag').to.be.greaterThan(20);
    });
  });
}

describe('Canvas happy path remains writable after create/save', () => {
  beforeEach(() => {
    stubShellBootstrapApis();
    stubRuntimeCapabilities();
    stubWorkspaceContext();
    stubStatefulCanvasDraftAuthoring({ emptyCanvas: true, canvasKind: 'transformation' });
  });

  it('creates canvas, keeps no projection-gap block, and allows drag', () => {
    visitCanvasWithStubbedBackend();
    createTransformationCanvasIfEmpty();
    addSourceNodeFromCanvasContextMenuIfMissing();

    cy.contains('El draft persistido va por delante').should('not.exist');
    cy.contains('.react-flow__node', 'Source 1', { timeout: 20_000 }).should('be.visible');
    cy.screenshot('canvas-happy-path-before-drag');

    dragSourceNode('sourceBeforeDrag');
    assertSourceNodeMovedFrom('sourceBeforeDrag');
    cy.contains('El draft persistido va por delante').should('not.exist');
    cy.screenshot('canvas-happy-path-after-drag');
  });
});
