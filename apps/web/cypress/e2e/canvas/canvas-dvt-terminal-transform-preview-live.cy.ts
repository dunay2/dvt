/**
 * Owned concern: prove one protected terminal DVT Transform from persisted
 * Canvas revision through PreviewPlan, StartRun, Temporal and PostgreSQL.
 */
import { KNOWN_STEP_KINDS } from '@dvt/contracts';

import {
  clickPreviewExecutionPlanFromOperationalDrawer,
  getVisibleCanvasNode,
  revealOperationalDrawer,
  selectCanvasClosure,
} from '../../support/canvasExecutionSelection';
import { resetE2eApiStubs } from '../../support/e2eApiStub';
import {
  hasLiveProtectedRuntimeEnv,
  readLiveRunEvents,
  readLiveRunSnapshot,
  resolveLiveWorkspaceSession,
  seedLiveSelectedClosureDraft,
  visitWithLiveWorkspaceSession,
} from '../../support/liveProtectedRuntime';

describe('DVT terminal Transform Preview and Run live', () => {
  beforeEach(function () {
    if (!hasLiveProtectedRuntimeEnv()) this.skip();
    resetE2eApiStubs();
  });

  it('executes the exact PlanRef and reloads its PostgreSQL evidence', () => {
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
    const targetSchemaValue = Cypress.env('postgresTargetSchema');
    if (typeof targetSchemaValue !== 'string' || targetSchemaValue.trim().length === 0) {
      throw new Error('Cypress env postgresTargetSchema is required for the DVT Run proof.');
    }
    const targetSchema = targetSchemaValue.trim();
    const targetRelation = 'orders_result';
    let previewSha = '';
    let publicationToken = '';
    const waitForCompletedRun = (runId: string, attempt = 0): Cypress.Chainable<void> =>
      readLiveRunSnapshot(runId).then((response) => {
        expect(response.status).to.equal(200);
        const status = String((response.body as { status?: unknown }).status ?? '').toLowerCase();
        if (status === 'completed') return;
        if (status === 'failed') throw new Error(`Native DVT run ${runId} failed.`);
        if (attempt >= 60) throw new Error(`Native DVT run ${runId} did not complete.`);
        return cy.wait(500).then(() => waitForCompletedRun(runId, attempt + 1));
      });

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
          publicationToken = evidence?.publication?.token ?? '';
          expect(publicationToken).to.match(/^[a-f0-9]{64}$/);
          expect(evidence?.publication?.outcome).to.be.oneOf([
            'created',
            'replaced',
            'verified-existing',
          ]);
          expect(evidence?.rowsWritten).to.equal(3);
        });
      });
    });

    cy.get('[data-slot="run-itinerary-card"]', { timeout: 30_000 })
      .should('be.visible')
      .and('contain.text', 'Completada');
    cy.get('[data-slot="run-result-tab"]').click();
    cy.get('[data-slot="run-dvt-postgres-publication-card"]', { timeout: 30_000 })
      .should('be.visible')
      .and('contain.text', `${targetSchema}.${targetRelation}`);
    cy.get('[data-slot="run-dvt-publication-plan-sha"]').should(($value) => {
      expect($value.text()).to.equal(previewSha);
    });
    cy.get('[data-slot="run-dvt-publication-token"]').should(($value) => {
      expect($value.text()).to.equal(publicationToken);
    });

    cy.location('pathname').then((pathname) => {
      const runId = pathname.split('/').pop();
      expect(runId).to.be.a('string').and.not.to.equal('');
      cy.intercept('GET', `**/runs/${runId}?*`).as('reloadedDvtRunSnapshot');

      cy.reload();
      cy.wait('@reloadedDvtRunSnapshot', { timeout: 30_000 })
        .its('response.statusCode')
        .should('equal', 200);
      cy.get('[data-slot="run-itinerary-card"]', { timeout: 30_000 })
        .should('be.visible')
        .and('contain.text', 'Completada');
      cy.get('[data-slot="run-result-tab"]').click();
      cy.get('[data-slot="run-dvt-publication-plan-sha"]').should(($value) => {
        expect($value.text()).to.equal(previewSha);
      });
      cy.get('[data-slot="run-dvt-publication-token"]').should(($value) => {
        expect($value.text()).to.equal(publicationToken);
      });
    });
  });

  it('requires a new Preview after the Transform changes', () => {
    let startRunRequests = 0;

    seedLiveSelectedClosureDraft({
      authoringGenerated: true,
      terminalTransformPreview: true,
      title: 'DVT stale Preview guard',
    });
    cy.intercept('POST', '**/plans/preview').as('dvtPreviewBeforeEdit');
    cy.intercept('POST', '**/runs/start', (request) => {
      startRunRequests += 1;
      request.continue();
    });
    visitWithLiveWorkspaceSession('/canvas');
    getVisibleCanvasNode('dvt-transform-1').should('be.visible');
    selectCanvasClosure(['dvt-transform-1']);
    clickPreviewExecutionPlanFromOperationalDrawer();
    cy.wait('@dvtPreviewBeforeEdit', { timeout: 30_000 })
      .its('response.statusCode')
      .should('equal', 200);
    cy.get('[data-slot="plan-preview-start-run"]').should('be.enabled');
    cy.get('[data-testid="plan-preview-modal"]')
      .contains('button', /^(Close|Cerrar)$/)
      .click();
    cy.get('[data-testid="plan-preview-modal"]').should('not.exist');

    getVisibleCanvasNode('dvt-transform-1')
      .find('[data-slot="canvas-node-shell"]')
      .rightclick('center', { force: true });
    cy.contains('[data-slot="canvas-node-context-menu-item"]', /^(Properties|Propiedades)$/)
      .should('be.visible')
      .click();
    cy.get('[data-slot="canvas-node-workbench-overlay"]', { timeout: 20_000 }).should('be.visible');
    cy.get('input[name="node-name"]').clear().type('Transform after Preview');
    cy.contains('[data-slot="canvas-node-workbench-panel"] button', /^(Apply|Aplicar)$/).click();
    cy.get('[data-slot="canvas-node-workbench-close"]').click();

    cy.get('[data-slot="shell-run-command"]').should('be.disabled');
    revealOperationalDrawer();
    cy.get('[data-slot="bottom-operational-drawer-tab"][data-tab="runs"]').click();
    cy.get('[data-slot="bottom-operational-drawer-runs"]')
      .should('be.visible')
      .and('contain.text', 'Execution Preview')
      .invoke('text')
      .should('match', /(?:stale|obsoleto)/i);
    cy.then(() => {
      expect(startRunRequests).to.equal(0);
    });
  });

  it('rejects an unsupported view disposition before Run', () => {
    const targetSchemaValue = Cypress.env('postgresTargetSchema');
    if (typeof targetSchemaValue !== 'string' || targetSchemaValue.trim().length === 0) {
      throw new Error('Cypress env postgresTargetSchema is required for the DVT rejection proof.');
    }
    let startRunRequests = 0;

    seedLiveSelectedClosureDraft({
      authoringGenerated: true,
      terminalTransformPreview: true,
      terminalTransformResultTarget: {
        schema: targetSchemaValue.trim(),
        relation: 'unsupported_view_result',
      },
      title: 'DVT unsupported disposition guard',
    });
    cy.intercept('POST', '**/plans/preview').as('unsupportedDispositionPreview');
    cy.intercept('POST', '**/runs/start', (request) => {
      startRunRequests += 1;
      request.continue();
    });
    visitWithLiveWorkspaceSession('/canvas');

    getVisibleCanvasNode('dvt-transform-1')
      .find('[data-slot="canvas-node-shell"]')
      .rightclick('center', { force: true });
    cy.contains('[data-slot="canvas-node-context-menu-item"]', /^(Properties|Propiedades)$/)
      .should('be.visible')
      .click();
    cy.get('[data-slot="canvas-node-workbench-overlay"]', { timeout: 20_000 }).should('be.visible');
    cy.get('select[name="dvt-transform-materialization"]').select('view');
    cy.contains('[data-slot="canvas-node-workbench-panel"] button', /^(Apply|Aplicar)$/).click();
    cy.get('[data-slot="canvas-node-workbench-close"]').click();

    selectCanvasClosure(['dvt-transform-1']);
    clickPreviewExecutionPlanFromOperationalDrawer();
    cy.wait('@unsupportedDispositionPreview', { timeout: 30_000 })
      .its('response.statusCode')
      .should('equal', 422);
    cy.get('[data-testid="plan-preview-modal"]', { timeout: 30_000 })
      .should('be.visible')
      .and('contain.text', 'Configured Run supports only table result disposition.');
    cy.get('[data-slot="plan-preview-start-run"]').should('not.exist');
    cy.get('[data-slot="shell-run-command"]').should('be.disabled');
    cy.then(() => {
      expect(startRunRequests).to.equal(0);
    });
  });

  it('rejects a cross-scope StartRun without creating a Run', () => {
    type PlanRef = {
      readonly uri: string;
      readonly sha256: string;
      readonly schemaVersion: string;
      readonly planId: string;
      readonly planVersion: string;
    };
    type RunList = {
      readonly items?: ReadonlyArray<{ readonly runId?: string }>;
    };
    const session = resolveLiveWorkspaceSession();
    const apiBaseUrl = String(Cypress.env('apiBaseUrl'));
    const bearer = String(Cypress.env('apiBearerToken'));
    const headers = { Authorization: `Bearer ${bearer}` };
    const runListUrl = `${apiBaseUrl}/runs?${new URLSearchParams(session).toString()}`;
    let authorizedRunIds: string[] = [];
    let planRef: PlanRef | undefined;

    seedLiveSelectedClosureDraft({
      authoringGenerated: true,
      terminalTransformPreview: true,
      title: 'DVT cross-scope StartRun guard',
    });
    cy.intercept('POST', '**/plans/preview').as('crossScopePreview');
    visitWithLiveWorkspaceSession('/canvas');
    getVisibleCanvasNode('dvt-transform-1').should('be.visible');
    selectCanvasClosure(['dvt-transform-1']);
    clickPreviewExecutionPlanFromOperationalDrawer();

    cy.wait('@crossScopePreview', { timeout: 30_000 }).then((interception) => {
      expect(interception.response?.statusCode).to.equal(200);
      planRef = (interception.response?.body as { readonly planRef?: PlanRef }).planRef;
      expect(planRef?.sha256).to.match(/^[a-f0-9]{64}$/);
      expect(planRef?.planId).to.be.a('string').and.not.to.equal('');
    });
    cy.request({ method: 'GET', url: runListUrl, headers, auth: { bearer } }).then((response) => {
      expect(response.status).to.equal(200);
      authorizedRunIds = ((response.body as RunList).items ?? [])
        .flatMap(({ runId }) => (runId === undefined ? [] : [runId]))
        .sort();
    });
    cy.then(() => {
      expect(planRef).not.to.equal(undefined);
      return cy.request({
        method: 'POST',
        url: `${apiBaseUrl}/runs/start`,
        headers,
        auth: { bearer },
        failOnStatusCode: false,
        body: {
          tenantId: session.tenantId,
          projectId: `${session.projectId}-other`,
          environmentId: session.environmentId,
          targetAdapter: 'temporal',
          selection: { mode: 'explicit', nodeIds: ['dvt-transform-1'] },
          planRef,
        },
      });
    }).then((response) => {
      expect(response.status).to.equal(403);
      expect(response.body).to.deep.equal({
        error: { type: 'forbidden', reason: 'project_not_granted' },
      });
      expect(JSON.stringify(response.body)).not.to.contain(planRef!.sha256);
      expect(JSON.stringify(response.body)).not.to.contain(planRef!.planId);
    });
    cy.request({ method: 'GET', url: runListUrl, headers, auth: { bearer } }).then((response) => {
      expect(response.status).to.equal(200);
      const currentRunIds = ((response.body as RunList).items ?? [])
        .flatMap(({ runId }) => (runId === undefined ? [] : [runId]))
        .sort();
      expect(currentRunIds).to.deep.equal(authorizedRunIds);
    });
  });
});
