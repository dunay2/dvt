/** Proves the active DVT Canvas imports a real PostgreSQL source into its governed draft. */
import type { WorkspaceGraphAuthoringDraft, WorkspaceGraphDraftScope } from '@dvt/contracts';

import {
  clickCanvasAddCatalogAction,
  clickCanvasContextMenuAction,
  openCanvasContextMenuAt,
} from '../../support/canvasExecutionSelection';
import { skipWhenFirstAuthoringLiveEnvIsMissing } from '../../support/canvasFirstAuthoring';
import { createLiveProjectThroughUi } from '../../support/liveProjectAuthoring';
import {
  readLiveGraphDraft,
  readLiveWorkspaceFile,
  resolveLiveWorkspaceSession,
} from '../../support/liveProtectedRuntime';
import {
  expectedLivePostgresSourceName,
  importLivePostgresSource,
  livePostgresDatabaseName,
  placeRegisteredSource,
} from '../../support/liveWarehouseSourceImport';
import { seedE2eWorkspaceSession } from '../../support/workspaceSession';

function panCanvasViewport(): void {
  cy.get('[data-testid="canvas-viewport"] .react-flow__pane').then(($pane) => {
    const bounds = $pane[0]!.getBoundingClientRect();
    const start = { x: bounds.right - 100, y: bounds.top + bounds.height / 2 };
    const end = { x: start.x - 120, y: start.y - 80 };
    cy.window().then((window) => {
      const event = (point: { x: number; y: number }, buttons: number): MouseEventInit => ({
        bubbles: true,
        cancelable: true,
        button: 0,
        buttons,
        clientX: point.x,
        clientY: point.y,
        view: window,
      });
      $pane[0]!.dispatchEvent(new window.MouseEvent('mousedown', event(start, 1)));
      window.dispatchEvent(new window.MouseEvent('mousemove', event(end, 1)));
      window.dispatchEvent(new window.MouseEvent('mouseup', event(end, 0)));
    });
  });
}

function assertSourceCoversDropPoint(instanceId: string, point: { x: number; y: number }): void {
  cy.get(`.react-flow__node[data-id="${instanceId}"]`)
    .should('be.visible')
    .should(($node) => {
      const bounds = $node[0]!.getBoundingClientRect();
      expect(bounds.left).to.be.at.most(point.x);
      expect(bounds.right).to.be.at.least(point.x);
      expect(bounds.top).to.be.at.most(point.y);
      expect(bounds.bottom).to.be.at.least(point.y);
    });
}

function zoomAndPanSourceViewport(instanceId: string): void {
  const node = `.react-flow__node[data-id="${instanceId}"]`;
  cy.get(node)
    .should('be.visible')
    .then(($node) => {
      const initialWidth = $node[0]!.getBoundingClientRect().width;
      cy.get('[data-testid="canvas-viewport"] .react-flow__controls-zoomout').click();
      cy.get(node).should(($zoomed) =>
        expect($zoomed[0]!.getBoundingClientRect().width).to.be.lessThan(initialWidth - 1)
      );
    });
  cy.get(node).then(($node) => {
    const beforePan = $node[0]!.getBoundingClientRect();
    panCanvasViewport();
    cy.get(node).should(($panned) => {
      const afterPan = $panned[0]!.getBoundingClientRect();
      expect(afterPan.left).to.be.lessThan(beforePan.left - 60);
      expect(afterPan.top).to.be.lessThan(beforePan.top - 40);
    });
  });
}

