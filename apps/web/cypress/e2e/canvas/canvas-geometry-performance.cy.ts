/// <reference types="cypress" />
/**
 * Owned concern: prove rich-node interaction and local geometry at three bounded graph sizes.
 * @baseline GH-3578: input geometry and published Output nullability have separate proofs.
 * @decision Inspect actual Input fields and wait on save state and persisted positions, not sleeps.
 * @consequence Drag frames, release and reopen must not issue semantic draft writes.
 * @version 1.0.0
 */

import { stubStatefulCanvasDraftAuthoring } from '../../support/canvasDraftAuthoring';
import {
  dragCanvasNodeByViewportDelta,
  dragCanvasNodeOntoNode,
  openNodeWorkbenchSection,
} from '../../support/canvasGraphAuthoring';
import {
  getE2eApiCalls,
  installE2eApiFetchStub,
  stubE2eJsonApi,
  waitForE2eApiCall,
} from '../../support/e2eApiStub';
import { revisitWorkbenchCanvas } from '../../support/relationalWorkbench/navigation';
import {
  E2E_PROJECT_WORKSPACE,
  stubShellBootstrapApis,
  visitWithE2eWorkspaceSession,
} from '../../support/workspaceSession';

type PerformanceGraphNodeCount = 10 | 30 | 60;

function stubPerformanceCanvas(nodeCount: PerformanceGraphNodeCount): void {
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
  stubStatefulCanvasDraftAuthoring({ performanceGraphNodeCount: nodeCount });
}

function visitPerformanceCanvas(): void {
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
  waitForE2eApiCall('/healthz', 'GET');
  waitForE2eApiCall('/capabilities', 'GET');
  waitForE2eApiCall('/workspace/graph/draft', 'GET');
}

function canvasNode(nodeId: string): Cypress.Chainable<JQuery<HTMLElement>> {
  return cy.get(`.react-flow__node[data-id="${nodeId}"]`);
}

function readPersistedNodePosition(
  window: Cypress.AUTWindow,
  nodeId: string
): { x: number; y: number } | undefined {
  const stored = window.localStorage.getItem('dvt-web-canvas-interaction');
  if (stored == null) return undefined;
  const parsed = JSON.parse(stored) as {
    state?: {
      canvasLayouts?: Record<string, { nodePositions?: Record<string, { x: number; y: number }> }>;
    };
  };
  for (const layout of Object.values(parsed.state?.canvasLayouts ?? {})) {
    const position = layout.nodePositions?.[nodeId];
    if (position !== undefined) return position;
  }
  return undefined;
}

function expandColumns(nodeId: string): void {
  canvasNode(nodeId)
    .find('button[aria-expanded]')
    .contains(/Columns|Columnas/)
    .then(($button) => {
      if ($button.attr('aria-expanded') !== 'true') cy.wrap($button).click({ force: true });
    });
}

