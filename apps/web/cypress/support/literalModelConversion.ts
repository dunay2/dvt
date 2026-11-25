/** Prove explicit literal Model confirmation and reopen through the actual worksheet UI. */
import {
  DvtTransformAuthoringAuthorityV1Schema,
  WorksheetCanvasModelRequestSchema,
  WorkspaceGraphDraftSaveRequestSchema,
  type WorksheetCanvasModelProposal,
} from '@dvt/contracts';

import { buildWorksheetCanvasLiteralProposal } from '../../src/app/views/sql/worksheetCanvasModel.test-fixtures';

import { stubStatefulCanvasDraftAuthoring } from './canvasDraftAuthoring';
import {
  getE2eApiCalls,
  installE2eApiFetchStub,
  stubE2eApi,
  stubE2eJsonApi,
  waitForE2eApiCall,
} from './e2eApiStub';
import { exteriorOutputColumns } from './relationalWorkbench/columns';
import { openWorkbenchModel } from './relationalWorkbench/navigation';
import {
  E2E_PROJECT_WORKSPACE,
  stubShellBootstrapApis,
  visitWithE2eWorkspaceSession,
} from './workspaceSession';

const sql = 'SELECT 1 AS comprobacion_editor_sql';
const modelName = 'Literal worksheet proof';
const proposalPath = '/workspace/graph/canvases/main-canvas/sql-model-proposal';
const editor = '[data-slot="sql-worksheet-editor"] .monaco-editor';
const connection = {
  id: 'literal-proof-warehouse',
  name: 'Literal proof warehouse',
  type: 'postgres',
  database: 'isolated-proof',
} as const;

export function registerLiteralModelConversionJourney(): void {
  it('prepares, explicitly confirms and reopens the typed SELECT 1 Model with one save', () => {
    prepareLiteralWorkspace();
    const state = prepareLiteralProposal();
    enterLiteralSql();
    prepareLiteralModel();
    confirmLiteralModel();
    assertLiteralModelSaved(state);
    reopenLiteralModel(state);
  });
}

function prepareLiteralWorkspace(): void {
  stubShellBootstrapApis({
    scopes: [
      'workspace:graph-draft:view',
      'workspace:graph-draft:save',
      'workspace:files:view',
      'workspace:source-import:view',
      'workspace:sql:execute',
      'workspace:sql-history:view',
    ],
  });
  stubE2eJsonApi('GET', '/workspace/context', {
    defaultWorkspace: E2E_PROJECT_WORKSPACE,
    availableWorkspaces: [E2E_PROJECT_WORKSPACE],
  });
  stubE2eJsonApi('GET', '/capabilities', {
    apiVersion: '1.0.0',
    minFrontendVersion: '0.0.1',
    plugins: { dvt: { available: true } },
  });
  stubStatefulCanvasDraftAuthoring({ emptyCanvas: true, title: 'Canvas' });
  stubE2eJsonApi('GET', '/workspace/files', []);
  stubE2eJsonApi('GET', '/workspace/warehouse/connections', [connection]);
  stubE2eJsonApi('GET', `/workspace/warehouse/connections/${connection.id}/objects`, {
    kind: 'schema-list',
    schemas: [],
    truncated: false,
  });
  stubE2eJsonApi('GET', '/workspace/sql/executions', {
    schemaVersion: 'workspace-sql-execution-history.v1',
    executions: [],
    nextCursor: null,
  });
  stubE2eApi('POST', '/workspace/sql/executions', () => {
    throw new Error('Conversion cannot implicitly execute a worksheet query.');
  });
}

function prepareLiteralProposal(): { proposal?: WorksheetCanvasModelProposal } {
  const state: { proposal?: WorksheetCanvasModelProposal } = {};
  stubE2eApi('POST', proposalPath, ({ body }) => {
    const input = WorksheetCanvasModelRequestSchema.parse(body);
    const proposal = buildWorksheetCanvasLiteralProposal(input, E2E_PROJECT_WORKSPACE);
    if (proposal.status === 'valid') state.proposal = proposal;
    return { body: proposal };
  });
  return state;
}

function enterLiteralSql(): void {
  cy.viewport(1280, 800);
  visitWithE2eWorkspaceSession('/sql', {
    onBeforeLoad(window) {
      window.localStorage.setItem(
        'dvt-web-application-language',
        JSON.stringify({ state: { language: 'en' }, version: 0 })
      );
    },
  });
  waitForE2eApiCall('/workspace/graph/draft', 'GET');
  cy.get('#app-loading-screen').should('not.exist');
  cy.contains('label', 'Connection').find('select').select(connection.id);
  cy.get(`${editor} .view-lines`).click(350, 9);
  cy.get(`${editor} textarea.inputarea`).should('be.focused');
  cy.then(() =>
    Cypress.automation('remote:debugger:protocol', {
      command: 'Input.insertText',
      params: { text: sql },
    })
  );
  cy.get(`${editor} .view-lines`).should(($lines) =>
    expect($lines.text().replaceAll('\u00a0', ' ')).to.contain(sql)
  );
}