function placeSourceOnExistingChild(
  sourceId: string,
  scope: WorkspaceGraphDraftScope,
  instanceId: string
): Cypress.Chainable<string> {
  return cy
    .get(`.react-flow__node[data-id="${instanceId}"]`)
    .find('[data-slot="graph-node-source-identity-trigger"]')
    .should('be.visible')
    .then(($child) => {
      const target = $child[0]!;
      const bounds = target.getBoundingClientRect();
      const point = { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 };
      return cy.get('[data-testid="canvas-viewport"] .react-flow__pane').then(($pane) => {
        const viewport = $pane[0]!.getBoundingClientRect();
        expect(point.x).to.be.within(viewport.left, viewport.right);
        expect(point.y).to.be.within(viewport.top, viewport.bottom);
        return placeRegisteredSource(
          sourceId,
          scope,
          { x: point.x - viewport.left, y: point.y - viewport.top },
          target
        ).then((secondId) => {
          expect(secondId).not.to.equal(instanceId);
          assertSourceCoversDropPoint(secondId, point);
          return cy.wrap(secondId, { log: false });
        });
      });
    });
}

function assertSourcePlacementRoundTrip(
  scope: WorkspaceGraphDraftScope,
  firstId: string,
  secondId: string,
  firstSavedPosition: { x: number; y: number } | undefined
): void {
  cy.then(() => readLiveGraphDraft(scope)).then(({ body }) => {
    const saved = (body as { record: { draft: WorkspaceGraphAuthoringDraft } }).record.draft;
    expect(saved.nodeIds).to.have.length(2);
    expect(saved.nodePositions[firstId]).to.deep.equal(firstSavedPosition);
    const secondSavedPosition = saved.nodePositions[secondId];
    expect(secondSavedPosition).not.to.equal(undefined);
    cy.reload();
    cy.get(`.react-flow__node[data-id="${secondId}"]`, { timeout: 20_000 }).should('be.visible');
    cy.then(() => readLiveGraphDraft(scope)).then(({ body: reloadedBody }) => {
      const reloaded = (reloadedBody as { record: { draft: WorkspaceGraphAuthoringDraft } }).record
        .draft;
      expect(reloaded.nodePositions[firstId]).to.deep.equal(firstSavedPosition);
      expect(reloaded.nodePositions[secondId]).to.deep.equal(secondSavedPosition);
    });
  });
}

