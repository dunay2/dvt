/** Proves N-input Preview via visible import and Preview gestures, with real HTTP persistence. */
import {
  DVT_POSTGRES_INNER_JOIN_PROFILE_ID,
  DVT_POSTGRES_OPERATIONAL_WORKLOAD_REQUIRED_CAPABILITY,
} from '@dvt/contracts';

import documents from '../../../../../packages/@dvt/postgres-projection/test/fixtures/inner-join-documents.json';
import { exportProjectSnapshot } from '../../../src/app/views/canvas/canvasProjectSnapshot';
import { buildCanvasAuthoringDraft } from '../../support/canvasDraftAuthoring';
import {
  clickPreviewExecutionPlanFromOperationalDrawer,
  getVisibleCanvasNode,
  selectCanvasClosure,
} from '../../support/canvasExecutionSelection';
import { resetE2eApiStubs } from '../../support/e2eApiStub';
import {
  hasLiveProtectedRuntimeEnv,
  resolveLiveWorkspaceSession,
  seedLiveSelectedClosureDraft,
  visitWithLiveWorkspaceSession,
} from '../../support/liveProtectedRuntime';

describe('N-input DVT Preview live', () => {
  beforeEach(function () {
    if (!hasLiveProtectedRuntimeEnv()) this.skip();
    resetE2eApiStubs();
  });

  it('imports three real semantic inputs and persists exactly one workload through Preview', () => {
    const base = buildCanvasAuthoringDraft({
      authoringGenerated: true,
      terminalTransformPreview: true,
    });
    const semanticDocument = documents.three;
    const sourceTemplate = base.nodes.find((node) => node.role === 'input')!;
    const transformTemplate = base.nodes.find((node) => node.role === 'transform')!;
    const sources = semanticDocument.sidecar.relations.flatMap((relation) =>
      !('sourceRef' in relation)
        ? []
        : [
            {
              ...sourceTemplate,
              id: `source-${relation.displayName}`,
              name: relation.displayName,
              metadata: {
                schema: 'raw',
                tableName: relation.displayName,
                connectedSourceRef: relation.sourceRef,
                columns: semanticDocument.sidecar.fields
                  .filter((field) => field.relationId === relation.relationId)
                  .map((field) => ({ name: field.displayName, type: 'text' })),
              },
            },
          ]
    );
    const transform = {
      ...transformTemplate,
      id: 'transform-orders',
      name: 'Orders + Client + Details',
      metadata: { transformAuthoring: { version: 'v1', mode: 'substrait', semanticDocument } },
    };
    const nodes = [...sources, transform];
    const draft = {
      ...base,
      nodes,
      nodeIds: nodes.map((node) => node.id),
      nodePositions: Object.fromEntries(
        nodes.map((node, index) => [
          node.id,
          { x: index === 3 ? 500 : 40, y: index === 3 ? 240 : 40 + index * 220 },
        ])
      ),
      edges: sources.map((source) => ({
        id: `${source.id}-transform`,
        sourceId: source.id,
        targetId: transform.id,
        relation: 'lineage' as const,
      })),
    };
    const contents = exportProjectSnapshot({
      record: { draft, revision: 'initial', savedAt: '2026-09-14T00:00:00.000Z' },
      workspaceScope: { ...resolveLiveWorkspaceSession(), targetAdapter: 'temporal' },
      exportedAt: '2026-09-14T00:00:00.000Z',
    }).contents;

    seedLiveSelectedClosureDraft({ emptyCanvas: true });
    visitWithLiveWorkspaceSession('/canvas');
    cy.get('[data-slot="shell-workspace-menu-trigger"]').click();
    cy.get('[data-slot="canvas-workspace-import-input"]').selectFile(
      {
        contents: Cypress.Buffer.from(contents),
        fileName: 'join-preview.json',
        mimeType: 'application/json',
      },
      { force: true }
    );
    cy.get('body').type('{esc}');
    sources.forEach((source) => {
      getVisibleCanvasNode(source.id).should('exist');
    });
    getVisibleCanvasNode(transform.id).should('be.visible');

    cy.intercept('POST', '**/plans/preview', (request) => {
      expect(request.body).not.to.have.property('graphSource');
      expect(request.body.selection).to.deep.equal({ mode: 'upstream', nodeIds: [transform.id] });
      request.continue();
    }).as('joinPreview');
    selectCanvasClosure([transform.id]);
    clickPreviewExecutionPlanFromOperationalDrawer();
    cy.wait('@joinPreview', { timeout: 30_000 }).then(({ response }) => {
      expect(response?.statusCode).to.equal(422);
      const details = response?.body.error.details;
      expect(details.kind).to.equal('plan-invalid');
      expect(details.plan.steps).to.have.length(1);
      const workload = details.plan.steps[0].stepTypeConfig;
      expect(workload.targetProjection.profileId).to.equal(DVT_POSTGRES_INNER_JOIN_PROFILE_ID);
      expect(workload.graph.selectedNodeIds).to.deep.equal([...draft.nodeIds].sort());
      expect(workload.graph.selectedEdgeIds).to.deep.equal(
        draft.edges.map((edge) => edge.id).sort()
      );
      expect(workload.output.kind).to.equal('ephemeral-preview');
      expect(details.persisted.planRecordId).to.equal(details.plan.metadata.planId);
      expect(details.validation.cause).to.equal(
        DVT_POSTGRES_OPERATIONAL_WORKLOAD_REQUIRED_CAPABILITY
      );
    });
    cy.get('[data-testid="plan-preview-modal"]')
      .should('be.visible')
      .and('contain.text', 'source-order_details');
    cy.get('[data-slot="plan-preview-start-run"]').should('be.disabled');
  });
});
