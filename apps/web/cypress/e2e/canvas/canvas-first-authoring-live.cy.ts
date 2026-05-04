/**
 * Owned concern: prove first canvas and first node authoring against the live
 * protected runtime without draft endpoint intercepts or seeded success.
 */
import {
  assertLiveFirstAuthoringDraftScopeIsClean,
  resolveLiveFirstAuthoringWorkspaceSession,
  skipWhenFirstAuthoringLiveEnvIsMissing,
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
      firstNodeLabel: 'Add first transformation node',
    },
    {
      id: 'dbt',
      createButton: 'dbt',
      emptyTitle: 'Start dbt canvas',
      firstNodeLabel: 'Add first dbt node',
    },
  ] as const;

  type SourceNodeState = Readonly<{ nodeId: string; left: number; top: number }>;
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

  function captureSourceNodeState(alias: string): void {
    cy.contains('.react-flow__node', 'Source 1')
      .should('be.visible')
      .then(($node) => {
        const rect = $node[0].getBoundingClientRect();
        const nodeId = $node.attr('data-id');

        expect(nodeId, 'React Flow node id').to.be.a('string').and.not.be.empty;

        cy.wrap({ nodeId: nodeId as string, left: rect.left, top: rect.top }).as(alias);
      });
  }

  function waitForSourceNodeGeometrySettled(): void {
    cy.contains('.react-flow__node', 'Source 1', { timeout: 20_000 })
      .should('be.visible')
      .then(($node) => {
        const firstRect = $node[0].getBoundingClientRect();

        cy.wait(200);
        cy.contains('.react-flow__node', 'Source 1').should(($stableNode) => {
          const stableRect = $stableNode[0].getBoundingClientRect();
          const distance =
            Math.abs(stableRect.left - firstRect.left) + Math.abs(stableRect.top - firstRect.top);

          expect(distance, 'source node geometry settled before drag').to.be.lessThan(2);
        });
      });
  }

  function waitForDraftSaveSettled(): void {
    cy.get('[data-slot="canvas-draft-save-status"]', { timeout: 20_000 }).should(($status) => {
      const text = $status.text();

      expect(text).not.to.contain('Saving draft');
      expect(text).to.match(/Draft saved|Draft synced/);
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

  function dragSourceNodeFromCardBody(): void {
    cy.contains('.react-flow__node', 'Source 1')
      .should('be.visible')
      .then(($node) => {
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
        cy.contains('.react-flow__node', 'Source 1').should('have.class', 'dragging');
        cy.window().then((window) => {
          dispatchMouseDragEvent(window, window, 'mousemove', end, 1);
          dispatchMouseDragEvent(window, window, 'mouseup', end, 0);
        });
      });
  }

  function assertSourceNodeMovedFrom(alias: string): void {
    cy.get<SourceNodeState>(`@${alias}`).then((before) => {
      cy.contains('.react-flow__node', 'Source 1').should(($node) => {
        const rect = $node[0].getBoundingClientRect();
        const distance = Math.abs(rect.left - before.left) + Math.abs(rect.top - before.top);

        expect(distance).to.be.greaterThan(20);
      });
    });
  }

  function assertSourceNodeRestoredNear(alias: string): void {
    cy.get<SourceNodeState>(`@${alias}`).then((expected) => {
      cy.contains('.react-flow__node', 'Source 1', { timeout: 20_000 }).should(($node) => {
        const rect = $node[0].getBoundingClientRect();

        expect(Math.abs(rect.left - expected.left)).to.be.lessThan(16);
        expect(Math.abs(rect.top - expected.top)).to.be.lessThan(16);
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
      waitForDraftSaveSettled();

      cy.contains(variant.emptyTitle, { timeout: 20_000 }).should('be.visible');
      cy.get('[data-slot="canvas-empty-state"]').within(() => {
        cy.contains(variant.firstNodeLabel).should('be.visible');
        cy.contains('button', 'Source').should('be.enabled').click();
      });
      waitForDraftSaveSettled();

      cy.contains('.react-flow__node', 'Source 1', { timeout: 20_000 }).should('be.visible');
      waitForSourceNodeGeometrySettled();
      captureSourceNodeState('beforeDragState');
      cy.get<SourceNodeState>('@beforeDragState').then((before) =>
        waitForLiveFirstAuthoringDraftNode(variant.id, before.nodeId).as('beforeDragDraftPosition')
      );

      dragSourceNodeFromCardBody();
      assertSourceNodeMovedFrom('beforeDragState');
      captureSourceNodeState('afterDragState');
      cy.get<SourceNodeState>('@beforeDragState').then((before) => {
        cy.get<{ x: number; y: number }>('@beforeDragDraftPosition').then((beforeDraftPosition) =>
          waitForLiveFirstAuthoringLayoutPositionChange(
            variant.id,
            before.nodeId,
            beforeDraftPosition
          )
        );
      });

      cy.reload();

      cy.contains('.react-flow__node', 'Source 1', { timeout: 20_000 }).should('be.visible');
      assertSourceNodeRestoredNear('afterDragState');
    });
  }
});
