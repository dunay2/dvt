/** Owns live execution fidelity: accepted plan -> Run evidence -> published PostgreSQL rows. */
import { DvtOperationalWorkloadV2Schema, KNOWN_STEP_KINDS } from '@dvt/contracts';

import {
  clickPreviewExecutionPlanFromOperationalDrawer,
  selectCanvasClosure,
} from '../canvasExecutionSelection';
import {
  readLiveRunEvents,
  readLiveRunSnapshot,
  resolveLiveWorkspaceSession,
} from '../liveProtectedRuntime';

import { expectedColumns, expectedRows, modelId, resultRelation } from './fixture';

function waitForCompletedRun(runId: string, attempt = 0): Cypress.Chainable<void> {
  return readLiveRunSnapshot(runId).then((response) => {
    expect(response.status).to.equal(200);
    const status = String((response.body as { status: string }).status).toLowerCase();
    if (status === 'completed') return;
    if (status === 'failed' || status === 'cancelled') throw new Error(`Run ${runId}: ${status}`);
    if (attempt >= 60) throw new Error(`Run ${runId} did not complete within 30 seconds`);
    return cy.wait(500).then(() => waitForCompletedRun(runId, attempt + 1));
  });
}

export function executePersistedModel(semanticSha: string): void {
  let planSha = '';
  cy.intercept('POST', '**/plans/preview').as('livePlan');
  selectCanvasClosure([modelId]);
  clickPreviewExecutionPlanFromOperationalDrawer();
  cy.wait('@livePlan', { timeout: 30_000 }).then(({ request, response }) => {
    expect(request.body.selection).to.deep.equal({ mode: 'upstream', nodeIds: [modelId] });
    expect(response?.statusCode).to.equal(200);
    const preview = response!.body;
    expect(preview.plan.steps).to.have.length(1);
    expect(preview.plan.steps[0].kind).to.equal(KNOWN_STEP_KINDS.DVT_POSTGRES_OPERATIONAL_WORKLOAD);
    const workload = DvtOperationalWorkloadV2Schema.parse(preview.plan.steps[0].stepTypeConfig);
    expect(workload.semantics[0]).to.deep.include({
      transformNodeId: modelId,
      semanticPlanSha256: semanticSha,
    });
    expect(workload.targetProjection.semanticPlanSha256).to.equal(semanticSha);
    expect(workload.output.disposition).to.equal('table');
    planSha = preview.planRef.sha256;
    expect(planSha).to.match(/^[a-f0-9]{64}$/);
  });
  cy.get('[data-slot="plan-preview-start-run"]').should('be.enabled').click();
  cy.location('pathname', { timeout: 20_000 }).should('match', /^\/runs\/[^/]+$/);
  cy.location('pathname').then((pathname) => {
    const runId = pathname.split('/').pop()!;
    waitForCompletedRun(runId);
    readLiveRunEvents(runId).then((response) => {
      expect(response.status).to.equal(200);
      const events = response.body as {
        items: Array<{
          eventType: string;
          payload?: {
            resultEvidence?: {
              evidenceType?: string;
              plan?: { sha256?: string };
              rowsWritten?: number;
            };
          };
        }>;
      };
      const completed = events.items.filter((event) => event.eventType === 'StepCompleted');
      expect(completed).to.have.length(1);
      expect(completed[0]?.payload?.resultEvidence).to.deep.include({
        evidenceType: 'dvt-postgres-publication',
        rowsWritten: 2,
      });
      expect(completed[0]?.payload?.resultEvidence?.plan?.sha256).to.equal(planSha);
    });
  });
  cy.get('[data-slot="run-result-tab"]').click();
  cy.get('[data-slot="run-dvt-postgres-publication-card"]', { timeout: 30_000 }).should(
    'contain.text',
    resultRelation
  );
  const query = new URLSearchParams({
    ...resolveLiveWorkspaceSession(),
    objectId: `relation/dvt/${String(Cypress.env('postgresTargetSchema'))}/${resultRelation}`,
    limit: '10',
  });
  cy.request({
    url: `${String(Cypress.env('apiBaseUrl'))}/workspace/warehouse/connections/local-postgres-proof/source-data-sample?${query}`,
    auth: { bearer: String(Cypress.env('apiBearerToken')) },
  }).then(({ status, body }) => {
    expect(status).to.equal(200);
    expect(body.columns.map((column: { name: string }) => column.name)).to.deep.equal(
      expectedColumns
    );
    // A published table has no inherent row order; ordering is asserted on the data-query rail.
    expect(body.rows.map((row: { values: unknown[] }) => row.values).sort()).to.deep.equal(
      [...expectedRows].sort()
    );
  });
  cy.screenshot('semantic-live-published-result');
}
