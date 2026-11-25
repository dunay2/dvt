/** Real Chrome/Monaco interactions; controlled HTTP facts isolate the independent worksheet contract. */
import {
  ConnectedSourceRefSchema,
  DvtTransformAuthoringAuthorityV1Schema,
  ExecuteWorkspaceSqlRequestSchema,
  SourceObjectSchema,
  TransformSqlProjectionResponseSchema,
  WorkspaceSqlExecutionSchema,
  buildRelationalSourceObjectId,
  type WorkspaceGraphAuthoringDraft,
  type WorkspaceSqlExecution,
} from '@dvt/contracts';
import { sha256HexUtf8 } from '@dvt/crypto';

import { stubStatefulCanvasDraftAuthoring } from '../../support/canvasDraftAuthoring';
import {
  getE2eApiCalls,
  stubE2eApi,
  stubE2eJsonApi,
  waitForE2eApiCall,
} from '../../support/e2eApiStub';
import {
  E2E_PROJECT_WORKSPACE,
  stubShellBootstrapApis,
  visitWithE2eWorkspaceSession,
} from '../../support/workspaceSession';

const editor = '[data-slot="sql-worksheet-editor"] .monaco-editor';
const executionPath = '/workspace/sql/executions';
const executionId = `1795478400000-${'a'.repeat(32)}-00000000-0000-4000-8000-000000000001`;
const locator = {
  kind: 'relation',
  catalog: 'dvt',
  schema: 'raw',
  name: 'orders',
  relationType: 'table',
} as const;
const connection = {
  id: 'warehouse-a',
  name: 'SQL proof warehouse',
  type: 'postgres',
  database: 'dvt',
} as const;

function prepareWarehouse(): void {
  const object = SourceObjectSchema.parse({
    objectId: buildRelationalSourceObjectId(locator),
    displayName: 'Orders',
    locator,
    metricEvidence: {
      observedAt: '2026-11-25T00:00:00.000Z',
      observationScope: { kind: 'snapshot' },
      rowCount: { value: 1, provenance: 'measured', method: 'data-scan', confidence: 'exact' },
      byteSize: {
        value: 16,
        provenance: 'estimated',
        method: 'schema-width',
        confidence: 'low',
        basis: 'logical-payload',
      },
    },
  });
  stubE2eJsonApi('GET', '/workspace/warehouse/connections', [connection]);
  stubE2eApi('GET', '/workspace/warehouse/connections/warehouse-a/objects', ({ url }) => ({
    body:
      url.searchParams.get('kind') === 'schema-list'
        ? {
            kind: 'schema-list',
            schemas: [{ catalog: 'dvt', schema: 'raw', objectCount: 1 }],
            truncated: false,
          }
        : { kind: 'object-page', objects: [object], truncated: false },
  }));
}

function prepareExecutions(): void {
  let execution: WorkspaceSqlExecution | undefined;
  stubE2eApi('POST', executionPath, ({ body }) => {
    const request = ExecuteWorkspaceSqlRequestSchema.parse(body);
    expect(request.connectionId).to.equal(connection.id);
    execution = WorkspaceSqlExecutionSchema.parse({
      schemaVersion: 'workspace-sql-execution.v1',
      executionId,
      status: 'succeeded',
      sql: request.sql,
      connectionRef: {
        schemaVersion: 'connection-ref.v1',
        connectionId: connection.id,
        provider: 'postgres',
      },
      connectionName: connection.name,
      principalId: 'e2e-principal',
      startedAt: '2026-11-25T00:00:00.000Z',
      finishedAt: '2026-11-25T00:00:00.125Z',
      durationMs: 125,
      limit: request.limit,
      rowCount: 1,
      truncated: false,
      columns: [{ name: 'order_id', type: 'integer', nullable: false }],
    });
    return {
      body: {
        schemaVersion: 'workspace-sql-execution-response.v1',
        execution,
        result: { columns: execution.columns, rows: [{ values: ['7'] }] },
      },
    };
  });
  stubE2eApi('GET', executionPath, () => ({
    body: {
      schemaVersion: 'workspace-sql-execution-history.v1',
      executions: execution == null ? [] : [execution],
      nextCursor: null,
    },
  }));
  stubE2eApi('GET', `${executionPath}/${executionId}`, () => ({
    body: { schemaVersion: 'workspace-sql-execution-detail.v1', execution },
  }));
}

