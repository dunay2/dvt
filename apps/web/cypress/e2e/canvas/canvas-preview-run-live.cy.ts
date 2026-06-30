/**
 * Owned concern: prove the selected-closure browser route against the live
 * protected runtime seams.
 */
import {
  clickButtonNatively,
  clickPreviewExecutionPlanFromOperationalDrawer,
  getVisibleCanvasNode,
  selectCanvasClosure,
} from '../../support/canvasExecutionSelection';
import { resetE2eApiStubs } from '../../support/e2eApiStub';
import {
  hasLiveProtectedRuntimeEnv,
  readLiveRunEvents,
  readLiveRunSnapshot,
  readLiveWorkspaceFile,
  seedLiveSelectedClosureDraft,
  visitWithLiveWorkspaceSession,
} from '../../support/liveProtectedRuntime';

type LiveRunSnapshot = {
  readonly runId: string;
  readonly status: string;
  readonly materialization?: LiveMaterializationEvidence;
  readonly execution?: {
    readonly materialization?: LiveMaterializationEvidence;
  };
};

type LiveMaterializationEvidence = {
  readonly executor: string;
  readonly environmentId: string;
  readonly sinkTable: string;
  readonly rowsWritten: number;
};

type LiveRunEventResponse = {
  readonly items?: Array<{ readonly eventType?: string; readonly stepId?: string }>;
};

function assertCompletedMaterialization(
  snapshot: LiveRunSnapshot,
  expected: { readonly sinkTable: string; readonly rowsWritten: number }
): void {
  const materialization = snapshot.materialization ?? snapshot.execution?.materialization;

  expect(snapshot.status.toLowerCase()).to.equal('completed');
  expect(materialization?.executor).to.equal('postgres');
  expect(materialization?.environmentId).to.equal('dev');
  expect(materialization?.sinkTable).to.equal(expected.sinkTable);
  expect(materialization?.rowsWritten).to.equal(expected.rowsWritten);
}

function waitForCompletedLiveRun(
  runId: string,
  expected: { readonly sinkTable: string; readonly rowsWritten: number },
  attempt = 0
): Cypress.Chainable<Cypress.Response<unknown>> {
  return readLiveRunSnapshot(runId).then((snapshotResponse) => {
    expect(snapshotResponse.status).to.equal(200);
    const snapshot = snapshotResponse.body as LiveRunSnapshot;

    if (snapshot.status.toLowerCase() === 'completed') {
      assertCompletedMaterialization(snapshot, expected);
      return snapshotResponse;
    }

    if (snapshot.status.toLowerCase() === 'failed') {
      throw new Error(`Live run ${runId} failed before completion.`);
    }

    if (attempt >= 60) {
      throw new Error(`Timed out waiting for live run ${runId} to complete.`);
    }

    return cy.wait(500).then(() => waitForCompletedLiveRun(runId, expected, attempt + 1));
  });
}

function openSourceImportFromCanvas(): void {
  cy.get('.react-flow__pane', { timeout: 20_000 }).rightclick(140, 500);
  cy.contains('[role="menuitem"]', 'Add...', { timeout: 20_000 }).click();
  cy.contains('[role="menuitem"]', 'Add source', { timeout: 20_000 }).click();
}

function getOpenSourceImportDialog(): Cypress.Chainable<JQuery<HTMLElement>> {
  return cy
    .get('[data-slot="dialog-content"][data-state="open"]', { timeout: 20_000 })
    .then(($dialogs) => {
      const visibleDialogs = $dialogs.filter((_, element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden';
      });

      expect(visibleDialogs.length, 'open visible source import dialog').to.be.greaterThan(0);
      return cy.wrap(visibleDialogs.last());
    });
}

function closeRunOperationsIfOpen(): void {
  cy.get('body').then(($body) => {
    const closeButton = $body.find('[data-slot="bottom-operational-drawer-close"]');

    if (closeButton.length > 0) {
      cy.get('[data-slot="bottom-operational-drawer-close"]').click({ force: true });
    }
  });
}

