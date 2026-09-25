/** Navigate field authoring through the existing semantic editor and Canvas card. */
import { installE2eApiFetchStub, waitForE2eApiCall } from '../e2eApiStub';
import { visitWithE2eWorkspaceSession } from '../workspaceSession';

import { openWorkbenchModel } from './navigation';
import { semanticWrites } from './persistence';
import { stubWorkbenchScenario } from './scenario';

export function visitCanvas(): void {
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

export function toggleColumns(nodeId: string): void {
  cy.get(`.react-flow__node[data-id="${nodeId}"]`)
    .find('button[aria-expanded]')
    .contains(/Columns|Columnas/)
    .click();
}

export function openJoinWorkbench(): void {
  cy.get(
    '.react-flow__node[data-id="join-transform"] [data-slot="canvas-node-shell"]'
  ).rightclick();
  cy.contains('[data-slot="canvas-node-context-menu-item"]', 'Properties').click();
}

export function prepareFieldSelection(sourceCount: 2 | 3): void {
  stubWorkbenchScenario(sourceCount === 2 ? 'saved-join' : 'partial-join');
  cy.viewport(1440, 1000);
  visitCanvas();
  if (sourceCount === 3) {
    openWorkbenchModel();
    cy.contains('[data-slot="canvas-relational-tree-source"]', 'shipments').click();
    cy.get('[data-slot="canvas-relational-tree-append-input"]').click();
    cy.get('[data-operator="read"]').should('have.length', 3);
    cy.get('[data-slot="canvas-relational-tree-apply"]').click();
    cy.wrap(null, { timeout: 20_000 }).should(() =>
      expect(semanticWrites('join-transform')).to.have.length(1)
    );
    cy.get('[data-slot="canvas-model-tab-close"]').click();
    cy.get('.react-flow__node[data-id="join-transform"]').should('be.focused');
  }
}
export function reloadFieldSelection(): void {
  cy.on('window:before:load', installE2eApiFetchStub);
  cy.reload();
  toggleColumns('join-transform');
}
