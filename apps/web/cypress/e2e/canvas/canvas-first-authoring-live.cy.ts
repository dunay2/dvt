/**
 * Owned concern: prove first canvas and first node authoring against the live
 * protected runtime without draft endpoint intercepts or seeded success.
 * @baseline GH-3021 retains clean authoring, durable creation and route-local layout.
 * @decision Obtain a granted scope through CreateProject and read its real draft.
 * @consequence The AVAILABLE proof needs no invented project or separate bootstrap.
 * @version 1.0.0
 */
import {
  WorkspaceGraphDraftReadResponseSchema,
  type WorkspaceGraphDraftRecord,
  type WorkspaceGraphDraftScope,
} from '@dvt/contracts';

import { APPLICATION_LANGUAGE_STORAGE_KEY } from '../../../src/app/stores/applicationLanguageStore';
import type {
  CanvasPosition,
  WorkspaceCanvasLayout,
} from '../../../src/app/stores/canvasInteractionStore';
import {
  clickCanvasAddCatalogAction,
  clickCanvasContextMenuAction,
  openCanvasContextMenuAt,
} from '../../support/canvasExecutionSelection';
import { dragCanvasNodeByViewportDelta } from '../../support/canvasGraphAuthoring';
import { createLiveProjectThroughUi } from '../../support/liveProjectAuthoring';
import {
  hasLiveProtectedRuntimeEnv,
  readLiveGraphDraft,
  visitWithLiveWorkspaceSession,
} from '../../support/liveProtectedRuntime';

function waitForFirstAuthoringDraft(
  scope: WorkspaceGraphDraftScope,
  nodeId?: string,
  attempt = 0
): Cypress.Chainable<WorkspaceGraphDraftRecord> {
  return readLiveGraphDraft(scope, { failOnStatusCode: false }).then((response) => {
    expect(response.status).to.be.oneOf([200, 404]);
    const body = WorkspaceGraphDraftReadResponseSchema.parse(response.body);
    expect(body.kind).to.equal(response.status === 200 ? 'ok' : 'not_found');
    if (body.kind === 'ok') {
      const record: WorkspaceGraphDraftRecord = body.record;
      expect(record.scope).to.deep.equal(scope);
      const { nodeIds, nodePositions } = record.draft;
      if (
        nodeId === undefined ||
        (nodeIds.includes(nodeId) && nodePositions[nodeId] !== undefined)
      ) {
        return cy.wrap(record, { log: false });
      }
    }
    if (attempt >= 80) throw new Error('First-authoring draft did not persist the expected node.');
    return cy.wait(250).then(() => waitForFirstAuthoringDraft(scope, nodeId, attempt + 1));
  });
}

describe('Canvas first-authoring live protected runtime', () => {
  const canvas = {
    firstNodeName: /model 1/i,
  } as const;

  type FirstAuthoringNodeState = Readonly<{ nodeId: string; left: number; top: number }>;

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
      const rect = $node[0]!.getBoundingClientRect();
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
        const rect = $node[0]!.getBoundingClientRect();
        const distance = Math.abs(rect.left - before.left) + Math.abs(rect.top - before.top);

        expect(distance).to.be.greaterThan(20);
      });
    });
  }

  beforeEach(() => {
    if (!hasLiveProtectedRuntimeEnv())
      throw new Error('First-authoring proof requires the LIVE protected runtime.');
  });

  it('creates, drags, saves, and restores the first shared Canvas node', () => {
    let scope: WorkspaceGraphDraftScope;
    visitWithLiveWorkspaceSession('/canvas', {
      onBeforeLoad(window) {
        window.localStorage.setItem(
          APPLICATION_LANGUAGE_STORAGE_KEY,
          JSON.stringify({ state: { language: 'en' }, version: 0 })
        );
      },
    });
    cy.get('#app-loading-screen', { timeout: 30_000 }).should('not.exist');
    cy.get('html').should('have.attr', 'lang', 'en');
    createLiveProjectThroughUi(`First authoring ${Date.now()}`).then((createdScope) => {
      scope = createdScope;
      return readLiveGraphDraft(scope, { failOnStatusCode: false }).then((response) => {
        expect(response.status).to.equal(404);
        expect(WorkspaceGraphDraftReadResponseSchema.parse(response.body).kind).to.equal(
          'not_found'
        );
      });
    });

    cy.get('[data-slot="canvas-playground-template-choice"]', { timeout: 20_000 })
      .should('have.length', 1)
      .should('be.enabled')
      .click();
    cy.then(() => waitForFirstAuthoringDraft(scope));

    cy.get('[data-testid="canvas-viewport"]', { timeout: 20_000 }).should('be.visible');
    cy.get('[data-slot="canvas-empty-state"]').should('not.exist');
    cy.contains('button', /^Add first /).should('not.exist');
    openCanvasContextMenuAt(360, 260);
    clickCanvasContextMenuAction('open-add-node-catalog');
    clickCanvasAddCatalogAction('create-node', 'dvt:transform');

    getFirstAuthoringNode(canvas.firstNodeName);
    captureFirstAuthoringNodeState(canvas.firstNodeName, 'beforeDragState');
    cy.get<FirstAuthoringNodeState>('@beforeDragState').then((before) =>
      waitForFirstAuthoringDraft(scope, before.nodeId)
        .then((record) => record.draft.nodePositions[before.nodeId])
        .as('beforeDragDraftPosition')
    );

    cy.get<FirstAuthoringNodeState>('@beforeDragState').then((before) => {
      dragCanvasNodeByViewportDelta('Model 1', { x: 96, y: 72 }, { nodeId: before.nodeId });
    });
    assertFirstAuthoringNodeMovedFrom(canvas.firstNodeName, 'beforeDragState');
    captureFirstAuthoringNodeState(canvas.firstNodeName, 'afterDragState');
    cy.get<FirstAuthoringNodeState>('@beforeDragState').then((before) => {
      cy.get<CanvasPosition>('@beforeDragDraftPosition').then((beforeDraftPosition) => {
        cy.window({ timeout: 20_000, log: false }).should((window) => {
          const stored = window.localStorage.getItem('dvt-web-canvas-interaction');
          expect(stored).not.to.equal(null);
          const layout = JSON.parse(stored!) as {
            state: { canvasLayouts: Record<string, WorkspaceCanvasLayout> };
          };
          const workspaceKey = `${scope.tenantId}::${scope.projectId}::${scope.environmentId}`;
          const position = layout.state.canvasLayouts[workspaceKey]?.nodePositions[before.nodeId];
          expect(position?.x).to.be.a('number');
          expect(position?.y).to.be.a('number');
          expect(
            Math.abs(position!.x - beforeDraftPosition.x) +
              Math.abs(position!.y - beforeDraftPosition.y)
          ).to.be.greaterThan(1);
        });
      });
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