function prepareModelSql(draft: WorkspaceGraphAuthoringDraft): void {
  const model = draft.nodes.find((node) => node.id === 'dvt-transform-1')!;
  const source = draft.nodes.find((node) => node.id === 'source-1')!;
  const authority = DvtTransformAuthoringAuthorityV1Schema.parse(
    model.metadata?.transformAuthoring
  );
  const sourceRef = ConnectedSourceRefSchema.parse(source.metadata?.connectedSourceRef);
  const sql = 'SELECT order_id, total FROM raw.orders';
  stubE2eJsonApi(
    'GET',
    `/workspace/graph/canvases/${draft.canvas.id}/transforms/${model.id}/sql`,
    TransformSqlProjectionResponseSchema.parse({
      schemaVersion: 'canvas-transform-sql-projection.v1',
      canvasId: draft.canvas.id,
      transformNodeId: model.id,
      draftRevision: 'rev-e2e-graph-ready',
      semanticPlanSha256: authority.semanticDocument.semanticPlan.sha256,
      sql,
      presentation: { status: 'unchanged', sql, steps: [] },
      provenance: { sourceRefs: [sourceRef] },
    })
  );
}

function prepareFiles(): void {
  const content = 'SELECT 99 AS recovered';
  const path = 'operations/recovered.sql';
  stubE2eJsonApi('GET', '/workspace/files', [{ path, name: 'recovered.sql', kind: 'file' }]);
  stubE2eJsonApi('GET', `/workspace/files/${encodeURIComponent(path)}`, {
    path,
    name: 'recovered.sql',
    language: 'sql',
    content,
    contentSha256: sha256HexUtf8(content),
    lastModified: '2026-11-25T00:00:00.000Z',
  });
  stubE2eJsonApi('GET', `/workspace/file-history/${encodeURIComponent(path)}`, []);
}

