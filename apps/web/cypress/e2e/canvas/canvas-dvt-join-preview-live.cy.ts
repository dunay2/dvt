/**
 * Owned concern: prove protected JOIN publication and publication-bound Run rows.
 * @baseline ADR-0066 and GH-3021: immutable Run evidence does not promise historical rows.
 * @decision Author A and B through public UI in a newly created, authorized workspace.
 * @consequence Real source rows, rendered samples and old-token rejection share one oracle.
 * @version 1.0.0
 */
import {
  CreateProjectResponseSchema,
  DVT_POSTGRES_JOIN_PROFILE_ID,
  DvtPostgresPublicationEvidenceSchema,
  KNOWN_STEP_KINDS,
  SourceDataSampleResponseSchema,
  WarehouseConnectionSchema,
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
  clickCanvasAddCatalogAction,
  clickCanvasContextMenuAction,
  getVisibleCanvasNode,
  openCanvasContextMenuAt,
  selectCanvasClosure,
} from '../../support/canvasExecutionSelection';
import {
  connectCanvasNodes,
  getVisibleCanvasNodeByCardTitle,
} from '../../support/canvasGraphAuthoring';
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
import { joinWorkbenchProducers } from '../../support/relationalWorkbench/joinChain';
import {
  connectWorkbenchProducer,
  dragWorkbenchSource,
  openWorkbenchModel,
  openWorkbenchProperties,
} from '../../support/relationalWorkbench/navigation';
import { workbenchOperation } from '../../support/relationalWorkbench/operationMenu';

const publicationColumns = [
  'customer_id',
  'customer_name',
  'customer_clean',
  'order_id',
  'customer_id_2',
  'amount',
];
const publicationRows = [
  ['10', ' Ana ', 'Ana', '1', '10', '100'],
  ['20', ' Luis ', 'Luis', '2', '20', '200'],
  ['30', null, null, '3', '30', '300'],
];
const transformInspector = '[data-slot="canvas-transform-inspector"]';
const derivedForm = '[data-slot="canvas-derived-output-form"]';

function writePublicationFormula(formula: string): void {
  cy.get(derivedForm).find('[data-slot="formula-editor"] .monaco-editor').click();
  cy.focused()
    .type('{selectall}{backspace}')
    .type(formula, { parseSpecialCharSequences: false, delay: 0 });
  cy.get(derivedForm).find('.view-lines').should('have.text', formula);
  cy.get(derivedForm).find('button[type="submit"]').should('be.enabled').click();
  cy.get(derivedForm).should('not.exist');
}

function createPublicationSources(): Cypress.Chainable<string> {
  openCanvasContextMenuAt(350, 250);
  clickCanvasContextMenuAction('open-add-node-catalog');
  clickCanvasAddCatalogAction('open-source-import', 'dvt:source');
  cy.contains('[role="dialog"] button', 'New connection').click();
  cy.get('[data-slot="source-import-create-connection-name"]').type('PCV1 publication');
  cy.get('[data-slot="source-import-create-connection-type"]').select('postgres');
  cy.get('[data-slot="source-import-create-connection-database"]').type(livePostgresDatabaseName());
  cy.get('[data-slot="source-import-create-connection-credential-ref"]').type(
    'postgres:local-postgres-proof'
  );
  cy.intercept('POST', '**/workspace/warehouse/connections?*').as('publicationConnection');
  cy.contains('[role="dialog"] button', 'Create connection').click();
  cy.wait('@publicationConnection').its('response.statusCode').should('equal', 201);
  cy.contains('[role="dialog"] button', 'Test connection').click();
  cy.contains('[role="dialog"]', 'Connection passed', { timeout: 30_000 }).should('be.visible');
  cy.contains('[role="tab"]', 'Browse').click();
  for (const table of ['customers', 'orders']) {
    const objectId = `relation/${livePostgresDatabaseName()}/pcv1/${table}`;
    cy.get('[data-slot="source-import-object-search"]').clear().type(table);
    cy.get(`[data-source-import-object="${objectId}"]`, { timeout: 20_000 })
      .scrollIntoView()
      .dblclick();
    cy.get(`[data-source-import-object-select="${objectId}"]`).should(
      'have.attr',
      'data-state',
      'checked'
    );
  }
  cy.contains('[role="dialog"]', 'Selected: 2').should('be.visible');
  cy.contains('button', 'Attach sources to canvas').should('be.enabled').click();
  cy.contains('[role="dialog"]', 'Sources imported', { timeout: 60_000 }).should('be.visible');
  cy.contains('[role="dialog"] button', 'Done').click();
  return cy
    .get<{ response?: { body?: unknown } }>('@publicationConnection')
    .then(({ response }) => WarehouseConnectionSchema.parse(response?.body).id);
}

