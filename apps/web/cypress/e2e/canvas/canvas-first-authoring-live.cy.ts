/**
 * Owned concern: prove first canvas and first node authoring against the live
 * protected runtime without draft endpoint intercepts or seeded success.
 */
import {
  assertLiveFirstAuthoringDraftScopeIsClean,
  resolveLiveFirstAuthoringWorkspaceSession,
} from '../../support/canvasFirstAuthoring';
import { hasLiveProtectedRuntimeEnv } from '../../support/liveProtectedRuntime';
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

  function visitFirstAuthoringCanvas(variant: (typeof variants)[number]['id']): void {
    const session = resolveLiveFirstAuthoringWorkspaceSession(variant);

    cy.visit('/canvas', {
      onBeforeLoad(window) {
        window.localStorage.clear();
        seedE2eWorkspaceSession(window, session);
      },
    });
  }

  function captureSourceNodeRect(alias: string): void {
    cy.contains('.react-flow__node', 'Source 1')
      .should('be.visible')
      .then(($node) => {
        const rect = $node[0].getBoundingClientRect();

        cy.wrap({ left: rect.left, top: rect.top }).as(alias);
      });
  }

  function dragSourceNodeFromSemanticHandle(): void {
    cy.contains('.react-flow__node', 'Source 1')
      .should('be.visible')
      .then(($node) => {
        const rect = $node[0].getBoundingClientRect();
        const startX = rect.left + rect.width / 2;
        const startY = rect.top + 10;

        cy.wrap($node)
          .find('.canvas-node-drag-handle')
          .should('be.visible')
          .trigger('pointerdown', {
            pointerId: 1,
            pointerType: 'mouse',
            isPrimary: true,
            button: 0,
            buttons: 1,
            clientX: startX,
            clientY: startY,
            force: true,
          });

        cy.get('body')
          .trigger('pointermove', {
            pointerId: 1,
            pointerType: 'mouse',
            isPrimary: true,
            button: 0,
            buttons: 1,
            clientX: startX + 96,
            clientY: startY + 72,
            force: true,
          })
          .trigger('pointerup', {
            pointerId: 1,
            pointerType: 'mouse',
            isPrimary: true,
            button: 0,
            buttons: 0,
            clientX: startX + 96,
            clientY: startY + 72,
            force: true,
          });
      });
  }

  function assertSourceNodeMovedFrom(alias: string): void {
    cy.get<{ left: number; top: number }>(`@${alias}`).then((before) => {
      cy.contains('.react-flow__node', 'Source 1').should(($node) => {
        const rect = $node[0].getBoundingClientRect();
        const distance = Math.abs(rect.left - before.left) + Math.abs(rect.top - before.top);

        expect(distance).to.be.greaterThan(20);
      });
    });
  }

  function assertSourceNodeRestoredNear(alias: string): void {
    cy.get<{ left: number; top: number }>(`@${alias}`).then((expected) => {
      cy.contains('.react-flow__node', 'Source 1', { timeout: 20_000 }).should(($node) => {
        const rect = $node[0].getBoundingClientRect();

        expect(Math.abs(rect.left - expected.left)).to.be.lessThan(16);
        expect(Math.abs(rect.top - expected.top)).to.be.lessThan(16);
      });
    });
  }

  beforeEach(function () {
    if (!hasLiveProtectedRuntimeEnv()) {
      this.skip();
      return;
    }
  });

  for (const variant of variants) {
    it(`creates, drags, saves, and restores the first ${variant.id} canvas node`, () => {
      assertLiveFirstAuthoringDraftScopeIsClean(variant.id);
      visitFirstAuthoringCanvas(variant.id);

      cy.contains('Create canvas', { timeout: 20_000 }).should('be.visible');
      cy.contains('button', variant.createButton).should('be.enabled').click();

      cy.contains(variant.emptyTitle, { timeout: 20_000 }).should('be.visible');
      cy.get('[data-slot="canvas-empty-state"]').within(() => {
        cy.contains(variant.firstNodeLabel).should('be.visible');
        cy.contains('button', 'Source').should('be.enabled').click();
      });

      cy.contains('.react-flow__node', 'Source 1', { timeout: 20_000 }).should('be.visible');
      captureSourceNodeRect('beforeDragRect');
      dragSourceNodeFromSemanticHandle();
      assertSourceNodeMovedFrom('beforeDragRect');
      captureSourceNodeRect('afterDragRect');

      cy.reload();

      cy.contains('.react-flow__node', 'Source 1', { timeout: 20_000 }).should('be.visible');
      assertSourceNodeRestoredNear('afterDragRect');
    });
  }
});
