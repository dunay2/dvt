/** Owned concern: prove the VTX1 column-mapping story through the governed Canvas draft rail. */
import { stubStatefulCanvasDraftAuthoring } from '../../support/canvasDraftAuthoring';
import { stubE2eJsonApi, waitForE2eApiCall } from '../../support/e2eApiStub';
import {
  E2E_PROJECT_WORKSPACE,
  stubShellBootstrapApis,
  visitWithE2eWorkspaceSession,
} from '../../support/workspaceSession';

function stubColumnMappingCanvas(): void {
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
}

function visitColumnMappingCanvas(language: 'en' | 'es' = 'en'): void {
  visitWithE2eWorkspaceSession('/canvas', {
    onBeforeLoad(window) {
      window.localStorage.setItem(
        'dvt-web-application-language',
        JSON.stringify({ state: { language }, version: 0 })
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
  waitForE2eApiCall('/healthz', 'GET');
  waitForE2eApiCall('/capabilities', 'GET');
  waitForE2eApiCall('/workspace/graph/draft', 'GET');
}

function canvasNode(nodeId: string): Cypress.Chainable<JQuery<HTMLElement>> {
  return cy.get(`.react-flow__node[data-id="${nodeId}"]`);
}

function toggleColumns(nodeId: string): void {
  canvasNode(nodeId)
    .find('button[aria-expanded]')
    .contains(/Columns|Columnas/)
    .click();
}

function assertNoSeriousAccessibilityViolations(): void {
  cy.injectAxe();
  cy.checkA11y(
    '[data-slot="canvas-viewport-context-surface"]',
    {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
      },
      includedImpacts: ['serious', 'critical'],
    },
    (violations) => {
      if (violations.length > 0) {
        throw new Error(violations.map((violation) => violation.id).join(', '));
      }
    }
  );
}

describe('Canvas column lineage mapping', () => {
  beforeEach(() => {
    stubColumnMappingCanvas();
  });

  it('creates, changes, collapses, restores, and removes recipe-derived mappings', () => {
    visitColumnMappingCanvas('en');

    cy.get('.react-flow__edge-columnLineage').should('not.exist');
    toggleColumns('source-orders');
    toggleColumns('model-orders');
    cy.get(
      '.react-flow__edge[data-id="edge-source-model"]:not(.react-flow__edge-columnLineage) .react-flow__edge-path'
    ).should(($edgePath) => {
      const handleSelector = '[data-slot="canvas-node-port-handle"][data-port-variant="node"]';
      const sourceHandle = Cypress.$(
        `.react-flow__node[data-id="source-orders"] ${handleSelector}[data-port="source"]`
      )[0] as HTMLElement | undefined;
      const targetHandle = Cypress.$(
        `.react-flow__node[data-id="model-orders"] ${handleSelector}[data-port="target"]`
      )[0] as HTMLElement | undefined;
      expect(sourceHandle, 'source node handle').not.to.be.undefined;
      expect(targetHandle, 'target node handle').not.to.be.undefined;

      const path = $edgePath[0] as SVGPathElement;
      const screenMatrix = path.getScreenCTM();
      expect(screenMatrix, 'stage edge screen transform').not.to.be.null;

      const pointOnScreen = (length: number): DOMPoint => {
        const point = path.getPointAtLength(length);
        return new DOMPoint(point.x, point.y).matrixTransform(screenMatrix!);
      };
      const sourceRect = sourceHandle!.getBoundingClientRect();
      const targetRect = targetHandle!.getBoundingClientRect();
      const sourceCenter = new DOMPoint(
        sourceRect.left + sourceRect.width / 2,
        sourceRect.top + sourceRect.height / 2
      );
      const targetCenter = new DOMPoint(
        targetRect.left + targetRect.width / 2,
        targetRect.top + targetRect.height / 2
      );
      const pathStart = pointOnScreen(0);
      const pathEnd = pointOnScreen(path.getTotalLength());
      const distance = (left: DOMPoint, right: DOMPoint): number =>
        Math.hypot(left.x - right.x, left.y - right.y);

      expect(distance(pathStart, sourceCenter), 'source endpoint attachment').to.be.lte(
        sourceRect.width / 2 + 1
      );
      expect(distance(pathEnd, targetCenter), 'target endpoint attachment').to.be.lte(
        targetRect.width / 2 + 1
      );
    });

    canvasNode('source-orders')
      .find('[data-slot="canvas-node-port-handle"][aria-label="Connect order_id output"]')
      .should('be.visible');
    canvasNode('source-orders')
      .find('[data-slot="canvas-node-port-handle"][aria-label^="Map into "]')
      .should('not.exist');
    canvasNode('model-orders')
      .find('[data-slot="canvas-node-port-handle"][aria-label="Map into order_id"]')
      .should('be.visible');
    canvasNode('model-orders')
      .find('[data-slot="canvas-node-port-handle"][aria-label="Connect order_id output"]')
      .should('be.visible');

    canvasNode('source-orders')
      .find('[data-slot="canvas-node-port-handle"][aria-label="Connect order_id output"]')
      .focus()
      .trigger('keydown', { key: 'Enter', code: 'Enter' });
    canvasNode('model-orders')
      .find('[data-slot="canvas-node-port-handle"][aria-label="Map into order_id"]')
      .focus()
      .trigger('keydown', { key: 'Enter', code: 'Enter' });
    cy.get('.react-flow__edge-columnLineage[aria-label="order_id → order_id"]')
      .should('exist')
      .find('.react-flow__edge-path')
      .should('have.attr', 'd')
      .and('not.be.empty');

    canvasNode('source-orders')
      .find('[data-slot="canvas-node-port-handle"][aria-label="Connect customer output"]')
      .click();
    canvasNode('model-orders')
      .find('[data-slot="canvas-node-port-handle"][aria-label="Map into customer"]')
      .click();
    cy.get('.react-flow__edge-columnLineage[aria-label="customer → customer"]').should('exist');
    canvasNode('model-orders').find('[data-slot="graph-node-column-row"]').should('have.length', 3);

    canvasNode('source-orders')
      .find('[data-slot="canvas-node-port-handle"][aria-label="Connect customer output"]')
      .click();
    canvasNode('model-orders')
      .find('[data-slot="canvas-node-port-handle"][aria-label="Map into order_id"]')
      .click();
    cy.get('.react-flow__edge-columnLineage[aria-label="order_id → order_id"]').should('not.exist');
    cy.get('.react-flow__edge-columnLineage[aria-label="customer → order_id"]').should('exist');

    toggleColumns('source-orders');
    toggleColumns('model-orders');
    cy.get('.react-flow__edge-columnLineage').should('not.exist');
    toggleColumns('source-orders');
    toggleColumns('model-orders');
    cy.get('.react-flow__edge-columnLineage').should('have.length', 2);

    cy.get('.react-flow__edge-columnLineage[aria-label="customer → customer"]').focus();
    cy.get('.react-flow__edge-columnLineage[aria-label="customer → customer"]').trigger('keydown', {
      key: ' ',
      code: 'Space',
      force: true,
    });
    cy.get('button[aria-label="Remove mapping customer to customer"]')
      .should('be.visible')
      .focus()
      .should('have.focus');
    cy.get('button[aria-label="Remove mapping customer to customer"]').click({ force: true });
    cy.get('.react-flow__edge-columnLineage[aria-label="customer → customer"]').should('not.exist');
    cy.get('.react-flow__edge-columnLineage[aria-label="customer → order_id"]').should('exist');
    cy.get('.react-flow__edge:not(.react-flow__edge-columnLineage)').should(
      'have.length.greaterThan',
      0
    );

    assertNoSeriousAccessibilityViolations();
  });

  it('localizes the mapping controls in a constrained Spanish viewport', () => {
    cy.viewport(720, 600);
    visitColumnMappingCanvas('es');
    toggleColumns('source-orders');
    toggleColumns('model-orders');

    canvasNode('source-orders')
      .find('[data-slot="canvas-node-port-handle"][aria-label="Conectar salida de order_id"]')
      .should('be.visible');
    canvasNode('model-orders')
      .find('[data-slot="canvas-node-port-handle"][aria-label="Asignar a order_id"]')
      .should('be.visible');
    assertNoSeriousAccessibilityViolations();
  });
});
