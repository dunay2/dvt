/**
 * Owned concern: prove one protected terminal DVT Transform from persisted
 * Canvas revision through PreviewPlan, StartRun, Temporal and PostgreSQL.
 * @baseline ADR-0044: Structural rejection causes are stable; Web owns translated copy.
 * @decision Verify V1 responses and register admitted authoring consumers once in this runtime.
 * @consequence Unsupported output dispositions cannot expose Run or create an execution.
 * @version 1.0.0
 */
import { DVT_REJECTIONS, KNOWN_STEP_KINDS } from '@dvt/contracts';

// Existing saved-preview consumers share this runtime instead of bootstrapping another one.
import './canvas-relational-operation-execution.cy';
import './canvas-relational-workbench-chain-persistence.cy';
import './canvas-relational-workbench-cross.cy';
import './canvas-relational-tree-workbench.cy';
import './canvas-relational-workbench-union.cy';
import './canvas-relational-workbench-removal.cy';
import './canvas-relational-workbench-viewport.cy';
import './canvas-sort-fetch-data-navigation.cy';
import './canvas-model-chain-fields.cy';
import './canvas-column-lineage-mapping.cy';
import './canvas-transform-stage.cy';
import './canvas-dvt-join-preview-live.cy';
import './canvas-semantic-persistence-run-live.cy';
import './canvas-sql-progressive-live.cy';

import { APPLICATION_LANGUAGE_STORAGE_KEY } from '../../../src/app/stores/applicationLanguageStore';
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
  seedLiveSelectedClosureDraft,
  visitWithLiveWorkspaceSession,
} from '../../support/liveProtectedRuntime';
import { livePostgresDatabaseName } from '../../support/liveWarehouseSourceImport';
import { hoverWorkbenchCard } from '../../support/relationalWorkbench/pointer';

import { registerCanvasNodeDataActionsProof } from './canvasNodeDataActions.proof';
import {
  assertAuthoritativeLiveRunTimeline,
  interruptLiveRunEventFeed,
  type LiveRunEventIdentity,
} from './liveRunEventRecovery.proof';

function visitEnglishLiveCanvas(): void {
  visitWithLiveWorkspaceSession('/canvas', {
    onBeforeLoad(window) {
      window.localStorage.setItem(
        APPLICATION_LANGUAGE_STORAGE_KEY,
        JSON.stringify({ state: { language: 'en' }, version: 0 })
      );
    },
  });
}

registerCanvasNodeDataActionsProof();

