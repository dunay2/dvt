/** Owned concern: prove imported logical Source identity through the real shared Canvas and API. */
import type { WorkspaceGraphAuthoringNode } from '@dvt/contracts';

import {
  clickCanvasAddCatalogAction,
  clickCanvasContextMenuAction,
  openCanvasContextMenuAt,
} from '../../support/canvasExecutionSelection';
import { skipWhenFirstAuthoringLiveEnvIsMissing } from '../../support/canvasFirstAuthoring';
import { createLiveProjectThroughUi } from '../../support/liveProjectAuthoring';
import {
  readLiveGraphDraft,
  resolveLiveWorkspaceSession,
} from '../../support/liveProtectedRuntime';
import {
  importLivePostgresSource,
  livePostgresDatabaseName,
  placeRegisteredSource,
} from '../../support/liveWarehouseSourceImport';
import { seedE2eWorkspaceSession } from '../../support/workspaceSession';

describe('Shared Canvas imported Source identity', () => {
  beforeEach(function () {
    skipWhenFirstAuthoringLiveEnvIsMissing(this);
  });
  it('persists opaque IDs across reload and separates identical objects on two connections', () => {
    let session = resolveLiveWorkspaceSession();
    Cypress.env('firstAuthoringRunId', 'source-identity-' + Date.now());
    const identityPattern =
      /^dvt_src_[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
    let persistedIds: string[] = [];

    cy.visit('/canvas', {
      onBeforeLoad(window) {
        window.localStorage.clear();
        Object.defineProperty(window.navigator, 'language', {
          configurable: true,
          value: 'en-US',
        });
        seedE2eWorkspaceSession(window, session);
      },
    });
    cy.get('#app-loading-screen', { timeout: 30_000 }).should('not.exist');
    createLiveProjectThroughUi(`Source identities ${Date.now()}`).then((scope) => {
      session = scope;
      return readLiveGraphDraft(scope, { failOnStatusCode: false }).its('status').should('eq', 404);
    });
    cy.get('[data-slot="canvas-playground-template-choice"]', { timeout: 20_000 })
      .should('have.length', 1)
      .should('be.enabled')
      .click();
    cy.get('[data-testid="canvas-viewport"]', { timeout: 20_000 }).should('be.visible');

    for (const suffix of ['', 'Secondary']) {
      openCanvasContextMenuAt(suffix === '' ? 420 : 820, suffix === '' ? 280 : 500);
      clickCanvasContextMenuAction('open-add-node-catalog');
      clickCanvasAddCatalogAction('open-source-import', 'dvt:source');
      importLivePostgresSource({ kind: 'graph-draft' }, suffix);
    }

    cy.then(() => readLiveGraphDraft(session)).then((response) => {
      expect(response.status).to.equal(200);
      const nodes = (
        response.body as { record: { draft: { nodes: WorkspaceGraphAuthoringNode[] } } }
      ).record.draft.nodes;
      const sources = nodes.filter((node) => node.kind === 'dvt:source');
      expect(sources).to.have.length(2);
      persistedIds = sources.map((node) => node.id);
      expect(new Set(persistedIds).size).to.equal(2);
      for (const [index, node] of sources.entries()) {
        expect(node.id).to.match(identityPattern);
        expect(node.metadata).to.have.nested.property(
          'connectedSourceRef.sourceObjectId',
          `relation/${livePostgresDatabaseName()}/public/source_1`
        );
        cy.get('.react-flow__node[data-id="' + node.id + '"]').should('not.exist');
        placeRegisteredSource(node.id, session, { x: 220 + index * 370, y: 160 });
        cy.get('.react-flow__node[data-id="' + node.id + '"]')
          .should('be.visible')
          .and('contain.text', 'Rows')
          .and('contain.text', '3')
          .and('contain.text', 'Size')
          .and('contain.text', '32 KB');
      }
      const bindings = sources.map((node) => JSON.stringify(node.metadata?.connectedSourceRef));
      expect(new Set(bindings).size).to.equal(2);
    });

    cy.get('[data-slot="canvas-draft-save-status"]').should('not.exist');
    cy.reload();
    cy.get('[data-testid="canvas-viewport"]', { timeout: 20_000 }).should('be.visible');
    cy.then(() => readLiveGraphDraft(session)).then((response) => {
      expect(response.status).to.equal(200);
      const nodes = (
        response.body as { record: { draft: { nodes: WorkspaceGraphAuthoringNode[] } } }
      ).record.draft.nodes;
      expect(
        nodes.filter((node) => node.kind === 'dvt:source').map((node) => node.id)
      ).to.deep.equal(persistedIds);
      for (const id of persistedIds) {
        cy.get('.react-flow__node[data-id="' + id + '"]', { timeout: 20_000 }).should('be.visible');
      }
    });
  });
});
