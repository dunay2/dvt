/**
 * Owned concern: prove first canvas and first node authoring against the live
 * protected runtime without draft endpoint intercepts or seeded success.
 */
import {
  clickCanvasContextMenuItem,
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
import { seedE2eWorkspaceSession } from '../../support/workspaceSession';

describe('Canvas first-authoring live protected runtime', () => {
  const variants = [
    {
      id: 'transformation',
      createButton: 'Transformation',
      emptyTitle: 'Start transformation canvas',
      addCatalogItem: 'Add transformation',
      firstNodeName: /transform 1/i,
    },
    {
      id: 'dbt',
      createButton: 'dbt',
      emptyTitle: 'Start dbt canvas',
      addCatalogItem: 'Add model',
      firstNodeName: 'Model 1',
    },
  ] as const;

  type FirstAuthoringNodeState = Readonly<{ nodeId: string; left: number; top: number }>;
  type DragPoint = Readonly<{ x: number; y: number }>;

  function visitFirstAuthoringCanvas(variant: (typeof variants)[number]['id']): void {
    const session = resolveLiveFirstAuthoringWorkspaceSession(variant);

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
      screenX: point.x,
      screenY: point.y,
      view,
      clientY: point.y,
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

  function dragFirstAuthoringNodeFromCardBody(nodeName: FirstAuthoringNodeLabel): void {
    getFirstAuthoringNode(nodeName).then(($node) => {
      const rect = $node[0].getBoundingClientRect();
      const start = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
      const middle = { x: start.x + 24, y: start.y + 18 };
      const end = { x: start.x + 96, y: start.y + 72 };

      cy.window().then((window) => {
        dispatchMouseDragEvent($node[0], window, 'mousedown', start, 1);
        dispatchMouseDragEvent(window, window, 'mousemove', middle, 1);
      });
      getFirstAuthoringNode(nodeName).should('have.class', 'dragging');
      cy.window().then((window) => {
        dispatchMouseDragEvent(window, window, 'mousemove', end, 1);
        dispatchMouseDragEvent(window, window, 'mouseup', end, 0);
      });
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

  function assertFirstAuthoringNodeRestoredAwayFromOriginal(
    nodeName: FirstAuthoringNodeLabel,
    alias: string
  ): void {
    cy.get<FirstAuthoringNodeState>(`@${alias}`).then((original) => {
      getFirstAuthoringNode(nodeName).should(($node) => {
        const rect = $node[0].getBoundingClientRect();
        const distance = Math.abs(rect.left - original.left) + Math.abs(rect.top - original.top);

        expect(distance).to.be.greaterThan(20);
      });
    });
  }

  beforeEach(function () {
    if (skipWhenFirstAuthoringLiveEnvIsMissing(this)) {
      return;
    }
  });

  for (const variant of variants) {
    it(`creates, drags, saves, and restores the first ${variant.id} canvas node`, () => {
      assertLiveFirstAuthoringDraftScopeIsClean(variant.id);
      visitFirstAuthoringCanvas(variant.id);

      cy.contains('Create canvas', { timeout: 20_000 }).should('be.visible');
      cy.get('[data-slot="canvas-playground-empty-state"]').within(() => {
        cy.contains('button', variant.createButton).should('be.enabled').click();
      });
      waitForLiveFirstAuthoringDraftRecord(variant.id);

      cy.contains(variant.emptyTitle, { timeout: 20_000 }).should('be.visible');
      cy.get('[data-slot="canvas-empty-state"]').should('be.visible');
      cy.contains('button', /^Add first /).should('not.exist');
      openCanvasContextMenuAt(360, 260);
      clickCanvasContextMenuItem('Add...');
      clickCanvasContextMenuItem(variant.addCatalogItem);

      getFirstAuthoringNode(variant.firstNodeName);
      captureFirstAuthoringNodeState(variant.firstNodeName, 'beforeDragState');
      cy.get<FirstAuthoringNodeState>('@beforeDragState').then((before) =>
        waitForLiveFirstAuthoringDraftNode(variant.id, before.nodeId).as('beforeDragDraftPosition')
      );

      dragFirstAuthoringNodeFromCardBody(variant.firstNodeName);
      assertFirstAuthoringNodeMovedFrom(variant.firstNodeName, 'beforeDragState');
      captureFirstAuthoringNodeState(variant.firstNodeName, 'afterDragState');
      cy.get<FirstAuthoringNodeState>('@beforeDragState').then((before) => {
        cy.get<{ x: number; y: number }>('@beforeDragDraftPosition').then((beforeDraftPosition) =>
          waitForLiveFirstAuthoringLayoutPositionChange(
            variant.id,
            before.nodeId,
            beforeDraftPosition
          )
        );
      });

      cy.reload();

      getFirstAuthoringNode(variant.firstNodeName);
      assertFirstAuthoringNodeRestoredAwayFromOriginal(variant.firstNodeName, 'beforeDragState');
    });
  }
});