describe('DVT terminal Transform Preview and Run live', () => {
  beforeEach(function () {
    if (!hasLiveProtectedRuntimeEnv())
      throw new Error('Terminal live proof requires protected runtime credentials.');
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
      readonly items?: ReadonlyArray<
        LiveRunEventIdentity & {
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
        }
      >;
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
      sourceDatabaseName: livePostgresDatabaseName(),
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

    visitEnglishLiveCanvas();
    getVisibleCanvasNode('source-1').should('be.visible');
    getVisibleCanvasNode('dvt-transform-1').should('be.visible');
    cy.intercept('GET', '**/source-data-sample?*').as('sourceLivePreview');
    hoverWorkbenchCard('.react-flow__node[data-id="source-1"] [data-slot="canvas-node-shell"]');
    getVisibleCanvasNode('source-1').find('[data-slot="canvas-node-execute"]').focus().click();
    cy.wait('@sourceLivePreview').then(({ response }) => {
      expect(response?.statusCode).to.equal(200);
      expect(response?.body.provenance).to.deep.include({
        mode: 'live',
        limit: 20,
        navigation: 'bounded-first-page',
      });
      expect(response?.body.rows).to.have.length(3);
    });
    cy.get('[data-slot="live-preview-facts"]')
      .should('contain.text', 'LIVE')
      .and('contain.text', 'PostgreSQL');
    cy.get('[data-slot="data-sample-refresh"]').click();
    cy.wait('@sourceLivePreview').its('response.statusCode').should('equal', 200);
    cy.intercept('GET', '**/transforms/dvt-transform-1/data-sample?*').as('transformLivePreview');
    hoverWorkbenchCard(
      '.react-flow__node[data-id="dvt-transform-1"] [data-slot="canvas-node-shell"]'
    );
    getVisibleCanvasNode('dvt-transform-1')
      .find('[data-slot="canvas-node-execute"]')
      .focus()
      .click();
    cy.wait('@transformLivePreview').then(({ response }) => {
      expect(response?.statusCode).to.equal(200);
      expect(response?.body.provenance).to.deep.include({
        mode: 'live',
        limit: 20,
        navigation: 'bounded-first-page',
      });
      expect(response?.body.provenance.sourceRefs).to.have.length(1);
      expect(response?.body.rows).to.have.length(3);
      expect(response?.body).not.to.have.property('sampledAt');
    });
    cy.get('[data-slot="live-preview-facts"]')
      .should('contain.text', 'LIVE')
      .and('contain.text', 'PostgreSQL');
    cy.get('[data-slot="data-sample-refresh"]').click();
    cy.wait('@transformLivePreview').its('response.statusCode').should('equal', 200);
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
    const assertEventFeedRecovery = interruptLiveRunEventFeed();
    cy.intercept('POST', '**/runs/start').as('terminalRunStart');
    cy.get('[data-slot="plan-preview-start-run"]').should('be.enabled').click();
    cy.wait('@terminalRunStart').then(({ response }) => {
      expect(response?.statusCode, response?.body?.error?.reason).to.equal(202);
    });

    cy.location('pathname', { timeout: 20_000 }).should('match', /^\/runs\/[^/]+$/);
    assertEventFeedRecovery();
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
          cy.get('[data-slot="run-itinerary-card"]', { timeout: 30_000 })
            .should('be.visible')
            .and('contain.text', 'completed');
          assertAuthoritativeLiveRunTimeline((response.body as RunEventResponse).items ?? []);
        });
      });
    });

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
      cy.go('back');
      cy.location('pathname', { timeout: 20_000 }).should('equal', '/canvas');
      cy.intercept('GET', `**/runs/${runId}?*`).as('reopenedDvtRunSnapshot');
      cy.visit(`/runs/${runId}`);
      cy.wait('@reopenedDvtRunSnapshot', { timeout: 30_000 })
        .its('response.statusCode')
        .should('equal', 200);
      cy.intercept('GET', `**/runs/${runId}?*`).as('reloadedDvtRunSnapshot');

      cy.reload();
      cy.wait('@reloadedDvtRunSnapshot', { timeout: 30_000 })
        .its('response.statusCode')
        .should('equal', 200);
      cy.get('[data-slot="run-itinerary-card"]', { timeout: 30_000 })
        .should('be.visible')
        .and('contain.text', 'completed');
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
      sourceDatabaseName: livePostgresDatabaseName(),
      title: 'DVT stale Preview guard',
    });
    cy.intercept('POST', '**/plans/preview').as('dvtPreviewBeforeEdit');
    cy.intercept('POST', '**/runs/start', (request) => {
      startRunRequests += 1;
      request.continue();
    });
    visitEnglishLiveCanvas();
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
      sourceDatabaseName: livePostgresDatabaseName(),
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
    visitEnglishLiveCanvas();

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
    cy.wait('@unsupportedDispositionPreview', { timeout: 30_000 }).then(({ response }) => {
      expect(response?.statusCode).to.equal(422);
      expect(response?.body.error.details.rejection.cause).to.equal(
        DVT_REJECTIONS.runDispositionUnsupported.cause
      );
    });
    cy.get('[data-testid="plan-preview-modal"]', { timeout: 30_000 })
      .should('be.visible')
      .and('contain.text', 'Run currently requires a table output. Change the output type.')
      .and('not.contain.text', DVT_REJECTIONS.runDispositionUnsupported.reason);
    cy.get('[data-slot="plan-preview-start-run"]').should('not.exist');
    cy.get('[data-slot="shell-run-command"]').should('be.disabled');
    cy.then(() => {
      expect(startRunRequests).to.equal(0);
    });
  });
});
