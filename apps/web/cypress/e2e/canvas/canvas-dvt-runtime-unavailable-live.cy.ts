/**
 * Owned concern: prove native Canvas behavior when real StartRun execution
 * capacity is unavailable.
 */
import {
  clickPreviewExecutionPlanFromOperationalDrawer,
  getVisibleCanvasNode,
  openCanvasNodeOperations,
  selectCanvasClosure,
} from '../../support/canvasExecutionSelection';
import { resetE2eApiStubs } from '../../support/e2eApiStub';
import {
  hasLiveProtectedRuntimeEnv,
  readLiveRunIds,
  seedLiveSelectedClosureDraft,
  visitWithLiveWorkspaceSession,
} from '../../support/liveProtectedRuntime';

describe('DVT runtime-unavailable Canvas boundary live', () => {
  beforeEach(function () {
    if (!hasLiveProtectedRuntimeEnv()) this.skip();
    resetE2eApiStubs();
  });

  it('preserves authoring and creates no Run when worker readiness is unavailable', () => {
    const targetSchema = String(Cypress.env('postgresTargetSchema')).trim();
    expect(targetSchema).not.to.equal('');
    let runIdsBefore: string[] = [];

    seedLiveSelectedClosureDraft({
      authoringGenerated: true,
      terminalTransformPreview: true,
      terminalTransformResultTarget: {
        schema: targetSchema,
        relation: 'runtime_unavailable_result',
      },
      title: 'DVT runtime-unavailable guard',
    });
    cy.intercept('POST', '**/plans/preview').as('runtimeUnavailablePreview');
    cy.intercept('POST', '**/runs/start').as('runtimeUnavailableStartRun');
    visitWithLiveWorkspaceSession('/canvas');

    getVisibleCanvasNode('dvt-transform-1').should('be.visible');
    readLiveRunIds().then((runIds) => {
      runIdsBefore = runIds;
    });
    selectCanvasClosure(['dvt-transform-1']);
    clickPreviewExecutionPlanFromOperationalDrawer();

    cy.wait('@runtimeUnavailablePreview', { timeout: 30_000 })
      .its('response.statusCode')
      .should('equal', 200);
    cy.get('[data-slot="plan-preview-start-run"]').should('be.enabled').click();
    cy.wait('@runtimeUnavailableStartRun', { timeout: 30_000 }).then((interception) => {
      expect(interception.response?.statusCode).to.equal(503);
      expect(interception.response?.body).to.deep.equal({
        error: {
          type: 'service_unavailable',
          reason: 'capacity_signal_unavailable',
        },
      });
      expect(interception.response?.headers['retry-after']).to.equal('30');
    });

    cy.get('[data-sonner-toast]')
      .should('be.visible')
      .and(
        'contain.text',
        'Execution runtime readiness is unavailable. Canvas authoring remains available; try again later.'
      );
    readLiveRunIds().then((runIdsAfter) => {
      expect(runIdsAfter).to.deep.equal(runIdsBefore);
    });

    cy.get('[data-testid="plan-preview-modal"]').should('not.exist');
    openCanvasNodeOperations('dvt-transform-1');
    cy.contains('[data-slot="canvas-node-context-menu-item"]', /^(Properties|Propiedades)$/)
      .should('be.visible')
      .click();
    cy.get('[data-slot="canvas-node-workbench-overlay"]', { timeout: 20_000 })
      .should('be.visible')
      .find('input[name="node-name"]')
      .should('be.enabled');
  });
});