describe('Canvas geometry performance', () => {
  ([10, 30, 60] as const).forEach((nodeCount) => {
    it(
      `keeps ${nodeCount} rich nodes interactive while geometry stays outside the draft rail`,
      { defaultCommandTimeout: 30_000 },
      () => {
        cy.viewport(1920, 1080);
        stubPerformanceCanvas(nodeCount);
        visitPerformanceCanvas();

        cy.contains(`Canvas performance ${nodeCount} nodes`).should('be.visible');
        cy.get('.react-flow__node').should('have.length', nodeCount);
        canvasNode('performance-model-01')
          .find('button[aria-expanded]')
          .contains(/Columns|Columnas/)
          .should('exist');

        canvasNode('model-orders').click({ force: true }).should('have.class', 'selected');
        expandColumns('model-orders');
        canvasNode('model-orders')
          .contains('[data-slot="graph-node-column-row"]', 'customer')
          .find('[data-slot="graph-node-column-piece"]')
          .should('exist');
        canvasNode('model-orders')
          .find('[data-slot="graph-node-column-output-state"]')
          .should('not.exist');

        cy.get('[data-slot="canvas-draft-save-status"]').should('not.exist');
        let savesBeforeDragFrames = 0;
        let positionBeforeDrag: { x: number; y: number } | undefined;
        let positionAfterDrag: { x: number; y: number } | undefined;
        cy.window().then((window) => {
          savesBeforeDragFrames = getE2eApiCalls('/workspace/graph/draft', 'PUT').length;
          positionBeforeDrag = readPersistedNodePosition(window, 'model-orders');
          expect(positionBeforeDrag, 'persisted position before drag').not.to.be.undefined;
        });

        dragCanvasNodeByViewportDelta(
          'Orders model',
          { x: 120, y: 70 },
          {
            nodeId: 'model-orders',
            onFramesComplete() {
              canvasNode('model-orders').should('have.class', 'selected');
              cy.then(() => {
                expect(
                  getE2eApiCalls('/workspace/graph/draft', 'PUT').length,
                  'draft writes while pointer is moving'
                ).to.equal(savesBeforeDragFrames);
              });
            },
          }
        );

        cy.window()
          .should((window) => {
            expect(
              readPersistedNodePosition(window, 'model-orders'),
              'settled layout position'
            ).not.to.deep.equal(positionBeforeDrag);
            expect(
              getE2eApiCalls('/workspace/graph/draft', 'PUT').length,
              'layout-only draft writes after pointer release'
            ).to.equal(savesBeforeDragFrames);
          })
          .then((window) => {
            positionAfterDrag = readPersistedNodePosition(window, 'model-orders');
          });
        canvasNode('model-orders').should('have.class', 'selected');
        canvasNode('model-orders')
          .contains('[data-slot="graph-node-column-row"]', 'customer')
          .should('be.visible');

        canvasNode('model-orders')
          .find('[data-slot="canvas-node-shell"]')
          .rightclick({ force: true });
        cy.contains('[data-slot="canvas-node-context-menu-item"]', 'Properties').click();
        openNodeWorkbenchSection('columns');
        cy.get('[data-slot="canvas-node-workbench-tab-columns"]').should(
          'have.attr',
          'aria-selected',
          'true'
        );
        cy.get('[data-slot="canvas-node-workbench-close"]').click();
        cy.get('[data-slot="canvas-draft-save-status"]').should('not.exist');
        revisitWorkbenchCanvas(() => {
          cy.visit('/canvas', { onBeforeLoad: installE2eApiFetchStub });
        });
        cy.get('.react-flow__node').should('have.length', nodeCount);
        cy.get('[data-slot="canvas-draft-save-status"]').should('not.exist');
        cy.window().should((window) => {
          expect(readPersistedNodePosition(window, 'model-orders')).to.deep.equal(
            positionAfterDrag
          );
          expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(
            savesBeforeDragFrames
          );
        });
      }
    );
  });
  it(
    'uses live geometry for algebraic drop and persists one composition',
    { defaultCommandTimeout: 30_000 },
    () => {
      cy.viewport(1920, 1080);
      stubPerformanceCanvas(10);
      visitPerformanceCanvas();
      cy.get('.react-flow__node').should('have.length', 10);
      cy.get('[data-slot="canvas-draft-save-status"]').should('not.exist');

      let savesBeforeDrop = 0;
      cy.then(() => {
        savesBeforeDrop = getE2eApiCalls('/workspace/graph/draft', 'PUT').length;
      });

      dragCanvasNodeOntoNode('performance-source-right', 'performance-model-01');
      cy.wrap(null).should(() => {
        const compositionCalls = getE2eApiCalls('/workspace/graph/draft', 'PUT')
          .slice(savesBeforeDrop)
          .filter((call) => {
            const body = call.body as {
              draft?: { edges?: Array<{ sourceId: string; targetId: string }> };
            };
            return body.draft?.edges?.some(
              (edge) =>
                edge.sourceId === 'performance-source-right' &&
                edge.targetId === 'performance-model-01'
            );
          });
        expect(compositionCalls, 'persisted algebraic compositions').to.have.length(1);
        const body = compositionCalls[0]!.body as {
          draft: { edges: Array<{ sourceId: string; targetId: string }> };
        };
        expect(
          body.draft.edges.filter(
            (edge) =>
              edge.sourceId === 'performance-source-right' &&
              edge.targetId === 'performance-model-01'
          ),
          'composed edge occurrences'
        ).to.have.length(1);
      });
    }
  );
});
