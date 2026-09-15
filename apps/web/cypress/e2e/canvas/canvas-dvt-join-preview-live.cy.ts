/** Proves one N-input JOIN through the protected DVT PostgreSQL Run path. */
import { DVT_POSTGRES_INNER_JOIN_PROFILE_ID, KNOWN_STEP_KINDS } from '@dvt/contracts';

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
  readLiveRunEvents,
  readLiveRunSnapshot,
  resolveLiveWorkspaceSession,
  seedLiveSelectedClosureDraft,
  visitWithLiveWorkspaceSession,
} from '../../support/liveProtectedRuntime';

describe('N-input DVT Run live', () => {
  beforeEach(function () {
    if (!hasLiveProtectedRuntimeEnv()) this.skip();
    resetE2eApiStubs();
  });

  it('executes three semantic inputs as one workload and publishes the expected JOIN', () => {
    const targetSchemaValue = Cypress.env('postgresTargetSchema');
    if (typeof targetSchemaValue !== 'string' || targetSchemaValue.trim().length === 0) {
      throw new Error('Cypress env postgresTargetSchema is required for the N-input Run proof.');
    }
    const targetSchema = targetSchemaValue.trim();
    const targetRelation = 'joined_orders';
    let previewSha = '';
    const waitForCompletedRun = (runId: string, attempt = 0): Cypress.Chainable<void> =>
      readLiveRunSnapshot(runId).then((response) => {
        expect(response.status).to.equal(200);
        const status = String((response.body as { status?: unknown }).status ?? '').toLowerCase();
        if (status === 'completed') return;
        if (status === 'failed') throw new Error(`N-input DVT run ${runId} failed.`);
        if (attempt >= 60) throw new Error(`N-input DVT run ${runId} did not complete.`);
        return cy.wait(500).then(() => waitForCompletedRun(runId, attempt + 1));
      });

    const base = buildCanvasAuthoringDraft({
      authoringGenerated: true,
      terminalTransformPreview: true,
    });
    const semanticDocument = documents.three;
    const sourceConnectionRef = semanticDocument.sidecar.relations.flatMap((relation) =>
      'sourceRef' in relation ? [relation.sourceRef.connectionRef] : []
    )[0];
    if (sourceConnectionRef === undefined) {
      throw new Error('The N-input fixture requires one governed PostgreSQL connection.');
    }
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
      metadata: {
        config: {
          materialized: 'table',
          resultTarget: {
            schemaVersion: 'dvt-transform-result-target.v1',
            connectionRef: sourceConnectionRef,
            schema: targetSchema,
            relation: targetRelation,
          },
        },
        transformAuthoring: { version: 'v1', mode: 'substrait', semanticDocument },
      },
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
        fileName: 'join-run.json',
        mimeType: 'application/json',
      },
      { force: true }
    );
    cy.get('body').type('{esc}');
    sources.forEach((source) => getVisibleCanvasNode(source.id).should('exist'));
    getVisibleCanvasNode(transform.id).should('be.visible');

    cy.intercept('POST', '**/plans/preview', (request) => {
      expect(request.body).not.to.have.property('graphSource');
      expect(request.body.selection).to.deep.equal({ mode: 'upstream', nodeIds: [transform.id] });
      request.continue();
    }).as('joinPreview');
    selectCanvasClosure([transform.id]);
    clickPreviewExecutionPlanFromOperationalDrawer();
    cy.wait('@joinPreview', { timeout: 30_000 }).then(({ response }) => {
      expect(response?.statusCode).to.equal(200);
      const preview = response?.body as {
        readonly plan?: {
          readonly metadata?: { readonly planId?: string };
          readonly steps?: ReadonlyArray<{
            readonly kind?: string;
            readonly stepTypeConfig?: {
              readonly schemaVersion?: string;
              readonly targetProjection?: { readonly profileId?: string };
              readonly graph?: {
                readonly selectedNodeIds?: readonly string[];
                readonly selectedEdgeIds?: readonly string[];
              };
              readonly output?: { readonly kind?: string; readonly disposition?: string };
            };
          }>;
        };
        readonly planRef?: { readonly planId?: string; readonly sha256?: string };
      };
      expect(preview.plan?.steps).to.have.length(1);
      expect(preview.plan?.steps?.[0]?.kind).to.equal(
        KNOWN_STEP_KINDS.DVT_POSTGRES_OPERATIONAL_WORKLOAD
      );
      const workload = preview.plan?.steps?.[0]?.stepTypeConfig;
      expect(workload?.schemaVersion).to.equal('dvt-operational-workload.v2');
      expect(workload?.targetProjection?.profileId).to.equal(DVT_POSTGRES_INNER_JOIN_PROFILE_ID);
      expect(workload?.graph?.selectedNodeIds).to.deep.equal([...draft.nodeIds].sort());
      expect(workload?.graph?.selectedEdgeIds).to.deep.equal(
        draft.edges.map((edge) => edge.id).sort()
      );
      expect(workload?.output).to.deep.include({
        kind: 'transform-result',
        disposition: 'table',
      });
      expect(preview.planRef?.planId).to.equal(preview.plan?.metadata?.planId);
      previewSha = preview.planRef?.sha256 ?? '';
      expect(previewSha).to.match(/^[a-f0-9]{64}$/);
    });
    cy.get('[data-testid="plan-preview-modal"]')
      .should('be.visible')
      .and('contain.text', 'source-order_details');
    cy.get('[data-slot="plan-preview-start-run"]').should('be.enabled').click();

    cy.location('pathname', { timeout: 20_000 }).should('match', /^\/runs\/[^/]+$/);
    cy.location('pathname').then((pathname) => {
      const runId = pathname.split('/').pop();
      expect(runId).to.be.a('string').and.not.to.equal('');

      return waitForCompletedRun(runId!).then(() => {
        readLiveRunEvents(runId!).then((response) => {
          expect(response.status).to.equal(200);
          const completedStep = (
            response.body as {
              readonly items?: ReadonlyArray<{
                readonly eventType?: string;
                readonly payload?: {
                  readonly resultEvidence?: {
                    readonly evidenceType?: string;
                    readonly plan?: { readonly sha256?: string };
                    readonly rowsWritten?: number;
                  };
                };
              }>;
            }
          ).items?.find((event) => event.eventType === 'StepCompleted');
          const evidence = completedStep?.payload?.resultEvidence;
          expect(evidence?.evidenceType).to.equal('dvt-postgres-publication');
          expect(evidence?.plan?.sha256).to.equal(previewSha);
          expect(evidence?.rowsWritten).to.equal(3);
        });
      });
    });

    cy.get('[data-slot="run-itinerary-card"]', { timeout: 30_000 })
      .should('be.visible')
      .and('contain.text', 'Completada');
    cy.get('[data-slot="run-result-tab"]').click();
    cy.get('[data-slot="run-dvt-postgres-publication-card"]')
      .should('be.visible')
      .and('contain.text', `${targetSchema}.${targetRelation}`);

    const sampleQuery = new URLSearchParams({
      ...resolveLiveWorkspaceSession(),
      objectId: `relation/dvt/${targetSchema}/${targetRelation}`,
      limit: '10',
    });
    cy.request({
      method: 'GET',
      url: `${String(Cypress.env('apiBaseUrl'))}/workspace/warehouse/connections/${encodeURIComponent(sourceConnectionRef.connectionId)}/source-data-sample?${sampleQuery.toString()}`,
      headers: { Authorization: `Bearer ${String(Cypress.env('apiBearerToken'))}` },
      auth: { bearer: String(Cypress.env('apiBearerToken')) },
    }).then((response) => {
      expect(response.status).to.equal(200);
      const sample = response.body as {
        readonly columns: ReadonlyArray<{ readonly name: string }>;
        readonly rows: ReadonlyArray<{ readonly values: readonly (string | null)[] }>;
      };
      expect(sample.columns.map(({ name }) => name)).to.deep.equal([
        'order_id',
        'client_id',
        'client_client_id',
        'country',
        'product',
      ]);
      expect(sample.rows.map(({ values }) => [...values]).sort()).to.deep.equal(
        [
          ['1', 'C-001', 'C-001', 'ES', 'Book'],
          ['2', 'C-014', 'C-014', 'US', 'Pen'],
          ['3', 'C-001', 'C-001', 'ES', 'Laptop'],
        ].sort()
      );
    });
  });
});
