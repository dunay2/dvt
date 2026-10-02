/**
 * Owned concern: prove first canvas and first node authoring against the live
 * protected runtime without draft endpoint intercepts or seeded success.
 */
import {
  clickCanvasAddCatalogAction,
  clickCanvasContextMenuAction,
  openCanvasContextMenuAt,
} from '../../support/canvasExecutionSelection';
import {
  assertLiveFirstAuthoringDraftScopeIsClean,
  resolveLiveFirstAuthoringWorkspaceSession,
  skipWhenFirstAuthoringLiveEnvIsMissing,
  waitForLiveFirstAuthoringDraftRecord,
  waitForLiveFirstAuthoringDraftNode,
  waitForLiveFirstAuthoringLayoutPositionChange,
} from '../../support/canvasFirstAuthoring';
import { dragCanvasNodeByViewportDelta } from '../../support/canvasGraphAuthoring';
import { seedE2eWorkspaceSession } from '../../support/workspaceSession';

describe('Canvas first-authoring live protected runtime', () => {
  const canvas = {
    id: 'transformation',
    firstNodeName: /model 1/i,
  } as const;

  type FirstAuthoringNodeState = Readonly<{ nodeId: string; left: number; top: number }>;

  function visitFirstAuthoringCanvas(): void {
    const session = resolveLiveFirstAuthoringWorkspaceSession(canvas.id);

    cy.visit('/canvas', {
      onBeforeLoad(window) {
        window.localStorage.clear();
        seedE2eWorkspaceSession(window, session);
      },
    });
  }

  type FirstAuthoringNodeLabel = string | RegExp;

  function getFirstAuthoringNode(
    nodeName: FirstAuthoringNodeLabel
  ): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy
      .get('.react-flow__node', { timeout: 20_000 })
      .filter((_, element) => {
        const text = element.textContent ?? '';
        return typeof nodeName === 'string' ? text.includes(nodeName) : nodeName.test(text);
      })
      .should('have.length.greaterThan', 0)
      .first()
      .should('be.visible');
  }

  function captureFirstAuthoringNodeState(nodeName: FirstAuthoringNodeLabel, alias: string): void {
    getFirstAuthoringNode(nodeName).then(($node) => {
      const rect = $node[0].getBoundingClientRect();
      const nodeId = $node.attr('data-id');

      expect(nodeId, 'React Flow node id').to.be.a('string').and.not.be.empty;

      cy.wrap({ nodeId: nodeId as string, left: rect.left, top: rect.top }).as(alias);
    });
  }

  function assertFirstAuthoringNodeMovedFrom(
    nodeName: FirstAuthoringNodeLabel,
    alias: string
  ): void {
    cy.get<FirstAuthoringNodeState>(`@${alias}`).then((before) => {
      getFirstAuthoringNode(nodeName).should(($node) => {
        const rect = $node[0].getBoundingClientRect();
        const distance = Math.abs(rect.left - before.left) + Math.abs(rect.top - before.top);

        expect(distance).to.be.greaterThan(20);
      });
    });
  }

  beforeEach(function () {
    if (skipWhenFirstAuthoringLiveEnvIsMissing(this)) {
      return;
    }
  });

  it('creates, drags, saves, and restores the first shared Canvas node', () => {
    assertLiveFirstAuthoringDraftScopeIsClean(canvas.id);
    visitFirstAuthoringCanvas();

    cy.get('[data-slot="canvas-playground-template-choice"]', { timeout: 20_000 })
      .should('have.length', 1)
      .should('be.enabled')
      .click();
    waitForLiveFirstAuthoringDraftRecord(canvas.id);

    cy.get('[data-testid="canvas-viewport"]', { timeout: 20_000 }).should('be.visible');
    cy.get('[data-slot="canvas-empty-state"]').should('not.exist');
    cy.contains('button', /^Add first /).should('not.exist');
    openCanvasContextMenuAt(360, 260);
    clickCanvasContextMenuAction('open-add-node-catalog');
    clickCanvasAddCatalogAction('create-node', 'dvt:transform');

    getFirstAuthoringNode(canvas.firstNodeName);
    captureFirstAuthoringNodeState(canvas.firstNodeName, 'beforeDragState');
    cy.get<FirstAuthoringNodeState>('@beforeDragState').then((before) =>
      waitForLiveFirstAuthoringDraftNode(canvas.id, before.nodeId).as('beforeDragDraftPosition')
    );

    cy.get<FirstAuthoringNodeState>('@beforeDragState').then((before) => {
      dragCanvasNodeByViewportDelta('Model 1', { x: 96, y: 72 }, { nodeId: before.nodeId });
    });
    assertFirstAuthoringNodeMovedFrom(canvas.firstNodeName, 'beforeDragState');
    captureFirstAuthoringNodeState(canvas.firstNodeName, 'afterDragState');
    cy.get<FirstAuthoringNodeState>('@beforeDragState').then((before) => {
      cy.get<{ x: number; y: number }>('@beforeDragDraftPosition').then((beforeDraftPosition) =>
        waitForLiveFirstAuthoringLayoutPositionChange(canvas.id, before.nodeId, beforeDraftPosition)
      );
    });
    getFirstAuthoringNode(canvas.firstNodeName)
      .then(($node) => $node[0]!.style.transform)
      .as('savedGraphPosition');

    cy.reload();

    cy.get<string>('@savedGraphPosition').then((savedPosition) => {
      getFirstAuthoringNode(canvas.firstNodeName).should(($node) => {
        expect($node[0]!.style.transform).to.equal(savedPosition);
      });
    });
  });
});
