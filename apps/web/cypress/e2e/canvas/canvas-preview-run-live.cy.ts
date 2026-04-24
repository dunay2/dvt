/**
 * Owned concern: prove the selected-closure browser route against the live
 * protected runtime seams.
 */
import {
  clickButtonNatively,
  selectCanvasClosure,
} from '../../support/canvasExecutionSelection';
import {
  stubSelectedClosurePreviewArtifacts,
  waitForSelectedClosurePreviewArtifacts,
} from '../../support/canvasPreviewArtifacts';
import {
  readLiveRunEvents,
  readLiveRunSnapshot,
  seedLiveSelectedClosureDraft,
  visitWithLiveWorkspaceSession,
} from '../../support/liveProtectedRuntime';

describe('Canvas preview-run live protected runtime', () => {
  beforeEach(() => {
    stubSelectedClosurePreviewArtifacts();
    seedLiveSelectedClosureDraft({ includeLooseNode: true });
  });

  it('proves selected-closure preview and run against live protected runtime seams', () => {
    visitWithLiveWorkspaceSession('/canvas');

    cy.contains('.react-flow__node', 'src_orders').should('be.visible');
    cy.contains('.react-flow__node', 'model_orders').should('be.visible');
    cy.contains('.react-flow__node', 'orders_dashboard').should('be.visible');
    cy.contains('.react-flow__node', 'orphan_metrics').should('be.visible');

    selectCanvasClosure(['src_orders', 'model_orders', 'orders_dashboard']);

    cy.contains('button', 'Plan').should('be.enabled').click();
    waitForSelectedClosurePreviewArtifacts();

    cy.contains('Execution Plan Preview').should('be.visible');
    cy.contains('Persisted Preview Summary').should('be.visible');
    cy.contains('Nodes:').parent().should('contain.text', '3');
    cy.contains('Source tables:').parent().should('contain.text', 'raw.orders');
    cy.contains('Sink tables:').parent().should('contain.text', 'analytics.orders_daily');

    clickButtonNatively('Start Run');

    cy.location('pathname', { timeout: 20_000 }).should('match', /^\/runs\/[^/]+$/);
    cy.location('pathname').then((pathname) => {
      const runId = pathname.split('/').pop();
      expect(runId).to.be.a('string').and.not.to.equal('');

      readLiveRunSnapshot(runId!).then((snapshotResponse) => {
        expect(snapshotResponse.status).to.equal(200);
        expect((snapshotResponse.body as { runId: string }).runId).to.equal(runId);
      });

      readLiveRunEvents(runId!).then((eventsResponse) => {
        expect(eventsResponse.status).to.equal(200);
      });
    });

    cy.contains(/^Run /, { timeout: 20_000 }).should('exist');
  });
});
