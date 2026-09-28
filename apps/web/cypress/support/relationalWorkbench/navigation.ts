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

/** Request the model sample through the existing card action, not editor navigation. */
export function previewWorkbenchModel(nodeId = 'join-transform'): void {
  cy.get('[data-slot="canvas-workspace-tab"]').click();
  cy.get(`.react-flow__node[data-id="${nodeId}"] [data-slot="canvas-node-execute"]`)
    .focus()
    .click();
  cy.get(`[data-slot="bottom-operational-drawer-tab"][data-tab="data:${nodeId}"]`).should(
    'have.attr',
    'aria-selected',
    'true'
  );
}

export function dragWorkbenchSource(sourceLabel: string): void {
  cy.window().then((window) => {
    const dataTransfer = new window.DataTransfer();
    cy.contains('[data-slot="canvas-relational-tree-source"]', sourceLabel).trigger('dragstart', {
      dataTransfer,
    });
    cy.get(
      '[data-slot="canvas-relational-tree-draft-viewport"], [data-slot="canvas-relational-tree-viewport"]'
    )
      .should('be.visible')
      .trigger('dragover', { dataTransfer })
      .trigger('drop', { dataTransfer });
  });
}

/** Connect an explicit producer output to one operation Input or the passive terminal. */
export function connectWorkbenchProducer(
  producer: string,
  consumer: string,
  port: number | null = 0
): void {
  cy.window().then((window) => {
    const dataTransfer = new window.DataTransfer();
    cy.get(producer)
      .find('[data-slot="canvas-relational-output-port"]')
      .trigger('dragstart', { dataTransfer });
    const target =
      port == null
        ? cy.get(consumer)
        : cy.get(consumer).find('[data-slot="canvas-relational-input-port"]').eq(port);
    target.trigger('dragover', { dataTransfer }).trigger('drop', { dataTransfer });
  });
}
