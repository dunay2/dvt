/**
 * Owned concern: prove terminal DVT Transform Preview through the live protected
 * draft, PreviewPlan, Planner, plan store, and executability-validation rails.
 */
import {
  DVT_POSTGRES_OPERATIONAL_WORKLOAD_REQUIRED_CAPABILITY,
  KNOWN_STEP_KINDS,
} from '@dvt/contracts';

import {
  clickPreviewExecutionPlanFromOperationalDrawer,
  getVisibleCanvasNode,
  selectCanvasClosure,
} from '../../support/canvasExecutionSelection';
import { resetE2eApiStubs } from '../../support/e2eApiStub';
import {
  hasLiveProtectedRuntimeEnv,
  seedLiveSelectedClosureDraft,
  visitWithLiveWorkspaceSession,
} from '../../support/liveProtectedRuntime';

type PreviewRejectedEnvelope = {
  readonly error?: {
    readonly details?: {
      readonly kind?: string;
      readonly persisted?: {
        readonly planRecordId?: string;
        readonly canonicalPlanSha256?: string;
      };
      readonly plan?: {
        readonly metadata?: { readonly planId?: string };
        readonly steps?: ReadonlyArray<{
          readonly stepId?: string;
          readonly kind?: string;
          readonly dependsOn?: readonly string[];
        }>;
      };
      readonly planRef?: { readonly planId?: string; readonly uri?: string };
      readonly validation?: {
        readonly status?: string;
        readonly code?: string;
        readonly cause?: string;
      };
    };
  };
};

describe('DVT terminal Transform Preview live', () => {
  beforeEach(function () {
    if (!hasLiveProtectedRuntimeEnv()) {
      this.skip();
    }
    resetE2eApiStubs();
  });

  it('persists one protected workload and exposes the real missing executor capability', () => {
    seedLiveSelectedClosureDraft({
      authoringGenerated: true,
      terminalTransformPreview: true,
      title: 'DVT terminal Transform Preview',
    });
    cy.intercept('POST', '**/plans/preview', (request) => {
      request.alias = 'dvtTerminalTransformPreview';
      expect(request.body).not.to.have.property('graphSource');
      expect(request.body.previewProfile).to.equal('planner-generic-v1');
      expect(request.body.persist).to.equal(true);
      expect(request.body.selection).to.deep.equal({
        mode: 'upstream',
        nodeIds: ['dvt-transform-1'],
      });
      expect(request.body.provenance).to.deep.equal({
        kind: 'dvt-protected-workspace-graph',
        canvasId: 'main-canvas',
      });
      request.continue();
    });

    visitWithLiveWorkspaceSession('/canvas');
    getVisibleCanvasNode('source-1').should('be.visible');
    getVisibleCanvasNode('dvt-transform-1')
      .should('be.visible')
      .find('[data-slot="canvas-node-shell"]')
      .should('be.visible');
    cy.get('.react-flow__node[data-id="sink-1"]').should('not.exist');

    selectCanvasClosure(['dvt-transform-1']);
    clickPreviewExecutionPlanFromOperationalDrawer();

    cy.wait('@dvtTerminalTransformPreview', { timeout: 30_000 }).then((interception) => {
      expect(interception.response?.statusCode).to.equal(422);
      const details = (interception.response?.body as PreviewRejectedEnvelope).error?.details;
      expect(details?.kind).to.equal('plan-invalid');
      expect(details?.validation).to.deep.include({
        status: 'ERROR',
        code: 'MISSING_CAPABILITY',
        cause: DVT_POSTGRES_OPERATIONAL_WORKLOAD_REQUIRED_CAPABILITY,
      });
      expect(details?.plan?.steps).to.have.length(1);
      expect(details?.plan?.steps?.[0]).to.deep.include({
        stepId: 'dvt-transform-1',
        kind: KNOWN_STEP_KINDS.DVT_POSTGRES_OPERATIONAL_WORKLOAD,
        dependsOn: [],
      });
      expect(details?.persisted?.planRecordId).to.equal(details?.plan?.metadata?.planId);
      expect(details?.persisted?.canonicalPlanSha256).to.match(/^[a-f0-9]{64}$/);
      expect(details?.planRef?.planId).to.equal(details?.plan?.metadata?.planId);
      expect(details?.planRef?.uri).to.match(/^dvt-plan:\/\//);
    });

    cy.get('[data-testid="plan-preview-modal"]', { timeout: 30_000 })
      .should('be.visible')
      .and('contain.text', 'MISSING_CAPABILITY')
      .and('contain.text', DVT_POSTGRES_OPERATIONAL_WORKLOAD_REQUIRED_CAPABILITY)
      .and('contain.text', 'main-canvas')
      .and('contain.text', KNOWN_STEP_KINDS.DVT_POSTGRES_OPERATIONAL_WORKLOAD);
    cy.get('[data-testid="plan-preview-modal"]')
      .find('ol')
      .filter((_, element) =>
        element.textContent?.includes(KNOWN_STEP_KINDS.DVT_POSTGRES_OPERATIONAL_WORKLOAD)
      )
      .children('li')
      .should('have.length', 1);
    cy.get('[data-slot="plan-preview-start-run"]').should('be.disabled');
  });
});
