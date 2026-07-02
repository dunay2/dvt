/**
 * Owned concern: prove contextual Add Source against a live protected runtime
 * without draft endpoint intercepts or seeded draft success.
 */
import {
  clickCanvasContextMenuItem,
  openCanvasContextMenuAt,
} from '../../support/canvasExecutionSelection';
import {
  assertLiveFirstAuthoringDraftScopeIsClean,
  resolveLiveFirstAuthoringWorkspaceSession,
  skipWhenFirstAuthoringLiveEnvIsMissing,
} from '../../support/canvasFirstAuthoring';
import { readLiveGraphDraft, readLiveWorkspaceFile } from '../../support/liveProtectedRuntime';
import { seedE2eWorkspaceSession } from '../../support/workspaceSession';

function visitCleanDbtCanvas(): void {
  const session = resolveLiveFirstAuthoringWorkspaceSession('dbt');

  cy.visit('/canvas', {
    onBeforeLoad(window) {
      window.localStorage.clear();
      seedE2eWorkspaceSession(window, session);
    },
  });
}

function waitForLiveDraftSaved(
  session: ReturnType<typeof resolveLiveFirstAuthoringWorkspaceSession>,
  remainingAttempts = 30
): Cypress.Chainable<void> {
  return readLiveGraphDraft(session, { failOnStatusCode: false }).then((draftResponse) => {
    if (draftResponse.status === 200) {
      expect(draftResponse.body).to.have.property('kind', 'ok');
      expect(draftResponse.body).to.have.nested.property('record.scope.tenantId', session.tenantId);
      expect(draftResponse.body).to.have.nested.property(
        'record.scope.projectId',
        session.projectId
      );
      expect(draftResponse.body).to.have.nested.property(
        'record.scope.environmentId',
        session.environmentId
      );

      return;
    }

    if (remainingAttempts <= 0) {
      throw new Error('Timed out waiting for the live graph draft save to be readable.');
    }

    expect(draftResponse.status).to.equal(404);
    return cy.wait(500).then(() => waitForLiveDraftSaved(session, remainingAttempts - 1));
  });
}

describe('Canvas source import live clean proof', () => {
  beforeEach(function () {
    if (skipWhenFirstAuthoringLiveEnvIsMissing(this)) {
      return;
    }
  });

  it('attaches a warehouse source from the canvas context menu and writes the source artifact', () => {
    const session = resolveLiveFirstAuthoringWorkspaceSession('dbt');

    assertLiveFirstAuthoringDraftScopeIsClean('dbt');
    visitCleanDbtCanvas();

    cy.contains('Create canvas', { timeout: 20_000 }).should('be.visible');
    cy.get('[data-slot="canvas-playground-empty-state"]').within(() => {
      cy.contains('button', 'dbt').should('be.enabled').click();
    });

    cy.contains('Start dbt canvas', { timeout: 20_000 }).should('be.visible');
    waitForLiveDraftSaved(session);
    openCanvasContextMenuAt(420, 280);
    clickCanvasContextMenuItem('Add...');
    clickCanvasContextMenuItem('Add source');

    cy.contains('[role="dialog"]', 'Add source', { timeout: 20_000 }).should('be.visible');
    cy.contains('[data-slot="source-import-connection-option"]', 'Local Postgres proof', {
      timeout: 20_000,
    }).click();
    cy.contains('[role="dialog"] button', 'Test connection').should('be.enabled').click();
    cy.contains('[role="dialog"]', 'Connection passed', { timeout: 20_000 }).should('be.visible');
    cy.contains('[role="dialog"]', 'tables reachable').should('be.visible');

    cy.contains('[role="tab"]', 'Browse').click();
    cy.get('[data-slot="source-import-table-search"]', { timeout: 20_000 })
      .should('be.visible')
      .clear()
      .type('order_id');
    cy.contains('[role="dialog"]', 'Source metadata').should('be.visible');
    cy.contains('[role="dialog"]', 'dvt', { timeout: 20_000 }).should('be.visible');
    cy.contains('[role="dialog"]', 'public').should('be.visible');
    cy.contains('[role="dialog"]', 'order_id', { timeout: 20_000 }).should('be.visible');
    cy.get('[data-source-import-table="dvt.public.source_1"]', { timeout: 20_000 }).click();
    cy.get('[data-source-import-table-select="dvt.public.source_1"]', { timeout: 20_000 }).click();
    cy.contains('[role="dialog"]', 'Selected: 1').should('be.visible');
    cy.contains('[role="dialog"]', 'Selected sources').should('be.visible');
    cy.contains('[role="dialog"]', 'dvt.public.source_1').should('be.visible');

    cy.contains('[role="tab"]', 'Metadata').click();
    cy.contains('[role="dialog"]', 'order_id', { timeout: 20_000 }).should('be.visible');
    cy.contains('[role="dialog"]', 'customer').should('be.visible');
    cy.contains('[role="dialog"]', 'amount').should('be.visible');

    cy.contains('[role="tab"]', 'Selected').click();
    cy.contains('[role="dialog"]', 'Selected sources').should('be.visible');
    cy.contains('button', 'Attach sources to canvas').should('be.enabled').click();

    cy.contains('[role="dialog"]', 'Sources attached', { timeout: 30_000 }).should('be.visible');
    cy.contains('[role="dialog"]', '[file] models/sources/src_public.yml').should('be.visible');
    cy.contains('[role="dialog"] button', 'Done').click();

    cy.contains('.react-flow__node', 'Postgres', { timeout: 20_000 })
      .should('be.visible')
      .and('contain.text', 'public')
      .and('contain.text', 'Columns')
      .and('contain.text', 'models/sources/src_public.yml');
    cy.contains('Stale version').should('not.exist');

    readLiveWorkspaceFile('models/sources/src_public.yml', session).then((sourceYamlResponse) => {
      expect(sourceYamlResponse.status).to.equal(200);
      const content = (sourceYamlResponse.body as { content: string }).content;

      expect(content).to.contain('schema: public');
      expect(content).to.contain('name: source_1');
      expect(content).to.contain('order_id');
      expect(content).to.contain('customer');
      expect(content).to.contain('amount');
    });
  });
});
