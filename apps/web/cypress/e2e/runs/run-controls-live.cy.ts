/**
 * Owned concern: prove cancellation and recovery against backend-owned run truth.
 * @baseline GH-3578: executable SQL belongs to governed project files, not node metadata.
 * @decision Enter through shared Properties, author Code, and reuse the real runtime.
 * @consequence Original and descendant runs retain the same persisted plan identity.
 * @version 1.0.0
 */
import {
  clickButtonNatively,
  clickPreviewExecutionPlanFromOperationalDrawer,
  selectCanvasClosure,
} from '../../support/canvasExecutionSelection';
import {
  adoptLiveDbtProjectFileAuthority,
  seedLiveWorkspaceFiles,
} from '../../support/dbtProjectLive';
import { resetE2eApiStubs } from '../../support/e2eApiStub';
import {
  hasLiveProtectedRuntimeEnv,
  readLiveRunEvents,
  readLiveRunSnapshot,
  visitWithLiveWorkspaceSession,
  waitForLiveWorkspaceFileContent,
} from '../../support/liveProtectedRuntime';
import { openWorkbenchProperties } from '../../support/relationalWorkbench/navigation';

const PROJECT_ROOT = 'run-controls';
const CANVAS_ID = 'run-controls-files';
const MODEL_ID = 'model.run_controls.controlled';
const MODEL_PATH = `${PROJECT_ROOT}/models/controlled.sql`;
// Only the disposable test workload waits; production clocks and timeouts stay unchanged.
const LONG_RUNNING_SQL = "{{ config(materialized='table') }}\nselect 1 as value from pg_sleep(20)";
const PROJECT_FILES = {
  [`${PROJECT_ROOT}/dbt_project.yml`]: `name: run_controls
version: '0.1.0'
config-version: 2
profile: dvt_live_proof
model-paths: ['models']
`,
  [MODEL_PATH]: 'select 1 as value',
};

type LiveRunSnapshot = Readonly<{ runId: string; planId?: string; status: string }>;
type LiveRunEventResponse = Readonly<{
  items?: ReadonlyArray<Readonly<{ eventType?: string }>>;
}>;

function waitForRunStatus(
  runId: string,
  expectedStatus: string,
  attempt = 0
): Cypress.Chainable<LiveRunSnapshot> {
  return readLiveRunSnapshot(runId).then((response) => {
    expect(response.status).to.equal(200);
    const snapshot = response.body as LiveRunSnapshot;
    if (snapshot.status.toLowerCase() === expectedStatus) return snapshot;
    if (attempt >= 60) {
      throw new Error(
        `Timed out waiting for run ${runId} to become ${expectedStatus}; observed ${snapshot.status}.`
      );
    }
    return cy.wait(500).then(() => waitForRunStatus(runId, expectedStatus, attempt + 1));
  });
}

function authorLongRunningModel(): void {
  openWorkbenchProperties(MODEL_ID);
  cy.get('[data-slot="canvas-node-workbench-tab-code"]')
    .should('be.visible')
    .click()
    .should('have.attr', 'aria-selected', 'true');
  cy.get('[data-slot="workspace-file-code-editor"]', { timeout: 20_000 }).should(
    'have.attr',
    'data-file-path',
    MODEL_PATH
  );
  cy.get('[data-testid="monaco-code-editor"]', { timeout: 20_000 }).find('.view-lines').click();
  cy.focused()
    .should(($editor) => expect($editor.is('textarea, [contenteditable="true"]')).to.equal(true))
    .type('{ctrl+a}{backspace}', { delay: 0 });
  cy.focused().type(LONG_RUNNING_SQL, { parseSpecialCharSequences: false, delay: 0 });
  waitForLiveWorkspaceFileContent(MODEL_PATH, LONG_RUNNING_SQL);
  cy.get('[data-slot="code-working-tree-status"]').should(
    'have.attr',
    'data-phase',
    'synchronized'
  );
  cy.get('[data-slot="canvas-node-workbench-close"]').should('be.visible').click();
  cy.get('[data-slot="canvas-node-workbench-overlay"]').should('not.exist');
}

