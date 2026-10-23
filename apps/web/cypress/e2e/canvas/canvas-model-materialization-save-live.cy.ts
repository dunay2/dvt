/** Prove materialization persistence and current-draft diagnostics through the protected API. */
import { DVT_REJECTIONS, type WorkspaceGraphAuthoringDraft } from '@dvt/contracts';

import { APPLICATION_LANGUAGE_STORAGE_KEY } from '../../../src/app/stores/applicationLanguageStore';
import {
  clickPreviewExecutionPlanFromOperationalDrawer,
  getVisibleCanvasNode,
  selectCanvasClosure,
} from '../../support/canvasExecutionSelection';
import { resetE2eApiStubs } from '../../support/e2eApiStub';
import { seedLiveSelectedClosureDraft } from '../../support/liveCanvasDraftAuthoring';
import {
  hasLiveProtectedRuntimeEnv,
  readLiveGraphDraft,
  visitWithLiveWorkspaceSession,
} from '../../support/liveProtectedRuntime';
import { livePostgresDatabaseName } from '../../support/liveWarehouseSourceImport';

function visitSavedModel(materialized: string): void {
  visitWithLiveWorkspaceSession('/canvas', {
    onBeforeLoad(window) {
      window.localStorage.setItem(
        APPLICATION_LANGUAGE_STORAGE_KEY,
        JSON.stringify({ state: { language: 'en' }, version: 0 })
      );
    },
  });
  cy.get('.react-flow__pane', { timeout: 20_000 }).should('be.visible');
  cy.get('.react-flow__controls-fitview').click();
  getVisibleCanvasNode('dvt-transform-1')
    .find('[data-slot="graph-node-materialization"]')
    .should('have.text', materialized);
}

function changeAndReadSavedType(materialized: string): void {
  getVisibleCanvasNode('dvt-transform-1').find('[data-slot="graph-node-materialization"]').click();
  cy.get('[role="menuitemradio"]')
    .contains(new RegExp(`^${materialized}$`))
    .click();
  getVisibleCanvasNode('dvt-transform-1')
    .find('[data-slot="graph-node-materialization"]')
    .should('have.text', materialized);
  cy.get('[data-slot="canvas-draft-save-status"]', { timeout: 20_000 }).should('not.exist');
  readLiveGraphDraft().then((response) => {
    expect(response.status).to.equal(200);
    const draft = (response.body as { record: { draft: WorkspaceGraphAuthoringDraft } }).record
      .draft;
    expect(draft.nodes.find((node) => node.id === 'dvt-transform-1')?.metadata?.config).to.include({
      materialized,
    });
  });
}

describe('Protected model save and readiness', () => {
  it('saves every authored type, reloads it and replaces the previous rejection without starting Run', () => {
    if (!hasLiveProtectedRuntimeEnv())
      throw new Error('Materialization proof requires protected runtime credentials.');
    resetE2eApiStubs();
    cy.viewport(1600, 1000);
    let startRequests = 0;
    seedLiveSelectedClosureDraft({
      authoringGenerated: true,
      terminalTransformPreview: true,
      sourceDatabaseName: livePostgresDatabaseName(),
      terminalTransformResultTarget: { schema: 'public', relation: 'save_readiness_proof' },
      title: 'Materialization save and current readiness',
    });
    cy.intercept('POST', '**/plans/preview').as('preview');
    cy.intercept('POST', '**/runs/start', (request) => {
      startRequests += 1;
      request.continue();
    });
    visitSavedModel('table');
    changeAndReadSavedType('view');
    visitSavedModel('view');
    selectCanvasClosure(['dvt-transform-1']);
    clickPreviewExecutionPlanFromOperationalDrawer();
    cy.wait('@preview', { timeout: 30_000 }).then(({ response }) => {
      expect(response?.statusCode).to.equal(422);
      expect(response?.body.error.details.rejection.cause).to.equal(
        DVT_REJECTIONS.runDispositionUnsupported.cause
      );
    });
    cy.get('[data-testid="plan-preview-modal"]').should(
      'contain.text',
      'This result type can be saved'
    );
    cy.get('[data-testid="plan-preview-modal"]')
      .contains('button', /^(Close|Cerrar)$/)
      .click();
    changeAndReadSavedType('ephemeral');
    cy.get('[data-slot="bottom-operational-drawer"]')
      .should('not.contain.text', 'This result type can be saved')
      .and('not.contain.text', 'Authorization denied');
    visitSavedModel('ephemeral');
    changeAndReadSavedType('table');
    visitSavedModel('table');
    selectCanvasClosure(['dvt-transform-1']);
    clickPreviewExecutionPlanFromOperationalDrawer();
    cy.wait('@preview', { timeout: 30_000 }).then(({ response }) => {
      expect(response?.statusCode).to.equal(422);
      expect(response?.body.error.details.rejection.cause).to.equal(
        DVT_REJECTIONS.runTargetInvalid.cause
      );
    });
    cy.get('[data-testid="plan-preview-modal"]').should(
      'contain.text',
      'Configure a valid output connection, schema and table'
    );
    cy.get('[data-slot="shell-run-command"]').should('be.disabled');
    cy.then(() => expect(startRequests).to.equal(0));
    cy.screenshot('all-materializations-saved-current-rejection');
  });
});