function prepareWorksheet(): void {
  stubShellBootstrapApis({
    scopes: [
      'workspace:graph-draft:view',
      'workspace:graph-draft:save',
      'workspace:files:view',
      'workspace:files:save',
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
  const draft = stubStatefulCanvasDraftAuthoring({ authoringGenerated: true });
  prepareWarehouse();
  prepareExecutions();
  prepareModelSql(draft);
  prepareFiles();
}

function visitWorksheet(path = '/sql'): void {
  cy.viewport(1280, 800);
  visitWithE2eWorkspaceSession(path, {
    onBeforeLoad(window) {
      window.localStorage.setItem(
        'dvt-web-application-language',
        JSON.stringify({ state: { language: 'en' }, version: 0 })
      );
    },
  });
}

function typeSql(sql: string): void {
  cy.get(`${editor} .view-lines`).click(350, 9);
  cy.get(`${editor} textarea.inputarea`).should('be.focused');
  cy.then(() =>
    Cypress.automation('remote:debugger:protocol', {
      command: 'Input.insertText',
      params: { text: sql },
    })
  );
}

function assertEditorContains(sql: string): void {
  cy.get(`${editor} .view-lines`).should(($lines) => {
    expect($lines.text().replaceAll('\u00a0', ' ')).to.contain(sql);
  });
}

function dragReference(source: string): void {
  const dataTransfer = new DataTransfer();
  cy.get(source).should('have.attr', 'draggable', 'true').trigger('dragstart', { dataTransfer });
  cy.get(`${editor} .view-lines`).then(($target) => {
    const rect = $target[0]!.getBoundingClientRect();
    const event = { dataTransfer, clientX: rect.left + 400, clientY: rect.top + 9 };
    cy.wrap($target).trigger('dragover', event).trigger('drop', event);
  });
}

function recoverHistory(original: HTMLElement): void {
  cy.contains('button', 'Execution history').first().click();
  cy.get('ol').should('contain.text', '"raw"."orders"');
  cy.contains('button', 'Restore SQL').click();
  waitForE2eApiCall(`${executionPath}/${executionId}`, 'GET');
  cy.get(editor).should(($current) => {
    expect($current[0]).to.equal(original);
  });
  cy.get(`${editor} .view-lines`).should('contain.text', '"raw"."orders"');
  cy.contains('Only execution metadata is kept in history.').should('be.visible');
  cy.then(() => {
    expect(getE2eApiCalls(executionPath, 'POST')).to.have.length(1);
  });
}

function recoverFile(original: HTMLElement): void {
  cy.contains('button', 'SQL files and Git').click();
  cy.get('[role="dialog"]').within(() => {
    cy.contains('label', 'Saved queries').find('select').select('operations/recovered.sql');
    cy.contains('button', 'Replace editor text').click();
    cy.get('[data-slot="code-file-version-history"]').should('be.visible');
  });
  waitForE2eApiCall('/workspace/file-history/operations%2Frecovered.sql', 'GET');
  cy.get('body').type('{esc}');
  cy.get(editor).should(($current) => {
    expect($current[0]).to.equal(original);
  });
  assertEditorContains('SELECT 99 AS recovered');
}

describe('independent SQL worksheet', () => {
  beforeEach(prepareWorksheet);

  it('opens the original SQL activity without a selected Model and runs a dragged object in the same editor', () => {
    visitWorksheet('/canvas');
    waitForE2eApiCall('/workspace/graph/draft', 'GET');
    cy.get('[data-slot="shell-model-sql-command"]').click();
    cy.location('pathname').should('eq', '/sql');
    cy.get('[data-slot="canvas-model-main-tab"]').should('not.exist');
    cy.get('[data-slot="canvas-relational-tree-workbench"]').should('not.exist');
    cy.get(editor).should(($editor) => {
      expect($editor[0]!.getBoundingClientRect().height).to.be.greaterThan(400);
    });
    cy.contains('button', 'Run query').should('be.disabled');
    cy.contains('label', 'Connection').find('select').select(connection.id);
    typeSql('SELECT * FROM ');
    cy.contains('label', 'Schema')
      .find('select')
      .select(JSON.stringify(['dvt', 'raw']));
    dragReference(`[data-object-id="${buildRelationalSourceObjectId(locator)}"]`);
    cy.get(`${editor} .view-lines`).should('contain.text', '"raw"."orders"');
    cy.contains('button', 'Run query').click();
    waitForE2eApiCall(executionPath, 'POST');
    cy.get('[data-slot="sql-worksheet-results"]')
      .should('contain.text', '125 ms')
      .and('contain.text', '7');
    cy.get(editor).then(($editor) => {
      recoverHistory($editor[0]!);
      recoverFile($editor[0]!);
    });
    cy.then(() => {
      expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(0);
    });
  });

  it('drags an authorized Model SQL projection and requires a neutral explicit conversion destination', () => {
    visitWorksheet();
    cy.contains('label', 'Connection').find('select').select(connection.id);
    typeSql('SELECT * FROM ');
    dragReference('[data-element-id="dvt-transform-1"]');
    waitForE2eApiCall(
      '/workspace/graph/canvases/main-canvas/transforms/dvt-transform-1/sql',
      'GET'
    );
    assertEditorContains('SELECT order_id, total FROM raw.orders');
    assertEditorContains('model_');
    cy.contains('button', 'Convert to model').click();
    cy.get('[role="dialog"]').within(() => {
      cy.get('input[name="worksheet-model-destination"]:checked').should('have.length', 0);
      cy.contains('label', 'Active Canvas').find('input').check();
      cy.contains('label', 'Model name').should('be.visible');
      cy.contains('label', 'dbt project file').find('input').check();
      cy.contains('Select a project with current dbt file authority.').should('be.visible');
    });
    cy.then(() => {
      expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(0);
      expect(getE2eApiCalls(executionPath, 'POST')).to.have.length(0);
    });
  });
});