describe('Canvas preview-run live protected runtime', () => {
  beforeEach(function () {
    if (!hasLiveProtectedRuntimeEnv()) {
      this.skip();
    }
    resetE2eApiStubs();
  });

  it('creates and completes a real SQL-first workflow from a canvas-authored graph', () => {
    seedLiveSelectedClosureDraft({ authoringGenerated: true });
    visitWithLiveWorkspaceSession('/canvas');

    getVisibleCanvasNode('Source 1').should('be.visible');
    getVisibleCanvasNode('SQL transform 1').should('be.visible');
    getVisibleCanvasNode('Sink 1').should('be.visible');

    selectCanvasClosure(['Source 1', 'SQL transform 1', 'Sink 1']);

    clickPreviewExecutionPlanFromOperationalDrawer();

    cy.contains('Execution Preview', { timeout: 20_000 }).should('be.visible');
    cy.contains('Execution Preview identity').should('be.visible');
    cy.contains('Execution target').should('be.visible');
    cy.contains('Persisted preview summary').scrollIntoView().should('be.visible');
    cy.contains('Source tables').parent().should('contain.text', 'public.source_1');
    cy.contains('Sink tables').parent().should('contain.text', 'public.sink_1');

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

    clickButtonNatively('Start Run');

    cy.location('pathname', { timeout: 20_000 }).should('match', /^\/runs\/[^/]+$/);
    cy.location('pathname').then((pathname) => {
      const runId = pathname.split('/').pop();
      expect(runId).to.be.a('string').and.not.to.equal('');

      return waitForCompletedLiveRun(runId!, {
        sinkTable: 'public.sink_1',
        rowsWritten: 3,
      }).then(() => {
        readLiveRunEvents(runId!).then((eventsResponse) => {
          expect(eventsResponse.status).to.equal(200);
          const eventTypes = ((eventsResponse.body as LiveRunEventResponse).items ?? []).map(
            (event) => event.eventType
          );
          expect(eventTypes).to.include.members([
            'RunQueued',
            'RunStarted',
            'StepCompleted',
            'RunCompleted',
          ]);
        });
      });
    });

    cy.contains(/^Run /, { timeout: 20_000 }).should('exist');
    cy.contains('Runtime snapshot', { timeout: 30_000 }).should('be.visible');
    closeRunOperationsIfOpen();
    cy.get('[data-slot="run-materialization-card"]', { timeout: 30_000 })
      .scrollIntoView()
      .should('be.visible')
      .and('contain.text', 'Materialization evidence')
      .and('contain.text', 'public.sink_1')
      .and('contain.text', 'Rows written')
      .and('contain.text', '3');
    cy.get('[data-slot="run-diagnostics-card"]', { timeout: 30_000 })
      .scrollIntoView()
      .should('be.visible')
      .and('contain.text', 'Diagnostics')
      .and('contain.text', 'Preview SHA')
      .and('contain.text', 'Trace and log pointers')
      .and('not.contain.text', 'Not available');
    cy.get('[data-slot="run-plan-provenance-card"]', { timeout: 30_000 })
      .scrollIntoView()
      .should('be.visible')
      .and('contain.text', 'Execution Preview and authoring provenance')
      .and('contain.text', 'Preview record')
      .and('contain.text', 'Preview source ref')
      .and('contain.text', 'dvt-plan://')
      .and('contain.text', 'Canonical preview SHA-256')
      .and('contain.text', 'Graph artifact')
      .and('contain.text', 'SQL artifact')
      .and('not.contain.text', 'Not available');
    cy.get('[data-slot="run-execution-provenance-card"]', { timeout: 30_000 })
      .scrollIntoView()
      .should('be.visible')
      .and('contain.text', 'Execution provenance')
      .and('contain.text', 'Execution provenance is not available yet');
  });

  it('connects Canvas to seeded local warehouse sources through contextual Add Source', () => {
    seedLiveSelectedClosureDraft({ authoringGenerated: true });
    visitWithLiveWorkspaceSession('/canvas');

    openSourceImportFromCanvas();

    getOpenSourceImportDialog().within(() => {
      cy.contains('Add source').should('be.visible');
      cy.contains('Choose database connection').should('be.visible');
      cy.contains('Local Postgres proof').should('be.visible').click();
    });

    getOpenSourceImportDialog().within(() => {
      cy.contains('[role="tab"]', 'Browse').click();
      cy.contains('Browse source tables', { timeout: 20_000 }).should('be.visible');
      cy.get('[data-source-import-table="dvt.raw.orders"]', { timeout: 20_000 }).click();
    });
    getOpenSourceImportDialog().should('contain.text', 'Selected: 1');

    getOpenSourceImportDialog().within(() => {
      cy.contains('[role="tab"]', 'Metadata').click();
      cy.contains('Add Generic Tests', { timeout: 20_000 }).should('be.visible');
      cy.contains('Add Generic Tests')
        .closest('[class*="border-slate-600"]')
        .find('[role="checkbox"]')
        .click();
    });

    getOpenSourceImportDialog().within(() => {
      cy.contains('[role="tab"]', 'Selected').click();
      cy.contains('Connection:').parent().should('contain.text', 'Local Postgres proof');
      cy.contains('Tables Selected:').parent().should('contain.text', '1');
      cy.contains('Add Generic Tests').parent().should('contain.text', 'Yes');
    });
    clickButtonNatively('Attach sources to canvas');

    getOpenSourceImportDialog().within(() => {
      cy.contains('Your selected tables have been attached to the workspace graph.', {
        timeout: 30_000,
      }).should('be.visible');
      cy.contains('Tables registered:').parent().should('contain.text', '1');
    });
    cy.contains('Stale version').should('not.exist');

    readLiveWorkspaceFile('models/sources/src_raw.yml').then((sourceYamlResponse) => {
      expect(sourceYamlResponse.status).to.equal(200);
      const content = (sourceYamlResponse.body as { content: string }).content;
      expect(content).to.contain('schema: raw');
      expect(content).to.contain('name: orders');
      expect(content).to.contain('order_id');
    });
  });
});
