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
  stubPlanPreviewResponse,
  stubPlanRejectedPreview,
  stubPlanRejectedStartRun,
  stubPreviewRunShellBootstrap,
  visitCanvasWithSettledBootstrap,
} from '../../support/test/canvasPreviewRunPersisted';

describe('Canvas preview-run rejection guidance', () => {
  beforeEach(() => {
    stubPreviewRunShellBootstrap();
  });

  for (const cause of ['dependency_gap', 'selected_node_missing', 'cycle_detected'] as const) {
    it(`surfaces ${cause} as explicit re-plan guidance during preview`, () => {
      stubCanvasRuntimeApis({ includeLooseNode: true });
      stubPlanRejectedPreview(cause);

      visitCanvasWithSettledBootstrap();

      selectCanvasClosure(['src_orders', 'model_orders', 'orders_dashboard']);

      clickPreviewExecutionPlanFromOperationalDrawer();
      waitForSelectedClosurePreviewArtifacts();
      waitForE2eApiCall('/plans/preview', 'POST');
      assertPreviewPlanRequest();

      cy.contains(PLAN_REJECTION_MESSAGES[cause]).should('be.visible');
      cy.contains('Execution Preview').should('not.exist');
      cy.location('pathname').should('eq', '/canvas');
      cy.then(() => {
        expect(getE2eApiCalls('/runs/start', 'POST')).to.have.length(0);
      });
    });
  }

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

    cy.contains('Execution Preview').should('be.visible');
    clickButtonNatively('Start Run');

    waitForE2eApiCall('/runs/start', 'POST');
    assertRunStartSelection('0'.repeat(64));
    cy.contains(PLAN_REJECTION_MESSAGES.graph_source_selection_mismatch).should('exist');
    cy.location('pathname').should('eq', '/canvas');
    cy.contains('Execution Preview').should('be.visible');
  });
});
