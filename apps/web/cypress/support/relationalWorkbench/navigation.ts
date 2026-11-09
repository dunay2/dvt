/**
 * Owned concern: navigate Canvas Properties and connect the semantic editor through user gestures.
 * @baseline GH-2524-LIVE-V1-CONSUMERS: prove current authoring before protected execution.
 * @decision Share gestures and public Fit; callers own section, semantic and provider assertions.
 * @consequence No alternate editor, persistence or drag semantics live in a proof.
 * @version 1.0.1
 */
import { resolveCanvasViewCopy } from '../../../src/app/views/canvas/copy';
import { getE2eApiCalls, waitForE2eApiCall } from '../e2eApiStub';
import { visitWithE2eWorkspaceSession } from '../workspaceSession';

import { workbenchOperation } from './operationMenu';
import { hoverWorkbenchCard, panWorkbenchViewport } from './pointer';

/** Reveal through keyboard focus and native background pan, preserving pending inspectors. */
export function revealWorkbenchCard(selector: string): void {
  cy.get(selector)
    .first()
    .then(($card) => {
      const focusable = 'button, input, select, textarea, [tabindex="0"], a[href]';
      const target = $card.is(focusable) ? $card : $card.find(focusable).first();
      expect(target.length, 'existing keyboard target on the card').to.equal(1);
      cy.wrap(target).focus();
      cy.press(Cypress.Keyboard.Keys.TAB);
      cy.wrap(target).focus().should('be.visible');
    });
  cy.get(selector)
    .first()
    .then(($target) => {
      const target = $target[0]!;
      const bounds = target.getBoundingClientRect();
      const x = bounds.left + bounds.width / 2;
      const y = bounds.top + bounds.height / 2;
      const hit = target.ownerDocument.elementFromPoint(x, y);
      if (hit != null && target.contains(hit)) return;
      const viewport =
        '[data-slot="canvas-relational-tree-draft-viewport"], [data-slot="canvas-relational-tree-viewport"]';
      cy.get(viewport).then(($viewport) => {
        const frame = $viewport[0]!.getBoundingClientRect();
        panWorkbenchViewport(
          viewport,
          frame.left + frame.width / 2 - x,
          frame.top + frame.height / 2 - y
        );
      });
    });
}

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
  // A recorded GET is not a completed bootstrap; never send gestures through its covering screen.
  cy.get('#app-loading-screen').should('not.exist');
}

/** Reveal a clipped Main Canvas target through public Fit before the existing native gesture. */
export function openWorkbenchModel(nodeId = 'join-transform'): void {
  const title = `.react-flow__node[data-id="${nodeId}"] [data-slot="graph-node-card-title"]`;
  cy.get(title).then(($title) => {
    const element = $title[0]!;
    const viewport = element.closest('[data-testid="canvas-viewport"]');
    if (viewport == null) throw new Error('Expected the Main Canvas Model viewport.');
    const bounds = element.getBoundingClientRect();
    const frame = viewport.getBoundingClientRect();
    if (
      bounds.left < frame.left ||
      bounds.right > frame.right ||
      bounds.top < frame.top ||
      bounds.bottom > frame.bottom
    ) {
      cy.get('[data-testid="canvas-viewport"] .react-flow__controls-fitview')
        .filter(':visible')
        .click();
    }
  });
  cy.get(title).should('be.visible').dblclick();
  cy.get('[data-slot="canvas-model-editor"]').should('be.visible');
}

/** Enter the visible owning inspector's Edit mode without toggling an active edit. */
export function editWorkbenchInspector(inspectorSelector: string): void {
  const control = '[data-slot="canvas-relational-edit"]';
  cy.get(inspectorSelector)
    .filter(':visible')
    .should('have.length', 1)
    .find(control)
    .should('have.length', 1)
    .and('be.visible')
    .and('be.enabled')
    .and('have.text', 'Edit')
    .should(($edit) => {
      expect($edit.attr('aria-pressed'), 'explicit inspector Edit mode').to.be.oneOf([
        'true',
        'false',
      ]);
    })
    .then(($edit) => {
      if ($edit.attr('aria-pressed') === 'false') {
        cy.get(inspectorSelector)
          .filter(':visible')
          .should('have.length', 1)
          .find(control)
          .should('have.attr', 'aria-pressed', 'false')
          .click();
      }
    });
  cy.get(inspectorSelector)
    .filter(':visible')
    .should('have.length', 1)
    .find(control)
    .should('have.attr', 'aria-pressed', 'true');
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

/** Reopen durable state through the public Model close, then require this navigation's fresh GET. */
export function revisitWorkbenchCanvas(navigate: () => void = visitWorkbenchCanvas): void {
  cy.get('body').then(($body) => {
    if ($body.find('[data-slot="canvas-model-editor"]').length === 0) return;
    // A request record precedes its response and the React owner's persistence acknowledgement.
    cy.get('[data-slot="canvas-model-save-status"]').should(($status) => {
      const copy = resolveCanvasViewCopy($status[0]!.ownerDocument.documentElement.lang);
      expect($status.text(), 'the Model has acknowledged durable persistence').to.be.oneOf([
        copy.draftSavedLabel,
        copy.draftSyncedLabel,
      ]);
    });
    cy.get('[data-slot="canvas-model-tab-close"]').click();
    // A genuine unsaved transaction must fail here, never be discarded by the proof adapter.
    cy.get('[data-slot="canvas-model-editor"]').should('not.exist');
  });
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
  cy.get('.react-flow__controls-fitview').click();
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

export function dragWorkbenchSource(
  sourceLabel: string,
  dropOffset?: Readonly<{ x: number; y: number }>
): void {
  cy.window().then((window) => {
    const dataTransfer = new window.DataTransfer();
    cy.contains('[data-slot="canvas-relational-tree-source"]', sourceLabel).trigger('dragstart', {
      dataTransfer,
    });
    cy.get(
      '[data-slot="canvas-relational-tree-draft-viewport"], [data-slot="canvas-relational-tree-viewport"]'
    )
      .should('be.visible')
      .then(($viewport) => {
        const bounds = $viewport[0]!.getBoundingClientRect();
        const position =
          dropOffset == null
            ? {}
            : { clientX: bounds.left + dropOffset.x, clientY: bounds.top + dropOffset.y };
        cy.wrap($viewport)
          .trigger('dragover', { dataTransfer, ...position })
          .trigger('drop', { dataTransfer, ...position });
      });
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
      .as('workbenchProducerPort');
    revealWorkbenchCard('@workbenchProducerPort');
    cy.get('@workbenchProducerPort').trigger('dragstart', { dataTransfer });
    const target =
      port == null
        ? cy.get(consumer)
        : cy.get(consumer).find('[data-slot="canvas-relational-input-port"]').eq(port);
    target.as('workbenchConsumerPort');
    revealWorkbenchCard('@workbenchConsumerPort');
    cy.get('@workbenchConsumerPort')
      .trigger('dragover', { dataTransfer })
      .trigger('drop', { dataTransfer });
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