describe('Canvas Source Import live', () => {
  beforeEach(function () {
    skipWhenFirstAuthoringLiveEnvIsMissing(this);
  });

  it('imports catalog metadata into a fresh, scoped DVT Canvas and generates source YAML', () => {
    let session: WorkspaceGraphDraftScope;
    let placedDraft: WorkspaceGraphAuthoringDraft;
    cy.visit('/canvas', {
      onBeforeLoad(window) {
        window.localStorage.clear();
        window.localStorage.setItem(
          'dvt-web-application-language',
          JSON.stringify({ state: { language: 'en' }, version: 0 })
        );
        Object.defineProperty(window.navigator, 'language', {
          configurable: true,
          value: 'en-US',
        });
        seedE2eWorkspaceSession(window, resolveLiveWorkspaceSession());
      },
    });
    cy.get('#app-loading-screen', { timeout: 30_000 }).should('not.exist');
    createLiveProjectThroughUi(`Source registration ${Date.now()}`).then((scope) => {
      session = scope;
      return readLiveGraphDraft(scope, { failOnStatusCode: false }).its('status').should('eq', 404);
    });
    cy.get('[data-slot="canvas-playground-template-choice"]', { timeout: 20_000 })
      .should('have.length', 1)
      .should('be.enabled')
      .click();
    cy.get('[data-testid="canvas-viewport"]', { timeout: 20_000 }).should('be.visible');

    openCanvasContextMenuAt(420, 280);
    clickCanvasContextMenuAction('open-add-node-catalog');
    clickCanvasAddCatalogAction('open-source-import', 'dvt:source');
    importLivePostgresSource();

    cy.then(() => readLiveGraphDraft(session)).then((response) => {
      expect(response.status).to.equal(200);
      const draft = (response.body as { record: { draft: WorkspaceGraphAuthoringDraft } }).record
        .draft;
      expect(draft.nodeIds).to.deep.equal([]);
      expect(draft.nodePositions).to.deep.equal({});
      const sources = draft.nodes.filter((node) => node.kind === 'dvt:source');
      expect(sources).to.have.length(1);
      expect(sources[0]?.metadata).to.have.nested.property(
        'connectedSourceRef.sourceObjectId',
        `relation/${livePostgresDatabaseName()}/public/source_1`
      );
      const id = sources[0]!.id;
      cy.get('.react-flow__node').should('not.exist');
      cy.get(`[data-element-id="${id}"]:visible`).click();
      cy.get('[data-slot="canvas-node-workbench-panel"]').should('be.visible');
      cy.get('.react-flow__node').should('not.exist');
      cy.get('[data-slot="canvas-node-workbench-close"]').click();
      cy.reload();
      cy.get(`[data-element-id="${id}"]:visible`, { timeout: 20_000 }).should('be.visible');
      cy.get('.react-flow__node').should('not.exist');
      const canceledTransfer = new DataTransfer();
      cy.get(`[data-slot="canvas-explorer"] [data-element-id="${id}"]:visible`)
        .trigger('dragstart', { dataTransfer: canceledTransfer })
        .trigger('dragend', { dataTransfer: canceledTransfer });
      cy.get('.react-flow__node').should('not.exist');
      placeRegisteredSource(id, session).then((instanceId) => {
        let firstSavedPosition: { x: number; y: number } | undefined;
        cy.then(() => readLiveGraphDraft(session)).then(({ body }) => {
          const saved = (body as { record: { draft: WorkspaceGraphAuthoringDraft } }).record.draft;
          firstSavedPosition = saved.nodePositions[instanceId];
          expect(firstSavedPosition).not.to.equal(undefined);
        });
        zoomAndPanSourceViewport(instanceId);
        placeSourceOnExistingChild(id, session, instanceId).then((secondId) => {
          assertSourcePlacementRoundTrip(session, instanceId, secondId, firstSavedPosition);
        });
        cy.get(`.react-flow__node[data-id="${instanceId}"]`, { timeout: 20_000 }).should(
          'be.visible'
        );
        cy.get('.react-flow__node').should('have.length', 2);
        cy.get(`[data-slot="canvas-explorer"] [data-element-id="${id}"]:visible`).should(
          'have.length',
          1
        );
      });
    });

    cy.then(() => readLiveGraphDraft(session)).then(({ body }) => {
      placedDraft = (body as { record: { draft: WorkspaceGraphAuthoringDraft } }).record.draft;
      expect(placedDraft.nodes.filter((node) => node.sourceDefinitionId != null)).to.have.length(2);
    });
    cy.contains('button', 'Import sources').should('be.visible').click();
    importLivePostgresSource({ kind: 'graph-draft' }, 'after-placement');
    cy.then(() => readLiveGraphDraft(session)).then(({ body }) => {
      const saved = (body as { record: { draft: WorkspaceGraphAuthoringDraft } }).record.draft;
      expect(saved.nodeIds).to.deep.equal(placedDraft.nodeIds);
      expect(saved.nodePositions).to.deep.equal(placedDraft.nodePositions);
      expect(saved.edges).to.deep.equal(placedDraft.edges);
      expect(saved.nodes.slice(0, placedDraft.nodes.length)).to.deep.equal(placedDraft.nodes);
      const definitions = saved.nodes.filter(
        (node) => node.kind === 'dvt:source' && node.sourceDefinitionId == null
      );
      expect(definitions).to.have.length(2);
      expect(saved.nodes).to.have.length(placedDraft.nodes.length + 1);
      cy.get('.react-flow__node').should('have.length', 2);
    });

    cy.then(() => readLiveWorkspaceFile('models/sources/src_public.yml', session)).then(
      (response) => {
        expect(response.status).to.equal(200);
        const content = (response.body as { content: string }).content;
        expect(content).to.contain(`name: ${expectedLivePostgresSourceName()}`);
        expect(content).to.contain(`name: ${expectedLivePostgresSourceName('after-placement')}`);
        expect(content).to.contain('schema: public');
        expect(content).to.contain('name: source_1');
        expect(content).to.contain('order_id');
        expect(content).to.contain('customer');
        expect(content).to.contain('amount');
      }
    );
    cy.contains('Stale version').should('not.exist');
  });
});
