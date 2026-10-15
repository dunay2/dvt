/** Shared public-UI authoring and result oracle for PostgreSQL publication proofs. */
import {
  DvtPostgresPublicationEvidenceSchema,
  SourceDataSampleResponseSchema,
  WarehouseConnectionSchema,
  WorkspaceGraphAuthoringDraftSchema,
  type DvtPostgresPublicationEvidence,
  type WorkspaceGraphDraftScope,
} from '@dvt/contracts';

import { APPLICATION_LANGUAGE_STORAGE_KEY } from '../../src/app/stores/applicationLanguageStore';

import {
  clickPreviewExecutionPlanFromOperationalDrawer,
  clickCanvasAddCatalogAction,
  clickCanvasContextMenuAction,
  openCanvasContextMenuAt,
  selectCanvasClosure,
} from './canvasExecutionSelection';
import { connectCanvasNodes, getVisibleCanvasNodeByCardTitle } from './canvasGraphAuthoring';
import { createLiveProjectThroughUi } from './liveProjectAuthoring';
import { readLiveGraphDraft, visitWithLiveWorkspaceSession } from './liveProtectedRuntime';
import { livePostgresDatabaseName, placeRegisteredSource } from './liveWarehouseSourceImport';
import { joinWorkbenchProducers } from './relationalWorkbench/joinChain';
import {
  connectWorkbenchProducer,
  dragWorkbenchSource,
  openWorkbenchModel,
} from './relationalWorkbench/navigation';
import { workbenchOperation } from './relationalWorkbench/operationMenu';

const publicationColumns = [
  'customer_id',
  'customer_name',
  'customer_clean',
  'order_id',
  'customer_id_2',
  'amount',
];
export const publicationRows = [
  ['10', ' Ana ', 'Ana', '1', '10', '100'],
  ['20', ' Luis ', 'Luis', '2', '20', '200'],
  ['30', null, null, '3', '30', '300'],
];
export const transformInspector = '[data-slot="canvas-transform-inspector"]';
const derivedForm = '[data-slot="canvas-derived-output-form"]';

export function writePublicationFormula(formula: string): void {
  cy.get(derivedForm).find('[data-slot="formula-editor"] .monaco-editor').click();
  cy.focused()
    .type('{selectall}{backspace}')
    .type(formula, { parseSpecialCharSequences: false, delay: 0 });
  cy.get(derivedForm).find('.view-lines').should('have.text', formula);
  cy.get(derivedForm).find('button[type="submit"]').should('be.enabled').click();
  cy.get(derivedForm).should('not.exist');
}

export function createPublicationSources(): Cypress.Chainable<string> {
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
  cy.contains('button', 'Add sources').should('be.enabled').click();
  cy.contains('[role="dialog"]', 'Sources imported', { timeout: 60_000 }).should('be.visible');
  cy.contains('[role="dialog"] button', 'Done').click();
  return cy
    .get<{ response?: { body?: unknown } }>('@publicationConnection')
    .then(({ response }) => WarehouseConnectionSchema.parse(response?.body).id);
}

export function composePublicationModel(modelId: string): void {
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

export function runPublicationModel(
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
    expect(response?.statusCode, response?.body?.cause).to.equal(200);
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
        url: `${String(Cypress.env('apiBaseUrl'))}/runs/${runId}?${new URLSearchParams({ ...scope })}`,
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

/** Read the real saved state after Apply; never intercept or fabricate a draft acknowledgement. */
export function waitForPublicationConfig(
  scope: WorkspaceGraphDraftScope,
  nodeId: string,
  expected: Readonly<Record<string, unknown>>,
  attempt = 0
): Cypress.Chainable<void> {
  return readLiveGraphDraft(scope).then(({ status, body }) => {
    expect(status).to.equal(200);
    const draft = WorkspaceGraphAuthoringDraftSchema.parse(
      (body as { record: { draft: unknown } }).record.draft
    );
    const config = draft.nodes.find((node) => node.id === nodeId)?.metadata?.config;
    if (Cypress._.isMatch(config, expected)) return;
    if (attempt >= 40)
      throw new Error(`Publication configuration was not persisted for ${nodeId}.`);
    return cy.wait(250).then(() => waitForPublicationConfig(scope, nodeId, expected, attempt + 1));
  });
}

export function loadPublicationRows(
  token: string,
  rows: readonly (readonly (string | null)[])[]
): void {
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

export function createPublicationWorkspace(
  label: string
): Cypress.Chainable<{ scope: WorkspaceGraphDraftScope; modelId: string; connectionId: string }> {
  let scope: WorkspaceGraphDraftScope;
  let connectionId = '';
  let modelId = '';
  const projectName = `${label} ${Date.now()}`;
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
  createLiveProjectThroughUi(projectName).then((createdScope) => {
    scope = createdScope;
    return readLiveGraphDraft(scope, { failOnStatusCode: false })
      .its('status')
      .should('equal', 404);
  });
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
    expect(draft.nodes.map((node) => node.name).sort((a, b) => a.localeCompare(b))).to.deep.equal([
      'customers',
      'orders',
    ]);
    draft.nodes.forEach((node, index) => {
      placeRegisteredSource(node.id, scope, { x: 220, y: 140 + index * 240 });
    });
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
  return cy.then(() => ({ scope, modelId, connectionId }));
}
