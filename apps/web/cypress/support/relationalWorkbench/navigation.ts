/** Owned concern: enter the semantic editor through supported user interactions. */
import { waitForE2eApiCall } from '../e2eApiStub';
import { visitWithE2eWorkspaceSession } from '../workspaceSession';

export function visitWorkbenchCanvas(language: 'en' | 'es' = 'en'): void {
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

export function openWorkbenchModel(nodeId = 'join-transform'): void {
  cy.get(`.react-flow__node[data-id="${nodeId}"] [data-slot="canvas-node-shell"]`)
    .should('be.visible')
    .dblclick(40, 18);
  cy.get('[data-slot="canvas-model-editor"]').should('be.visible');
}

export function dragWorkbenchSource(sourceLabel: string, position: 'primary' | 'secondary'): void {
  cy.window().then((window) => {
    const dataTransfer = new window.DataTransfer();
    cy.contains('[data-slot="canvas-relational-tree-source"]', sourceLabel).trigger('dragstart', {
      dataTransfer,
    });
    cy.get(`[data-slot="canvas-relational-tree-input-slot"][data-position="${position}"]`)
      .should('be.visible')
      .trigger('dragover', { dataTransfer })
      .trigger('drop', { dataTransfer });
  });
}