function prepareLiteralModel(): void {
  cy.contains('button', 'Convert to model').click();
  cy.get('[role="dialog"]').within(() => {
    cy.get('input[name="worksheet-model-destination"]:checked').should('have.length', 0);
    cy.contains('label', 'Active Canvas').find('input').check();
    cy.contains('label', 'Model name').find('input').type(modelName);
    cy.contains('button', 'Prepare Canvas Model').click();
    cy.get('[aria-label="Proposed columns"]')
      .should('contain.text', 'comprobacion_editor_sql')
      .and('contain.text', 'i32');
  });
  waitForE2eApiCall(proposalPath, 'POST');
  cy.then(() => expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(0));
}

function confirmLiteralModel(): void {
  cy.get('[role="dialog"]').within(() => {
    cy.contains('button', 'Confirm Canvas Model').should('be.enabled').click();
    cy.get('[role="status"]')
      .should('contain.text', 'Created Canvas Model')
      .and('contain.text', modelName);
  });
  waitForE2eApiCall('/workspace/graph/draft', 'PUT');
}

function assertLiteralModelSaved(state: { proposal?: WorksheetCanvasModelProposal }): void {
  cy.then(() => {
    if (state.proposal?.status !== 'valid')
      throw new Error('Expected the displayed literal proposal.');
    const writes = getE2eApiCalls('/workspace/graph/draft', 'PUT');
    expect(writes).to.have.length(1);
    const saved = WorkspaceGraphDraftSaveRequestSchema.parse(writes[0]!.body);
    expect(saved.draft).to.deep.equal(state.proposal.draft);
    expect(saved.expectedRevision).to.equal('rev-e2e-graph-ready');
    expect(saved.idempotencyKey).to.contain('worksheet-canvas-model:');
    expect(saved.draft.nodeIds).to.deep.equal([state.proposal.modelId]);
    expect(saved.draft.nodes).to.have.length(1);
    expect(saved.draft.edges).to.deep.equal([]);
    const node = saved.draft.nodes[0]!;
    expect(node.metadata?.connectionRef).to.deep.equal(state.proposal.connectionRef);
    const authority = DvtTransformAuthoringAuthorityV1Schema.parse(
      node.metadata?.transformAuthoring
    );
    expect(authority.semanticDocument.sidecar.relations).to.have.length(1);
    expect(authority.semanticDocument.sidecar.relations[0]).not.to.have.property('sourceRef');
    expect(authority.semanticDocument.sidecar.relations[0]).not.to.have.property('producerRef');
    const calls = getE2eApiCalls(proposalPath, 'POST');
    expect(calls).to.have.length(2);
    const prepared = WorksheetCanvasModelRequestSchema.parse(calls[0]!.body);
    const confirmed = WorksheetCanvasModelRequestSchema.parse(calls[1]!.body);
    expect(prepared.sql).to.equal(sql);
    expect(prepared.models).to.deep.equal([]);
    expect(confirmed).to.deep.equal({
      ...prepared,
      verifyContextSha256: state.proposal.contextSha256,
    });
    expect(getE2eApiCalls('/workspace/sql/executions', 'POST')).to.have.length(0);
  });
}

function reopenLiteralModel(state: { proposal?: WorksheetCanvasModelProposal }): void {
  cy.get('body').type('{esc}');
  cy.get('#shell-canvas-navigation').click();
  cy.location('pathname').should('eq', '/canvas');
  cy.on('window:before:load', installE2eApiFetchStub);
  cy.reload();
  waitForE2eApiCall('/workspace/graph/draft', 'GET');
  cy.get('#app-loading-screen').should('not.exist');
  cy.then(() => {
    if (state.proposal?.status !== 'valid') throw new Error('Expected the saved literal proposal.');
    exteriorOutputColumns(state.proposal.modelId).should('deep.equal', ['comprobacion_editor_sql']);
    openWorkbenchModel(state.proposal.modelId);
  });
  cy.get('[data-slot="canvas-model-editor"]')
    .should('have.attr', 'aria-label')
    .and('contain', modelName);
  cy.get('[data-slot="canvas-relational-tree-node"][data-operator="read"]').should(
    'have.length',
    1
  );
  cy.then(() => expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(1));
}
