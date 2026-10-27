/**
 * Owned concern: prove protected JOIN publication and publication-bound Run rows.
 * @baseline ADR-0066 and GH-3021: immutable Run evidence does not promise historical rows.
 * @decision Author A and B through public UI in a newly created, authorized workspace.
 * @consequence Real source rows, rendered samples and old-token rejection share one oracle.
 * @version 1.0.0
 */
import {
  DVT_POSTGRES_JOIN_PROFILE_ID,
  DvtPostgresPublicationEvidenceSchema,
  KNOWN_STEP_KINDS,
  WorkspaceGraphAuthoringDraftSchema,
  type DvtPostgresPublicationEvidence,
  type WorkspaceGraphDraftScope,
} from '@dvt/contracts';

import documents from '../../../../../packages/@dvt/postgres-projection/test/fixtures/inner-join-documents.json';
import { APPLICATION_LANGUAGE_STORAGE_KEY } from '../../../src/app/stores/applicationLanguageStore';
import { exportProjectSnapshot } from '../../../src/app/views/canvas/canvasProjectSnapshot';
import { runPublicationSampleCopy } from '../../../src/app/views/runs/runPublicationSampleCopy';
import { buildCanvasAuthoringDraft } from '../../support/canvasDrafts/buildCanvasAuthoringDraft';
import {
  clickPreviewExecutionPlanFromOperationalDrawer,
  getVisibleCanvasNode,
  selectCanvasClosure,
} from '../../support/canvasExecutionSelection';
import { getVisibleCanvasNodeByCardTitle } from '../../support/canvasGraphAuthoring';
import { resetE2eApiStubs } from '../../support/e2eApiStub';
import { seedLiveSelectedClosureDraft } from '../../support/liveCanvasDraftAuthoring';
import {
  hasLiveProtectedRuntimeEnv,
  readLiveGraphDraft,
  readLiveRunEvents,
  readLiveRunSnapshot,
  resolveLiveWorkspaceSession,
  visitWithLiveWorkspaceSession,
} from '../../support/liveProtectedRuntime';
import { livePostgresDatabaseName } from '../../support/liveWarehouseSourceImport';
import {
  createPublicationWorkspace,
  runPublicationModel,
  loadPublicationRows,
  publicationRows,
  transformInspector,
  writePublicationFormula,
} from '../../support/postgresPublicationFlow';
import {
  editWorkbenchInspector,
  openWorkbenchModel,
  openWorkbenchProperties,
} from '../../support/relationalWorkbench/navigation';

