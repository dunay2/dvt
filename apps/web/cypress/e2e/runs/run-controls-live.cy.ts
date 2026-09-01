/**
 * Owned concern: prove authoritative cancellation and recovery through the
 * browser, protected runtime, durable snapshot, and shared event feed.
 */
import { canvasViewCopy } from '../../../src/app/views/canvas/copy';
import {
  clickButtonNatively,
  clickPreviewExecutionPlanFromOperationalDrawer,
  selectCanvasClosure,
} from '../../support/canvasExecutionSelection';
import { resetE2eApiStubs } from '../../support/e2eApiStub';
import {
  hasLiveProtectedRuntimeEnv,
  readLiveGraphDraft,
  readLiveRunEvents,
  readLiveRunSnapshot,
  seedLiveSelectedClosureDraft,
  visitWithLiveWorkspaceSession,
} from '../../support/liveProtectedRuntime';

const LONG_RUNNING_SQL = `with delayed as (
  select pg_sleep(20)
)
select source.*
from public.source_1 as source
cross join delayed;`;

type LiveRunSnapshot = Readonly<{
  runId: string;
  planId?: string;
  status: string;
}>;

type LiveRunEventResponse = Readonly<{
  items?: ReadonlyArray<Readonly<{ eventType?: string }>>;
}>;

function waitForPersistedTransformSql(attempt = 0): Cypress.Chainable<void> {
  return readLiveGraphDraft().then((response) => {
    expect(response.status).to.equal(200);
    const nodes = (
      response.body as {
        record?: { draft?: { nodes?: Array<{ id: string; metadata?: Record<string, unknown> }> } };
      }
    ).record?.draft?.nodes;
    const transform = nodes?.find((node) => node.id === 'dvt-transform-1');
    const sql = (transform?.metadata?.config as { sql?: string } | undefined)?.sql;

    if (sql === LONG_RUNNING_SQL) {
      return;
    }
    if (attempt >= 30) {
      throw new Error('Timed out waiting for the long-running transform SQL to persist.');
    }

    return cy.wait(250).then(() => waitForPersistedTransformSql(attempt + 1));
  });
}

function waitForRunStatus(
  runId: string,
  expectedStatus: string,
  attempt = 0
): Cypress.Chainable<LiveRunSnapshot> {
  return readLiveRunSnapshot(runId).then((response) => {
    expect(response.status).to.equal(200);
    const snapshot = response.body as LiveRunSnapshot;

    if (snapshot.status.toLowerCase() === expectedStatus) {
      return snapshot;
    }
    if (attempt >= 60) {
      throw new Error(
        `Timed out waiting for run ${runId} to become ${expectedStatus}; observed ${snapshot.status}.`
      );
    }

    return cy.wait(500).then(() => waitForRunStatus(runId, expectedStatus, attempt + 1));
  });
}

function readEventTypes(runId: string): Cypress.Chainable<string[]> {
  return readLiveRunEvents(runId).then((response) => {
    expect(response.status).to.equal(200);
    return ((response.body as LiveRunEventResponse).items ?? [])
      .map((event) => event.eventType)
      .filter((eventType): eventType is string => typeof eventType === 'string');
  });
}

function authorLongRunningTransform(): void {
  cy.get('.react-flow__node[data-id="dvt-transform-1"]', { timeout: 20_000 })
    .should('be.visible')
    .find('[data-slot="canvas-node-shell"]')
    .dblclick();
  cy.get('[data-slot="canvas-node-workbench-tab-code"]')
    .should('be.visible')
    .and('have.attr', 'aria-selected', 'true');
  cy.get('textarea[name="dvt-transform-sql"]', { timeout: 20_000 })
    .should('be.enabled')
    .clear()
    .type(LONG_RUNNING_SQL, { parseSpecialCharSequences: false });
  cy.contains('button', canvasViewCopy.inspectorApplyLabel).should('be.enabled').click();
  waitForPersistedTransformSql();
  cy.get('[data-slot="canvas-node-workbench-close"]').should('be.visible').click();
  cy.get('[data-slot="canvas-node-workbench-overlay"]').should('not.exist');
}

