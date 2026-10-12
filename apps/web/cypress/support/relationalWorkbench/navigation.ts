/**
 * Owned concern: navigate Canvas Properties and connect the semantic editor through user gestures.
 * @baseline GH-2524-LIVE-V1-CONSUMERS: prove current authoring before protected execution.
 * @decision Share gestures, while each caller owns section, semantic and provider assertions.
 * @consequence No alternate editor, persistence or drag semantics live in a proof.
 * @version 1.0.0
 */
import { resolveCanvasViewCopy } from '../../../src/app/views/canvas/copy';
import { getE2eApiCalls, waitForE2eApiCall } from '../e2eApiStub';
import { visitWithE2eWorkspaceSession } from '../workspaceSession';

import { workbenchOperation } from './operationMenu';
import { hoverWorkbenchCard } from './pointer';

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
  cy.get(`.react-flow__node[data-id="${nodeId}"] [data-slot="graph-node-card-title"]`)
    .should('be.visible')
    .dblclick();
  cy.get('[data-slot="canvas-model-editor"]').should('be.visible');
}

/** Properties is a contextual action; Model double-click belongs to the semantic editor. */
export function openWorkbenchProperties(nodeId: string): void {
  const node = `.react-flow__node[data-id="${nodeId}"]`;
  cy.get(node, { timeout: 20_000 })
    .should('be.visible')
    .find('[data-slot="canvas-node-shell"]')
    .focus()
    .should('be.focused')
    // Body controls can take focus before the menu captures its opener.
    .find('[data-slot="graph-node-card-icon"]')
    .rightclick();
  cy.document().then((document) => {
    cy.contains(
      '[data-slot="canvas-node-context-menu-item"]',
      resolveCanvasViewCopy(document.documentElement.lang).canvasNodeContextPropertiesLabel
    ).click();
  });
  cy.get('[data-slot="canvas-node-context-menu"]').should('not.exist');
  cy.get('body').should('not.have.css', 'pointer-events', 'none');
  cy.get(node).find('[data-slot="canvas-node-shell"]').should('be.focused');
  cy.get('[data-slot="canvas-node-workbench-overlay"]', { timeout: 20_000 }).should('be.visible');
}

/** Reopening must observe this navigation's draft, not a previous recorded GET. */
export function revisitWorkbenchCanvas(navigate: () => void = visitWorkbenchCanvas): void {
  cy.then(() => {
    const previous = getE2eApiCalls('/workspace/graph/draft', 'GET').length;
    navigate();
    cy.wrap(null, { timeout: 20_000 }).should(() => {
      expect(getE2eApiCalls('/workspace/graph/draft', 'GET').length).to.be.greaterThan(previous);
    });
  });
}

/** Request the model sample through the existing card action, not editor navigation. */
export function previewWorkbenchModel(nodeId = 'join-transform'): void {
  cy.get('[data-slot="canvas-workspace-tab"]').click();
  hoverWorkbenchCard(`.react-flow__node[data-id="${nodeId}"] [data-slot="canvas-node-shell"]`);
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

/** Stage a unary operation and explicitly connect its primary input. */
export function stageWorkbenchUnary(
  operation: string,
  producer: string,
  disconnectOutput = false
): void {
  const staged = `[data-pending-operation="true"] [data-operator="${operation}"]`;
  workbenchOperation(operation).should('have.attr', 'aria-disabled', 'false').click();
  cy.get(staged).should('exist').closest('li').as('stagedUnaryTarget');
  if (disconnectOutput) {
    cy.get('[data-slot="canvas-relational-output-input-port"]').focus().type('{del}');
    cy.get('[data-slot="canvas-relational-output-input-port"]').should(
      'not.have.attr',
      'data-connected'
    );
  }
  cy.get(producer).last().closest('li').as('stagedUnaryProducer');
  connectWorkbenchProducer('@stagedUnaryProducer', '@stagedUnaryTarget');
  cy.get(staged)
    .closest('li')
    .find('[data-slot="canvas-relational-input-port"]')
    .should('have.attr', 'data-connected', 'true');
}
