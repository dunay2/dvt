import { resolveCanvasViewCopy } from '../../../src/app/views/canvas/copy';
import {
  clickButtonNatively,
  clickPreviewExecutionPlanFromOperationalDrawer,
  selectCanvasClosure,
} from '../../support/canvasExecutionSelection';
import { waitForSelectedClosurePreviewArtifacts } from '../../support/canvasPreviewArtifacts';
import { getE2eApiCalls, waitForE2eApiCall } from '../../support/e2eApiStub';
import {
  PLAN_REJECTION_MESSAGES,
  assertPreviewPlanRequest,
  assertRunStartSelection,
  stubCanvasRuntimeApis,
  stubPlanInvalidPreview,
  stubPlanPreviewResponse,
  stubSelectionRejectedPreview,
  stubPlanRejectedStartRun,
  stubPreviewRunShellBootstrap,
  stubUnexpectedRunStart,
  visitCanvasWithSettledBootstrap,
} from '../../support/test/canvasPreviewRunPersisted';

describe('Canvas preview-run rejection guidance', () => {
  beforeEach(() => {
    stubPreviewRunShellBootstrap();
  });

  it('renders a typed selection rejection without fabricated preview identity or run command', () => {
    stubCanvasRuntimeApis({ includeLooseNode: true });
    stubSelectionRejectedPreview('dependency_gap');
    stubUnexpectedRunStart();

    visitCanvasWithSettledBootstrap();

    selectCanvasClosure(['src_orders', 'model_orders', 'orders_dashboard']);

    clickPreviewExecutionPlanFromOperationalDrawer();
    waitForSelectedClosurePreviewArtifacts();
    waitForE2eApiCall('/plans/preview', 'POST');
    assertPreviewPlanRequest();

    cy.window({ log: false }).then((window) => {
      const copy = resolveCanvasViewCopy(
        window.navigator.language || window.document.documentElement.lang
      );

      cy.get('[data-testid="plan-preview-modal"]').within(() => {
        cy.contains(copy.planPreviewSelectionRejectedTitle).should('be.visible');
        cy.contains(PLAN_REJECTION_MESSAGES.dependency_gap).should('be.visible');
        cy.contains('REJECTED').should('be.visible');
        cy.contains('dependency_gap').should('be.visible');
        cy.contains('Execution Preview identity').should('not.exist');
        cy.contains('button', 'Start Run').should('not.exist');
      });
      cy.contains(copy.planUnableToCreateMessage).should('not.exist');
    });
    cy.get('body').type('{esc}');
    cy.get('[data-testid="plan-preview-modal"]').should('not.exist');
    cy.get('[data-slot="shell-run-command"]').should('be.disabled');
    cy.get('[data-slot="canvas-toolbar-run-command"]').should('not.exist');
    cy.location('pathname').should('eq', '/canvas');
    cy.then(() => {
      expect(getE2eApiCalls('/runs/start', 'POST')).to.have.length(0);
    });
  });

  it('renders an invalid persisted preview with exact identity and blocks Start Run', () => {
    stubCanvasRuntimeApis({ includeLooseNode: true });
    const preview = stubPlanInvalidPreview({
      planRecordId: 'c'.repeat(64),
      persistedSha: 'd'.repeat(64),
      planRefSha: 'e'.repeat(64),
    });
    stubUnexpectedRunStart();

    visitCanvasWithSettledBootstrap();

    selectCanvasClosure(['src_orders', 'model_orders', 'orders_dashboard']);

    clickPreviewExecutionPlanFromOperationalDrawer();
    waitForSelectedClosurePreviewArtifacts();
    waitForE2eApiCall('/plans/preview', 'POST');
    assertPreviewPlanRequest();

    cy.window({ log: false }).then((window) => {
      const copy = resolveCanvasViewCopy(
        window.navigator.language || window.document.documentElement.lang
      );

      cy.get('[data-testid="plan-preview-modal"]').within(() => {
        cy.contains(copy.planPreviewPlanInvalidTitle).should('be.visible');
        cy.contains(preview.plan.metadata.planId).should('be.visible');
        cy.contains('MISSING_CAPABILITY').should('be.visible');
        cy.contains('executor.dbt').should('be.visible');
        cy.contains(preview.planRef.uri).scrollIntoView().should('be.visible');
        cy.contains(preview.persisted.planRecordId).scrollIntoView().should('be.visible');
        cy.contains('button', 'Start Run').should('be.disabled');
      });
      cy.contains(copy.planUnableToCreateMessage).should('not.exist');
    });
    cy.get('body').type('{esc}');
    cy.get('[data-testid="plan-preview-modal"]').should('not.exist');
    cy.get('[data-slot="shell-run-command"]').should('be.disabled');
    cy.get('[data-slot="canvas-toolbar-run-command"]').should('not.exist');
    cy.then(() => {
      expect(getE2eApiCalls('/runs/start', 'POST')).to.have.length(0);
    });
  });

  it('surfaces graph_source_selection_mismatch from protected start-run as explicit re-plan guidance', () => {
    stubCanvasRuntimeApis({ includeLooseNode: true });
    stubPlanPreviewResponse({
      planRecordId: 'b'.repeat(64),
      persistedSha: 'f'.repeat(64),
      planRefSha: '0'.repeat(64),
    });
    stubPlanRejectedStartRun('graph_source_selection_mismatch');

    visitCanvasWithSettledBootstrap();

    selectCanvasClosure(['src_orders', 'model_orders', 'orders_dashboard']);

    clickPreviewExecutionPlanFromOperationalDrawer();
    waitForSelectedClosurePreviewArtifacts();
    waitForE2eApiCall('/plans/preview', 'POST');
    assertPreviewPlanRequest();

    cy.contains('[data-slot="dialog-title"]', 'Execution Preview').should('be.visible');
    clickButtonNatively('Start Run');

    waitForE2eApiCall('/runs/start', 'POST');
    assertRunStartSelection('0'.repeat(64));
    cy.contains(PLAN_REJECTION_MESSAGES.graph_source_selection_mismatch).should('exist');
    cy.location('pathname').should('eq', '/canvas');
    cy.contains('[data-slot="dialog-title"]', 'Execution Preview').should('be.visible');
  });
});
