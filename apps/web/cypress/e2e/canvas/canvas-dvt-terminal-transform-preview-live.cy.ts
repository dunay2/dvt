/**
 * Owned concern: prove one protected terminal DVT Transform from persisted
 * Canvas revision through PreviewPlan, StartRun, Temporal and PostgreSQL.
 */
import { KNOWN_STEP_KINDS } from '@dvt/contracts';

import {
  clickPreviewExecutionPlanFromOperationalDrawer,
  getVisibleCanvasNode,
  selectCanvasClosure,
} from '../../support/canvasExecutionSelection';
import { resetE2eApiStubs } from '../../support/e2eApiStub';
import {
  hasLiveProtectedRuntimeEnv,
  readLiveRunEvents,
  readLiveRunSnapshot,
  seedLiveSelectedClosureDraft,
  visitWithLiveWorkspaceSession,
} from '../../support/liveProtectedRuntime';

type PreviewAcceptedEnvelope = {
  readonly plan?: {
    readonly metadata?: { readonly planId?: string };
    readonly steps?: ReadonlyArray<{ readonly kind?: string }>;
  };
  readonly planRef?: { readonly planId?: string; readonly sha256?: string };
  readonly persisted?: { readonly canonicalPlanSha256?: string };
};

type RunEventResponse = {
  readonly items?: ReadonlyArray<{
    readonly eventType?: string;
    readonly payload?: {
      readonly resultEvidence?: {
        readonly evidenceType?: string;
        readonly plan?: { readonly sha256?: string };
        readonly target?: { readonly schema?: string; readonly relation?: string };
        readonly publication?: { readonly token?: string; readonly outcome?: string };
        readonly rowsWritten?: number;
      };
    };
  }>;
};

function readPostgresTargetSchema(): string {
  const schema = Cypress.env('postgresTargetSchema');
  if (typeof schema !== 'string' || schema.trim().length === 0) {
    throw new Error('Cypress env postgresTargetSchema is required for the DVT Run proof.');
  }
  return schema.trim();
}

function waitForCompletedRun(runId: string, attempt = 0): Cypress.Chainable<void> {
  return readLiveRunSnapshot(runId).then((response) => {
    expect(response.status).to.equal(200);
    const status = String((response.body as { status?: unknown }).status ?? '').toLowerCase();
    if (status === 'completed') return;
    if (status === 'failed') throw new Error(`Native DVT run ${runId} failed.`);
    if (attempt >= 60) throw new Error(`Native DVT run ${runId} did not complete.`);
    return cy.wait(500).then(() => waitForCompletedRun(runId, attempt + 1));
  });
}

describe('DVT terminal Transform Preview and Run live', () => {
  beforeEach(function () {
    if (!hasLiveProtectedRuntimeEnv()) this.skip();
    resetE2eApiStubs();
  });

  it('executes the exact accepted PlanRef and publishes PostgreSQL evidence', () => {
    const targetSchema = readPostgresTargetSchema();
    const targetRelation = 'orders_result';
    let previewSha = '';

    seedLiveSelectedClosureDraft({
      authoringGenerated: true,
      terminalTransformPreview: true,
      terminalTransformResultTarget: { schema: targetSchema, relation: targetRelation },
      title: 'DVT terminal Transform Run',
    });
    cy.intercept('POST', '**/plans/preview', (request) => {
      request.alias = 'dvtTerminalTransformPreview';
      expect(request.body).not.to.have.property('graphSource');
      expect(request.body.previewProfile).to.equal('planner-generic-v1');
      expect(request.body.persist).to.equal(true);
      expect(request.body.provenance).to.deep.include({
        kind: 'dvt-protected-workspace-graph',
      });
      expect(request.body.provenance.canvasId).to.be.a('string').and.not.to.equal('');
      expect(request.body.selection).to.deep.equal({
        mode: 'upstream',
        nodeIds: ['dvt-transform-1'],
      });
      request.continue();
    });

    visitWithLiveWorkspaceSession('/canvas');
    getVisibleCanvasNode('source-1').should('be.visible');
    getVisibleCanvasNode('dvt-transform-1').should('be.visible');
    selectCanvasClosure(['dvt-transform-1']);
    clickPreviewExecutionPlanFromOperationalDrawer();

    cy.wait('@dvtTerminalTransformPreview', { timeout: 30_000 }).then((interception) => {
      expect(interception.response?.statusCode).to.equal(200);
      const preview = interception.response?.body as PreviewAcceptedEnvelope;
      expect(
        preview.plan?.steps?.some(
          (step) => step.kind === KNOWN_STEP_KINDS.DVT_POSTGRES_OPERATIONAL_WORKLOAD
        )
      ).to.equal(true);
      expect(preview.planRef?.planId).to.equal(preview.plan?.metadata?.planId);
      previewSha = preview.planRef?.sha256 ?? '';
      expect(previewSha).to.match(/^[a-f0-9]{64}$/);
      expect(preview.persisted?.canonicalPlanSha256).to.match(/^[a-f0-9]{64}$/);
    });

    cy.get('[data-testid="plan-preview-modal"]', { timeout: 30_000 })
      .should('be.visible')
      .and('contain.text', KNOWN_STEP_KINDS.DVT_POSTGRES_OPERATIONAL_WORKLOAD);
    cy.get('[data-slot="plan-preview-start-run"]').should('be.enabled').click();

    cy.location('pathname', { timeout: 20_000 }).should('match', /^\/runs\/[^/]+$/);
    cy.location('pathname').then((pathname) => {
      const runId = pathname.split('/').pop();
      expect(runId).to.be.a('string').and.not.to.equal('');

      return waitForCompletedRun(runId!).then(() => {
        readLiveRunEvents(runId!).then((response) => {
          expect(response.status).to.equal(200);
          const completedStep = (response.body as RunEventResponse).items?.find(
            (event) => event.eventType === 'StepCompleted'
          );
          const evidence = completedStep?.payload?.resultEvidence;
          expect(evidence?.evidenceType).to.equal('dvt-postgres-publication');
          expect(evidence?.plan?.sha256).to.equal(previewSha);
          expect(evidence?.target).to.deep.include({
            schema: targetSchema,
            relation: targetRelation,
          });
          expect(evidence?.publication?.token).to.match(/^[a-f0-9]{64}$/);
          expect(evidence?.publication?.outcome).to.be.oneOf(['created', 'replaced', 'unchanged']);
          expect(evidence?.rowsWritten).to.equal(3);
        });
      });
    });

    cy.get('[data-slot="run-itinerary-card"]', { timeout: 30_000 })
      .should('be.visible')
      .and('contain.text', 'Completada');
  });
});
