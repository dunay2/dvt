/**
 * Owned concern: navigate persisted field selection through the current Model inspector.
 * @baseline GH-3578: composition uses explicit producers and consumer ports.
 * @decision Reuse the existing JOIN chain and Model Output controls.
 * @consequence Shared journeys preserve real Apply, ACK and reopen boundaries.
 * @version 1.0.0
 */
import { installE2eApiFetchStub, waitForE2eApiCall } from '../e2eApiStub';
import { visitWithE2eWorkspaceSession } from '../workspaceSession';

import { joinWorkbenchProducers } from './joinChain';
import { openWorkbenchModel, dragWorkbenchSource, connectWorkbenchProducer } from './navigation';
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

export function openModelOutputs(nodeId = 'join-transform'): void {
  openWorkbenchModel(nodeId);
  cy.get('[data-slot="canvas-relational-tree-output-open"]').click();
  cy.get('[data-slot="canvas-model-output-inspector"]')
    .should('be.visible')
    .find('[data-slot="canvas-operation-output-tab"]')
    .click();
}

export function prepareFieldSelection(sourceCount: 2 | 3): void {
  stubWorkbenchScenario(sourceCount === 2 ? 'saved-join' : 'partial-join');
  cy.viewport(1440, 1000);
  visitCanvas();
  if (sourceCount === 3) {
    const opener = '.react-flow__node[data-id="join-transform"]';
    const assertOpenerFocused = ($opener: JQuery<HTMLElement>): void => {
      const expected = $opener[0];
      const active = expected.ownerDocument.activeElement;
      const diagnostic = JSON.stringify({
        expectedIsConnected: expected.isConnected,
        actualMatchesExpected: active === expected,
        activeTag: active?.tagName,
        activeSlot: active?.getAttribute('data-slot'),
        activeMarkup: active?.outerHTML.slice(0, 700),
      });
      expect(expected.isConnected, diagnostic).to.equal(true);
      expect(active === expected, diagnostic).to.equal(true);
    };
    cy.get(opener)
      .should('have.attr', 'tabindex', '0')
      .focus()
      .should(assertOpenerFocused)
      .and('be.focused')
      .type('{enter}');
    cy.get('[data-slot="canvas-model-editor"]').should('be.visible');
    cy.get('[data-slot="canvas-relational-tree-node"][data-operator="join"]').click();
    cy.get('[data-slot="canvas-relational-edit"]').click();
    cy.get('[data-slot="canvas-relational-tree-node"][data-operator="join"]')
      .closest('li')
      .as('existingJoin', { type: 'static' });
    cy.get('[data-slot="canvas-relational-output-input-port"]').focus().type('{del}');
    dragWorkbenchSource('shipments');
    cy.contains('[data-slot="canvas-relational-tree-node"][data-operator="read"]', 'shipments')
      .closest('li')
      .as('shipments', { type: 'static' });
    joinWorkbenchProducers('@existingJoin', '@shipments', 'appendedJoin');
    connectWorkbenchProducer(
      '@appendedJoin',
      '[data-slot="canvas-relational-output-input-port"]',
      null
    );
    cy.get('[data-operator="read"]').should('have.length', 3);
    cy.get('[data-slot="canvas-relational-tree-apply"]').should('be.enabled').click();
    cy.wrap(null, { timeout: 20_000 }).should(() =>
      expect(semanticWrites('join-transform')).to.have.length(1)
    );
    cy.get('[data-slot="canvas-model-save-status"]').should('have.text', 'Synced');
    cy.get('[data-slot="canvas-model-tab-close"]').click();
    cy.get(opener).should(assertOpenerFocused).and('be.focused');
  }
}
export function reloadFieldSelection(): void {
  cy.on('window:before:load', installE2eApiFetchStub);
  cy.reload();
  openModelOutputs();
}
