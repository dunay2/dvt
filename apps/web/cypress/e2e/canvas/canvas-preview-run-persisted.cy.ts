import { canvasViewCopy } from '../../../src/app/views/canvas/canvasCopyCatalog';
import {
  clickButtonNatively,
  clickPreviewExecutionPlanFromOperationalDrawer,
  selectCanvasClosure,
} from '../../support/canvasExecutionSelection';
import { waitForSelectedClosurePreviewArtifacts } from '../../support/canvasPreviewArtifacts';
import { getE2eApiCalls, waitForE2eApiCall } from '../../support/e2eApiStub';
import {
  assertPreviewPlanRequest,
  assertRunStartSelection,
  getLastStartRunRequest,
  stubAcceptedRunStart,
  stubCanvasRuntimeApis,
  stubPlanPreviewResponse,
  stubPreviewRunShellBootstrap,
  stubRunWorkspaceApis,
  stubSequentialRunStart,
  stubUnexpectedRunStart,
  visitCanvasWithSettledBootstrap,
} from '../../support/test/canvasPreviewRunPersisted';

describe('Canvas preview-run persisted path', () => {
  beforeEach(() => {
    stubPreviewRunShellBootstrap();
  });

  it('keeps preview and run scoped to the selected closure inside a larger canvas', () => {
    stubCanvasRuntimeApis({ includeLooseNode: true });
    stubRunWorkspaceApis('run_e2e_selected_1');
    stubPlanPreviewResponse({
      planRecordId: 'b'.repeat(64),
      persistedSha: 'e'.repeat(64),
      planRefSha: 'f'.repeat(64),
    });
    stubAcceptedRunStart('run_e2e_selected_1');

    visitCanvasWithSettledBootstrap();

    cy.contains('.react-flow__node', 'src_orders').should('be.visible');
    cy.contains('.react-flow__node', 'model_orders').should('be.visible');
    cy.contains('.react-flow__node', 'orders_dashboard').should('be.visible');
    cy.contains('.react-flow__node', 'orphan_metrics').should('be.visible');

    selectCanvasClosure(['src_orders', 'model_orders', 'orders_dashboard']);

    clickPreviewExecutionPlanFromOperationalDrawer();
    waitForSelectedClosurePreviewArtifacts();
    waitForE2eApiCall('/plans/preview', 'POST');
    assertPreviewPlanRequest();

    cy.get('[role="dialog"]')
      .should('be.visible')
      .within(() => {
        cy.contains('[data-slot="dialog-title"]', 'Execution Preview').should('be.visible');
        cy.contains(/Persisted preview summary/i)
          .scrollIntoView()
          .should('be.visible');
        cy.contains('Nodes').parent().should('contain.text', '3');
        cy.contains('Source tables').parent().should('contain.text', 'raw.orders');
        cy.contains('Sink tables').parent().should('contain.text', 'analytics.orders_daily');
      });
    clickButtonNatively('Start Run');

    waitForE2eApiCall('/runs/start', 'POST');
    assertRunStartSelection('f'.repeat(64));
    cy.location('pathname').should('eq', '/runs/run_e2e_selected_1');
    cy.contains('Run run_e2e_selected_1').should('exist');
  });

  it('starts run when persisted preview identity matches the active plan and can run again', () => {
    stubCanvasRuntimeApis();
    stubRunWorkspaceApis('run_e2e_1');
    stubRunWorkspaceApis('run_e2e_2');
    stubPlanPreviewResponse({
      planRecordId: 'b'.repeat(64),
      persistedSha: 'c'.repeat(64),
      planRefSha: 'd'.repeat(64),
    });
    stubSequentialRunStart();

    visitCanvasWithSettledBootstrap();
    cy.contains('.react-flow__node', 'src_orders').should('be.visible');
    cy.contains('.react-flow__node', 'model_orders').should('be.visible');
    cy.contains('.react-flow__node', 'orders_dashboard').should('be.visible');

    clickPreviewExecutionPlanFromOperationalDrawer();
    waitForSelectedClosurePreviewArtifacts();
    waitForE2eApiCall('/plans/preview', 'POST');
    assertPreviewPlanRequest();

    cy.get('[role="dialog"]')
      .should('be.visible')
      .within(() => {
        cy.contains('[data-slot="dialog-title"]', 'Execution Preview').should('be.visible');
        cy.contains(canvasViewCopy.planStatusPreviewReadyMessage).should('be.visible');
      });
    clickButtonNatively('Start Run');

    waitForE2eApiCall('/runs/start', 'POST');
    assertRunStartSelection('d'.repeat(64));
    cy.then(() => {
      expect(getLastStartRunRequest()?.planRef.planVersion).to.equal('v1');
    });
    cy.location('pathname').should('eq', '/runs/run_e2e_1');

    cy.contains('Run run_e2e_1').should('exist');
    cy.contains('Materialization evidence').should('not.exist');
    cy.contains('Failure diagnostics').should('exist');
    cy.contains('STEP_FAILURE').should('exist');

    cy.get('[data-slot="shell-workspace-menu-trigger"]').should('be.visible').click();
    cy.get('[data-slot="shell-menu-navigation-link"][href="/canvas"]').should('be.visible').click();
    cy.location('pathname').should('eq', '/canvas');

    clickPreviewExecutionPlanFromOperationalDrawer();
    waitForSelectedClosurePreviewArtifacts();
    cy.wrap(null).should(() => {
      expect(getE2eApiCalls('/plans/preview', 'POST')).to.have.length(2);
    });
    assertPreviewPlanRequest();

    cy.get('[role="dialog"]')
      .should('be.visible')
      .within(() => {
        cy.contains('[data-slot="dialog-title"]', 'Execution Preview').should('be.visible');
        cy.contains(canvasViewCopy.planStatusPreviewReadyMessage).should('be.visible');
      });
    clickButtonNatively('Start Run');

    cy.wrap(null).should(() => {
      expect(getE2eApiCalls('/runs/start', 'POST')).to.have.length(2);
    });
    assertRunStartSelection('d'.repeat(64));
    cy.location('pathname').should('eq', '/runs/run_e2e_2');

    cy.contains('Run run_e2e_2').should('exist');
    cy.contains('Failure diagnostics').should('exist');
    cy.contains('STEP_FAILURE').should('exist');
  });

  it('blocks run when persisted preview identity is not aligned with the active plan', () => {
    stubCanvasRuntimeApis();
    stubPlanPreviewResponse({
      planRecordId: 'plan-record-mismatch',
      persistedSha: 'd'.repeat(64),
      planRefSha: 'c'.repeat(64),
    });
    stubUnexpectedRunStart();

    visitCanvasWithSettledBootstrap();
    cy.contains('.react-flow__node', 'src_orders').should('be.visible');
    cy.contains('.react-flow__node', 'model_orders').should('be.visible');
    cy.contains('.react-flow__node', 'orders_dashboard').should('be.visible');

    clickPreviewExecutionPlanFromOperationalDrawer();
    waitForSelectedClosurePreviewArtifacts();
    waitForE2eApiCall('/plans/preview', 'POST');
    assertPreviewPlanRequest();

    cy.get('[role="dialog"]')
      .should('be.visible')
      .within(() => {
        cy.contains('[data-slot="dialog-title"]', 'Execution Preview').should('be.visible');
        cy.contains(canvasViewCopy.planStatusPreviewNotAlignedMessage).should('be.visible');
      });
    cy.get('[data-slot="canvas-toolbar-run-command"]').should('not.exist');
    cy.contains('button', 'Start Run').should('be.disabled');
    cy.then(() => {
      expect(getE2eApiCalls('/runs/start', 'POST')).to.have.length(0);
    });
  });
});