function cancelRun(runId: string, planId: string): Cypress.Chainable<void> {
  cy.get('[data-slot="run-cancel-action"]', { timeout: 20_000 }).should('be.enabled').click();
  return waitForRunStatus(runId, 'cancelled').then((snapshot) => {
    expect(snapshot.planId).to.equal(planId);
    return readLiveRunEvents(runId).then((response) => {
      expect(response.status).to.equal(200);
      const events = ((response.body as LiveRunEventResponse).items ?? []).map(
        ({ eventType }) => eventType
      );
      expect(events).to.include.members(['RunCancelRequested', 'RunCancelled']);
    });
  });
}

function recoverRun(sourceRunId: string, planId: string): Cypress.Chainable<string> {
  cy.intercept('POST', '**/runs/*/recover').as('recoverRun');
  cy.get('[data-slot="run-recover-action"]', { timeout: 20_000 }).should('be.enabled').click();
  cy.wait('@recoverRun', { timeout: 20_000 }).then((interception) => {
    expect(interception.response?.statusCode).to.equal(202);
    expect(interception.request.headers['idempotency-key'])
      .to.be.a('string')
      .and.match(/^recover-run:/);
    expect(interception.response?.body).to.include({
      contractVersion: 'v1',
      sourceRunId,
      accepted: true,
    });
  });
  return cy
    .location('pathname', { timeout: 20_000 })
    .should('match', /^\/runs\/[^/]+$/)
    .and('not.equal', `/runs/${sourceRunId}`)
    .then((pathname) => {
      const runId = pathname.split('/').pop()!;
      return readLiveRunSnapshot(runId).then((response) => {
        expect(response.status).to.equal(200);
        expect((response.body as LiveRunSnapshot).planId).to.equal(planId);
        return readLiveRunSnapshot(sourceRunId).then((source) => {
          expect(source.status).to.equal(200);
          expect((source.body as LiveRunSnapshot).status.toLowerCase()).to.equal('cancelled');
          return runId;
        });
      });
    });
}

describe('Run controls live protected runtime', () => {
  beforeEach(() => {
    if (!hasLiveProtectedRuntimeEnv()) {
      throw new Error('Run controls proof requires protected runtime credentials.');
    }
    resetE2eApiStubs();
  });

  it('cancels and recovers from backend-owned run truth', () => {
    seedLiveWorkspaceFiles(PROJECT_FILES).then(() =>
      adoptLiveDbtProjectFileAuthority(PROJECT_ROOT, CANVAS_ID)
    );
    visitWithLiveWorkspaceSession(
      `/canvas?authority=dbt-project-files&canvasId=${CANVAS_ID}&projectRoot=${PROJECT_ROOT}`
    );
    authorLongRunningModel();
    selectCanvasClosure([MODEL_ID]);
    clickPreviewExecutionPlanFromOperationalDrawer();
    cy.contains('Execution Preview', { timeout: 20_000 }).should('be.visible');
    clickButtonNatively('Start Run');

    cy.location('pathname', { timeout: 20_000 })
      .should('match', /^\/runs\/[^/]+$/)
      .then((pathname) => {
        const originalRunId = pathname.split('/').pop()!;
        return readLiveRunSnapshot(originalRunId).then((response) => {
          expect(response.status).to.equal(200);
          const { planId } = response.body as LiveRunSnapshot;
          expect(planId).to.be.a('string').and.not.to.equal('');
          return cancelRun(originalRunId, planId!)
            .then(() => recoverRun(originalRunId, planId!))
            .then((recoveryId) =>
              cancelRun(recoveryId, planId!).then(() => recoverRun(recoveryId, planId!))
            )
            .then((descendantId) => cancelRun(descendantId, planId!));
        });
      });
  });
});
