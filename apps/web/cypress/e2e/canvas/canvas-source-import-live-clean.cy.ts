/** Proves the active DVT Canvas imports a real PostgreSQL source into its governed draft. */
import type { WorkspaceGraphAuthoringNode } from '@dvt/contracts';

import {
  clickCanvasAddCatalogAction,
  clickCanvasContextMenuAction,
  openCanvasContextMenuAt,
} from '../../support/canvasExecutionSelection';
import { skipWhenFirstAuthoringLiveEnvIsMissing } from '../../support/canvasFirstAuthoring';
import { readLiveGraphDraft, readLiveWorkspaceFile } from '../../support/liveProtectedRuntime';
import {
  expectedLivePostgresSourceName,
  importLivePostgresSource,
  livePostgresDatabaseName,
} from '../../support/liveWarehouseSourceImport';
import { seedE2eWorkspaceSession } from '../../support/workspaceSession';

describe('Canvas Source Import live', () => {
  beforeEach(function () {
    skipWhenFirstAuthoringLiveEnvIsMissing(this);
  });

  it('imports catalog metadata into a fresh, scoped DVT Canvas and generates source YAML', () => {
    const session = {
      tenantId: String(Cypress.env('secondaryWorkspaceTenantId')),
      projectId: String(Cypress.env('secondaryWorkspaceProjectId')),
      environmentId: String(Cypress.env('secondaryWorkspaceEnvironmentId')),
    };
    for (const [key, value] of Object.entries(session)) {
      expect(value, `secondary workspace ${key}`).not.to.be.oneOf(['', 'undefined']);
    }

    readLiveGraphDraft(session, { failOnStatusCode: false }).its('status').should('eq', 404);
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
    cy.get('[data-slot="canvas-playground-template-choice"]', { timeout: 20_000 })
      .should('have.length', 1)
      .should('be.enabled')
      .click();
    cy.get('[data-testid="canvas-viewport"]', { timeout: 20_000 }).should('be.visible');

    openCanvasContextMenuAt(420, 280);
    clickCanvasContextMenuAction('open-add-node-catalog');
    clickCanvasAddCatalogAction('open-source-import', 'dvt:source');
    importLivePostgresSource();

    readLiveGraphDraft(session).then((response) => {
      expect(response.status).to.equal(200);
      const nodes = (
        response.body as { record: { draft: { nodes: WorkspaceGraphAuthoringNode[] } } }
      ).record.draft.nodes;
      const sources = nodes.filter((node) => node.kind === 'dvt:source');
      expect(sources).to.have.length(1);
      expect(sources[0]?.metadata).to.have.nested.property(
        'connectedSourceRef.sourceObjectId',
        `relation/${livePostgresDatabaseName()}/public/source_1`
      );
      cy.get(`.react-flow__node[data-id="${sources[0]!.id}"]`).should('be.visible');
    });

    readLiveWorkspaceFile('models/sources/src_public.yml', session).then((response) => {
      expect(response.status).to.equal(200);
      const content = (response.body as { content: string }).content;
      expect(content).to.contain(`name: ${expectedLivePostgresSourceName()}`);
      expect(content).to.contain('schema: public');
      expect(content).to.contain('name: source_1');
      expect(content).to.contain('order_id');
      expect(content).to.contain('customer');
      expect(content).to.contain('amount');
    });
    cy.contains('Stale version').should('not.exist');
  });
});