describe('Run controls live protected runtime', () => {
  beforeEach(function () {
    if (!hasLiveProtectedRuntimeEnv()) {
      this.skip();
    }
    resetE2eApiStubs();
  });

  it('cancels and recovers from backend-owned run truth', () => {
    seedLiveSelectedClosureDraft({ authoringGenerated: true });
    visitWithLiveWorkspaceSession('/canvas');
    authorLongRunningTransform();
    selectCanvasClosure(['Source 1', 'Transform 1', 'Sink 1']);
    clickPreviewExecutionPlanFromOperationalDrawer();
    cy.contains('Execution Preview', { timeout: 20_000 }).should('be.visible');
    clickButtonNatively('Start Run');

    cy.location('pathname', { timeout: 20_000 })
      .should('match', /^\/runs\/[^/]+$/)
      .then((sourcePathname) => {
        const sourceRunId = sourcePathname.split('/').pop();
        expect(sourceRunId).to.be.a('string').and.not.to.equal('');

        readLiveRunSnapshot(sourceRunId!).then((response) => {
          expect(response.status).to.equal(200);
          const sourceBeforeCancellation = response.body as LiveRunSnapshot;
          expect(sourceBeforeCancellation.planId).to.be.a('string').and.not.to.equal('');

          cy.get('[data-slot="run-cancel-action"]', { timeout: 20_000 })
            .should('be.enabled')
            .click();
          waitForRunStatus(sourceRunId!, 'cancelled').then((cancelledSource) => {
            expect(cancelledSource.planId).to.equal(sourceBeforeCancellation.planId);
          });
          readEventTypes(sourceRunId!).then((eventTypes) => {
            expect(eventTypes).to.include.members(['RunCancelRequested', 'RunCancelled']);
          });

          cy.intercept('POST', '**/runs/*/recover').as('recoverRun');
          cy.get('[data-slot="run-recover-action"]', { timeout: 20_000 })
            .should('be.enabled')
            .click();
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

          cy.location('pathname', { timeout: 20_000 })
            .should('match', /^\/runs\/[^/]+$/)
            .and('not.equal', sourcePathname)
            .then((recoveryPathname) => {
              const recoveryRunId = recoveryPathname.split('/').pop();
              expect(recoveryRunId).to.be.a('string').and.not.to.equal(sourceRunId);

              readLiveRunSnapshot(recoveryRunId!).then((response) => {
                expect(response.status).to.equal(200);
                const recoverySnapshot = response.body as LiveRunSnapshot;
                expect(recoverySnapshot.planId).to.equal(sourceBeforeCancellation.planId);
              });
              readLiveRunSnapshot(sourceRunId!).then((response) => {
                expect((response.body as LiveRunSnapshot).status.toLowerCase()).to.equal(
                  'cancelled'
                );
              });

              cy.get('[data-slot="run-cancel-action"]', { timeout: 20_000 })
                .should('be.enabled')
                .click();
              waitForRunStatus(recoveryRunId!, 'cancelled').then(() => {
                cy.intercept('POST', '**/runs/*/recover').as('recoverDescendant');
                cy.get('[data-slot="run-recover-action"]', { timeout: 20_000 })
                  .should('be.enabled')
                  .click();
                cy.wait('@recoverDescendant', { timeout: 20_000 }).then((interception) => {
                  expect(interception.response?.statusCode).to.equal(202);
                  expect(interception.response?.body).to.include({
                    contractVersion: 'v1',
                    sourceRunId: recoveryRunId,
                    accepted: true,
                  });
                });

                cy.location('pathname', { timeout: 20_000 })
                  .should('match', /^\/runs\/[^/]+$/)
                  .and('not.equal', recoveryPathname)
                  .then((descendantPathname) => {
                    const descendantRunId = descendantPathname.split('/').pop();
                    expect(descendantRunId).to.be.a('string').and.not.to.equal(recoveryRunId);

                    readLiveRunSnapshot(descendantRunId!).then((response) => {
                      expect(response.status).to.equal(200);
                      expect((response.body as LiveRunSnapshot).planId).to.equal(
                        sourceBeforeCancellation.planId
                      );
                    });
                    cy.get('[data-slot="run-cancel-action"]', { timeout: 20_000 })
                      .should('be.enabled')
                      .click();
                    waitForRunStatus(descendantRunId!, 'cancelled');
                  });
              });
            });
        });
      });
  });
});
