/**
 * Owned concern: prove the selected-closure browser route against the live
 * protected runtime seams.
 */
import { clickButtonNatively, selectCanvasClosure } from '../../support/canvasExecutionSelection';
import {
  stubSelectedClosurePreviewArtifacts,
  waitForSelectedClosurePreviewArtifacts,
} from '../../support/canvasPreviewArtifacts';
import { resetE2eApiStubs } from '../../support/e2eApiStub';
import {
  hasLiveProtectedRuntimeEnv,
  readLiveRunEvents,
  readLiveRunSnapshot,
  readLiveWorkspaceFile,
  seedLiveSelectedClosureDraft,
  visitWithLiveWorkspaceSession,
} from '../../support/liveProtectedRuntime';

describe('Canvas preview-run live protected runtime', () => {
  beforeEach(function () {
    if (!hasLiveProtectedRuntimeEnv()) {
      this.skip();
    }
    resetE2eApiStubs();
  });

  it('proves selected-closure preview and run against live protected runtime seams', () => {
    stubSelectedClosurePreviewArtifacts();
    seedLiveSelectedClosureDraft({ includeLooseNode: true });
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

  it('creates a plan from a canvas-authored graph by persisting generated SQL and graph artifacts', () => {
    seedLiveSelectedClosureDraft({ authoringGenerated: true });
    visitWithLiveWorkspaceSession('/canvas');

    cy.contains('.react-flow__node', 'Source 1').should('be.visible');
    cy.contains('.react-flow__node', 'SQL transform 1').should('be.visible');
    cy.contains('.react-flow__node', 'Sink 1').should('be.visible');

    selectCanvasClosure(['Source 1', 'SQL transform 1', 'Sink 1']);

    clickButtonNatively('Plan');

    cy.contains('Execution Plan Preview', { timeout: 20_000 }).should('be.visible');
    cy.contains('Persisted Preview Summary').should('be.visible');
    cy.contains('Source tables:').parent().should('contain.text', 'public.source_1');
    cy.contains('Sink tables:').parent().should('contain.text', 'public.sink_1');

    readLiveWorkspaceFile('models/dvt-sql-transform-1.sql').then((sqlResponse) => {
      expect(sqlResponse.status).to.equal(200);
      expect((sqlResponse.body as { content: string }).content).to.equal(
        'select *\nfrom public.source_1;\n'
      );
    });

    readLiveWorkspaceFile('pipelines/sales_pipeline.yaml').then((graphResponse) => {
      expect(graphResponse.status).to.equal(200);
      const content = (graphResponse.body as { content: string }).content;
      expect(content).to.contain('id: "source-1"');
      expect(content).to.contain('id: "dvt-sql-transform-1"');
      expect(content).to.contain('id: "sink-1"');
      expect(content).to.contain('entrypoint: "models/dvt-sql-transform-1.sql"');
      expect(content).to.contain('schema: "public"');
      expect(content).to.contain('table: "sink_1"');
      expect(content).to.contain('fromNodeId: "source-1"');
      expect(content).to.contain('toNodeId: "dvt-sql-transform-1"');
      expect(content).to.contain('fromNodeId: "dvt-sql-transform-1"');
      expect(content).to.contain('toNodeId: "sink-1"');
    });
  });
});