describe('N-input DVT Run live', () => {
  beforeEach(function () {
    if (!hasLiveProtectedRuntimeEnv()) this.skip();
    resetE2eApiStubs();
  });

  it('authors two inputs, publishes A then B, and never presents B rows as reopened A', () => {
    let scope: WorkspaceGraphDraftScope;
    let connectionId = '';
    let modelId = '';
    let first: { runId: string; evidence: DvtPostgresPublicationEvidence };
    let samples = 0;
    const targetSchema: unknown = Cypress.env('postgresTargetSchema');
    if (typeof targetSchema !== 'string' || targetSchema.trim().length === 0)
      throw new Error('Cypress env postgresTargetSchema is required for publication proof.');
    const targetRelation = 'pcv1_result';
    createPublicationWorkspace('PCV1 publication').then((workspace) => {
      scope = workspace.scope;
      connectionId = workspace.connectionId;
      modelId = workspace.modelId;
    });
    cy.then(() => {
      openWorkbenchProperties(modelId);
      cy.get('select[name="dvt-transform-materialization"]').select('table');
      cy.get('select[name="dvt-transform-result-connection"]').select(connectionId);
      cy.get('input[name="dvt-transform-result-schema"]').clear().type(targetSchema);
      cy.get('input[name="dvt-transform-result-relation"]').clear().type(targetRelation);
      cy.contains('[data-slot="canvas-node-workbench-panel"] button', /^Apply$/).click();
      cy.get('[data-slot="canvas-node-workbench-close"]').click();
    });
    cy.then(() => openWorkbenchModel(modelId));
    cy.get('[data-slot="canvas-model-save-status"]').should('have.text', 'Synced');
    cy.then(() => readLiveGraphDraft(scope)).then(({ status, body }) => {
      expect(status).to.equal(200);
      const draft = WorkspaceGraphAuthoringDraftSchema.parse(
        (body as { record: { draft: unknown } }).record.draft
      );
      expect(draft.nodes.find((node) => node.id === modelId)?.metadata?.config).to.deep.include({
        materialized: 'table',
        resultTarget: {
          schemaVersion: 'dvt-transform-result-target.v1',
          connectionRef: { schemaVersion: 'connection-ref.v1', connectionId, provider: 'postgres' },
          schema: targetSchema,
          relation: targetRelation,
        },
      });
    });
    cy.reload();
    cy.then(() => {
      getVisibleCanvasNodeByCardTitle('Model 1').should('have.attr', 'data-id', modelId);
      openWorkbenchModel(modelId);
    });
    cy.get('[data-slot="canvas-model-save-status"]').should('have.text', 'Synced');
    cy.get('[data-operator="project"]').should('have.length', 1).click();
    cy.get(transformInspector)
      .find('[data-slot="relation-output-field"]')
      .should('contain.text', 'customer_clean');
    cy.get(transformInspector).find('[data-slot="canvas-operation-tree-tab"]').click();
    cy.get(transformInspector)
      .find('[data-slot="canvas-relational-expression-tree"]')
      .should('contain.text', 'TRIM');
    cy.get(transformInspector)
      .find('[data-slot="canvas-relational-edit"]')
      .should('have.attr', 'aria-pressed', 'false');
    cy.get('[data-slot="canvas-model-tab-close"]').click();
    cy.intercept('GET', '**/source-data-sample?*', (request) => {
      samples += 1;
      const query = new URL(request.url).searchParams;
      expect(query.get('projectId')).to.equal(scope.projectId);
      expect(query.get('environmentId')).to.equal(scope.environmentId);
      request.continue();
    }).as('publicationSample');
    cy.then(() => runPublicationModel(modelId, scope)).then((run) => {
      first = run;
      expect(run.evidence.target).to.deep.include({
        schema: targetSchema,
        relation: targetRelation,
      });
      expect(samples, 'Opening a Run does not acquire rows').to.equal(0);
      loadPublicationRows(run.evidence.publication.token, publicationRows);
    });
    cy.visit('/canvas');
    cy.then(() => {
      getVisibleCanvasNodeByCardTitle('Model 1').should('have.attr', 'data-id', modelId);
      openWorkbenchModel(modelId);
    });
    cy.get('[data-operator="project"]').should('have.length', 1).click();
    editWorkbenchInspector(transformInspector);
    cy.contains(`${transformInspector} [data-slot="canvas-derived-output"]`, 'customer_clean')
      .find('button')
      .click();
    writePublicationFormula('UPPER(TRIM("customer_name"))');
    cy.get('[data-slot="canvas-model-save-status"]').should('have.text', 'Synced');
    cy.get('[data-slot="canvas-model-tab-close"]').click();
    cy.then(() => runPublicationModel(modelId, scope)).then((second) => {
      expect(second.runId).not.to.equal(first.runId);
      expect(second.evidence.plan.sha256).not.to.equal(first.evidence.plan.sha256);
      expect(second.evidence.publication.token).not.to.equal(first.evidence.publication.token);
      expect(second.evidence.publication.predecessorToken).to.equal(
        first.evidence.publication.token
      );
      expect(second.evidence.target).to.deep.equal(first.evidence.target);
      loadPublicationRows(second.evidence.publication.token, [
        ['10', ' Ana ', 'ANA', '1', '10', '100'],
        ['20', ' Luis ', 'LUIS', '2', '20', '200'],
        ['30', null, null, '3', '30', '300'],
      ]);
    });
    cy.then(() => {
      cy.intercept('GET', `**/runs/${first.runId}?*`).as('reopenedPublicationA');
      cy.visit(`/runs/${first.runId}`);
      cy.wait('@reopenedPublicationA').then(({ response }) => {
        expect(
          DvtPostgresPublicationEvidenceSchema.parse(response?.body.publication)
        ).to.deep.equal(first.evidence);
      });
      cy.reload();
      cy.wait('@reopenedPublicationA').its('response.statusCode').should('equal', 200);
      cy.get('[data-slot="run-result-tab"]').click();
      cy.get('[data-slot="run-dvt-publication-plan-sha"]').should(
        'have.text',
        first.evidence.plan.sha256
      );
      cy.get('[data-slot="run-dvt-publication-token"]').should(
        'have.text',
        first.evidence.publication.token
      );
      cy.then(() => expect(samples, 'Reopen/reload do not acquire rows').to.equal(2));
      cy.get('[data-slot="run-publication-sample-load"]').click();
      cy.wait('@publicationSample').then(({ request, response }) => {
        expect(new URL(request.url).searchParams.get('expectedPublicationToken')).to.equal(
          first.evidence.publication.token
        );
        expect(response?.statusCode).to.equal(409);
        expect(response?.body).to.deep.equal({
          error: { type: 'conflict', reason: 'warehouse_source_publication_changed' },
        });
      });
      cy.get('[data-slot="run-publication-sample"] [role="alert"]')
        .should('be.visible')
        .and('have.text', runPublicationSampleCopy.en.failures.publication_changed);
      cy.get('[data-slot="run-publication-sample"] table').should('not.exist');
      cy.then(() => expect(samples).to.equal(3));
      cy.get('[data-slot="run-dvt-publication-token"]').should(
        'have.text',
        first.evidence.publication.token
      );
      cy.screenshot('pcv1-run-a-preserved-after-publication-b');
    });
  });

  it('executes three semantic inputs as one workload and publishes the expected JOIN', () => {
    const targetSchemaValue = Cypress.env('postgresTargetSchema');
    if (typeof targetSchemaValue !== 'string' || targetSchemaValue.trim().length === 0) {
      throw new Error('Cypress env postgresTargetSchema is required for the N-input Run proof.');
    }
    const targetSchema = targetSchemaValue.trim();
    const targetRelation = 'joined_orders';
    let previewSha = '';
    const waitForCompletedRun = (
      runId: string,
      attempt = 0
    ): Cypress.Chainable<Cypress.Response<unknown>> =>
      readLiveRunSnapshot(runId).then((response) => {
        expect(response.status).to.equal(200);
        const status = String((response.body as { status?: unknown }).status ?? '').toLowerCase();
        if (status === 'completed') return cy.wrap(response, { log: false });
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
      'sourceRef' in relation && relation.sourceRef !== undefined
        ? [relation.sourceRef.connectionRef]
        : []
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
    visitWithLiveWorkspaceSession('/canvas', {
      onBeforeLoad(window) {
        window.localStorage.setItem(
          APPLICATION_LANGUAGE_STORAGE_KEY,
          JSON.stringify({ state: { language: 'es' }, version: 0 })
        );
      },
    });
    cy.get('html').should('have.attr', 'lang', 'es');
    cy.get('#app-loading-screen', { timeout: 30_000 }).should('not.exist');
    cy.get('[data-slot="shell-file-menu-trigger"]').click();
    cy.get('[data-slot="canvas-workspace-import-input"]').selectFile(
      {
        contents: Cypress.Buffer.from(contents),
        fileName: 'join-run.json',
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
      expect(workload?.schemaVersion).to.equal('dvt-operational-workload.v1');
      expect(workload?.targetProjection?.profileId).to.equal(DVT_POSTGRES_JOIN_PROFILE_ID);
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
      objectId: `relation/${livePostgresDatabaseName()}/${targetSchema}/${targetRelation}`,
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