function composePublicationModel(modelId: string): void {
  openWorkbenchModel(modelId);
  dragWorkbenchSource('customers');
  cy.contains('[data-operator="read"]', 'customers').closest('li').as('customerProducer');
  workbenchOperation('field_transform').click();
  cy.get('[data-pending-operation="true"]').last().as('customerTransform', { type: 'static' });
  connectWorkbenchProducer('@customerProducer', '@customerTransform');
  cy.get(transformInspector).find('[data-slot="canvas-derived-output-trigger"]').click();
  cy.get(derivedForm).find('input[name="alias"]').type('customer_clean');
  writePublicationFormula('TRIM("customer_name")');
  dragWorkbenchSource('orders');
  cy.contains('[data-operator="read"]', 'orders').closest('li').as('orderProducer');
  joinWorkbenchProducers('@customerTransform', '@orderProducer', 'publicationJoin');
  connectWorkbenchProducer(
    '@publicationJoin',
    '[data-slot="canvas-relational-output-input-port"]',
    null
  );
  cy.get('[data-slot="canvas-relational-tree-apply"]').should('be.enabled').click();
  cy.get('[data-slot="canvas-model-save-status"]').should('have.text', 'Synced');
  cy.get('[data-slot="canvas-model-tab-close"]').click();
}

function runPublicationModel(
  modelId: string,
  scope: WorkspaceGraphDraftScope
): Cypress.Chainable<{ runId: string; evidence: DvtPostgresPublicationEvidence }> {
  let planSha = '';
  cy.intercept('POST', '**/plans/preview').as('publicationPreview');
  selectCanvasClosure([modelId]);
  clickPreviewExecutionPlanFromOperationalDrawer();
  cy.wait('@publicationPreview', { timeout: 30_000 }).then(({ request, response }) => {
    expect(request.body).not.to.have.property('graphSource');
    expect(request.body.selection).to.deep.equal({ mode: 'upstream', nodeIds: [modelId] });
    expect(response?.statusCode).to.equal(200);
    planSha = response!.body.planRef.sha256;
    expect(planSha).to.match(/^[a-f0-9]{64}$/);
  });
  cy.intercept('POST', '**/runs/start').as('publicationStart');
  cy.get('[data-slot="plan-preview-start-run"]').should('be.enabled').click();
  cy.wait('@publicationStart').then(({ response }) => {
    expect(response?.statusCode, response?.body?.error?.reason).to.equal(202);
  });
  cy.location('pathname', { timeout: 20_000 }).should('match', /^\/runs\/[^/]+$/);
  cy.get('[data-slot="run-itinerary-card"]', { timeout: 30_000 }).should(
    'contain.text',
    'completed'
  );
  return cy.location('pathname').then((pathname) => {
    const runId = pathname.split('/').pop()!;
    return cy
      .request({
        url: `${String(Cypress.env('apiBaseUrl'))}/runs/${runId}?${new URLSearchParams(scope)}`,
        auth: { bearer: String(Cypress.env('apiBearerToken')) },
      })
      .then(({ status, body }) => {
        expect(status).to.equal(200);
        const evidence = DvtPostgresPublicationEvidenceSchema.parse(body.publication);
        expect(evidence.plan.sha256).to.equal(planSha);
        expect(evidence.environmentId).to.equal(scope.environmentId);
        expect(evidence.rowsWritten).to.equal(3);
        return { runId, evidence };
      });
  });
}

function loadPublicationRows(token: string, rows: readonly (readonly (string | null)[])[]): void {
  cy.get('[data-slot="run-result-tab"]').click();
  cy.get('[data-slot="run-publication-sample-load"]').should('be.enabled').click();
  cy.wait('@publicationSample', { timeout: 30_000 }).then(({ request, response }) => {
    expect(new URL(request.url).searchParams.get('expectedPublicationToken')).to.equal(token);
    expect(response?.statusCode).to.equal(200);
    const sample = SourceDataSampleResponseSchema.parse(response!.body);
    expect(sample.columns.map((column) => column.name)).to.deep.equal(publicationColumns);
    expect(
      sample.rows.map((row) => row.values).sort((a, b) => Number(a[3]) - Number(b[3]))
    ).to.deep.equal(rows);
  });
  cy.get('[data-slot="run-publication-sample"] table')
    .should('be.visible')
    .find('tbody tr')
    .should(($rows) => {
      const rendered = [...$rows].map((row) =>
        [...row.querySelectorAll('td span[data-null]')].map((cell) =>
          cell.getAttribute('data-null') === 'true' ? null : cell.textContent
        )
      );
      expect(rendered.sort((a, b) => Number(a[3]) - Number(b[3]))).to.deep.equal(rows);
    });
}

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
    const projectName = `PCV1 publication ${Date.now()}`;
    cy.viewport(1440, 1000);
    visitWithLiveWorkspaceSession('/canvas', {
      onBeforeLoad(window) {
        window.localStorage.setItem(
          APPLICATION_LANGUAGE_STORAGE_KEY,
          JSON.stringify({ state: { language: 'en' }, version: 0 })
        );
      },
    });
    cy.get('#app-loading-screen', { timeout: 30_000 }).should('not.exist');
    cy.get('html').should('have.attr', 'lang', 'en');
    cy.intercept('POST', '**/projects').as('publicationProject');
    cy.get('[data-slot="shell-workspace-menu-trigger"]').click();
    cy.get('[data-slot="shell-new-project-command"]').click();
    cy.get('[data-slot="project-creation-dialog"]').within(() => {
      cy.get('input[name="projectName"]').type(projectName);
      cy.contains('button', 'Create project').click();
    });
    cy.wait('@publicationProject', { timeout: 30_000 }).then(({ response }) => {
      expect(response?.statusCode).to.equal(201);
      const { defaultWorkspace } = CreateProjectResponseSchema.parse(response!.body);
      scope = {
        tenantId: defaultWorkspace.tenantId,
        projectId: defaultWorkspace.projectId,
        environmentId: defaultWorkspace.environmentId,
      };
      readLiveGraphDraft(scope, { failOnStatusCode: false }).its('status').should('equal', 404);
    });
    cy.get('[data-slot="project-creation-dialog"]').should('not.exist');
    cy.get('[data-slot="shell-workspace-menu-trigger"]').should('contain.text', projectName);
    cy.get('[data-slot="canvas-playground-template-choice"]').should('be.enabled').click();
    cy.get('[data-testid="canvas-viewport"]').should('be.visible');
    createPublicationSources().then((id) => {
      connectionId = id;
    });
    cy.then(() => readLiveGraphDraft(scope)).then(({ status, body }) => {
      expect(status).to.equal(200);
      expect((body as { record: { scope: unknown } }).record.scope).to.deep.include(scope);
      const draft = WorkspaceGraphAuthoringDraftSchema.parse(
        (body as { record: { draft: unknown } }).record.draft
      );
      expect(draft.nodes.map((node) => node.name).sort((a, b) => a.localeCompare(b))).to.deep.equal(
        ['customers', 'orders']
      );
    });
    openCanvasContextMenuAt(1050, 400);
    clickCanvasContextMenuAction('open-add-node-catalog');
    clickCanvasAddCatalogAction('create-node', 'dvt:transform');
    getVisibleCanvasNodeByCardTitle('Model 1')
      .invoke('attr', 'data-id')
      .then((id) => {
        modelId = id!;
      });
    cy.get('[data-slot="canvas-draft-save-status"]').should('not.exist');
    connectCanvasNodes('customers', 'Model 1');
    cy.get('.react-flow__edge').should('have.length', 1);
    cy.get('[data-slot="canvas-draft-save-status"]').should('not.exist');
    connectCanvasNodes('orders', 'Model 1');
    cy.get('.react-flow__edge').should('have.length', 2);
    cy.get('[data-slot="canvas-draft-save-status"]').should('not.exist');
    cy.then(() => composePublicationModel(modelId));
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
          connectionRef: { connectionId, provider: 'postgres' },
          schema: targetSchema,
          relation: targetRelation,
        },
      });
    });
    cy.reload();
    cy.then(() => openWorkbenchModel(modelId));
    cy.get('[data-slot="canvas-model-save-status"]').should('have.text', 'Synced');
    cy.get('[data-operator="project"]').should('have.length', 1).click();
    cy.get(transformInspector).should('contain.text', 'customer_clean').and('contain.text', 'TRIM');
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
    cy.then(() => openWorkbenchModel(modelId));
    cy.get('[data-operator="project"]').should('have.length', 1).click();
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
