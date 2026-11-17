/** Prove SQL authoring through real Monaco, semantic Apply, data drawer and durable reload. */
import {
  allocateDvtFieldId,
  ConnectedSourceRefSchema,
  ModelSqlCompilationRequestSchema,
  ModelSqlCompilationResponseSchema,
  ModelSqlContextResponseSchema,
  TransformSqlDraftDataSampleRequestSchema,
  TransformSqlDraftDataSampleResponseSchema,
  TRANSFORM_DATA_SAMPLE_CONTRACT_VERSION,
  WorkspaceGraphDraftSaveRequestSchema,
} from '@dvt/contracts';
import { sha256HexUtf8 } from '@dvt/crypto';
import { deriveSubstraitSchemas } from '@dvt/substrait-analysis';

import { createDvtSubstraitProjectionDraft } from '../../../src/app/views/canvas/canvasDvtSubstraitProjection';
import { encodeDvtSubstraitSemanticDocument } from '../../../src/app/views/canvas/canvasDvtSubstraitSemanticDocument';
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

const panel = '[data-slot="canvas-model-sql"]';
const sql = 'SELECT country FROM customers';

describe('Model SQL authoring', () => {
  it('explicitly validates, queries, generates and reloads a semantic Model', () => {
    stubShellBootstrapApis({
      scopes: ['workspace:graph-draft:view', 'workspace:graph-draft:save'],
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
    const draft = stubStatefulCanvasDraftAuthoring({ projectionModel: true });
    const source = draft.nodes.find((node) => node.id === 'source-customers')!;
    const model = draft.nodes.find((node) => node.id === 'transform-customers')!;
    model.metadata = {};
    const sourceRef = ConnectedSourceRefSchema.parse(source.metadata!.connectedSourceRef);
    const semantic = createDvtSubstraitProjectionDraft({
      source: {
        nodeId: source.id,
        schema: 'public',
        table: 'customers',
        sourceRef,
        fields: ['name', 'email', 'country'].map((name) => ({ name, dataType: 'string' })),
      },
      targetNodeId: model.id,
      outputs: [{ fieldId: allocateDvtFieldId(), name: 'country', sourceFieldName: 'country' }],
    });
    const root = deriveSubstraitSchemas(semantic);
    const fieldId = root.index.relations.get(root.index.rootId)!.fields[0]!.fieldId;
    const target = { canvasId: draft.canvas.id, transformNodeId: model.id };
    const prefix = `/workspace/graph/canvases/${target.canvasId}/transforms/${target.transformNodeId}`;
    stubE2eApi('GET', `${prefix}/sql-context`, () => ({
      body: ModelSqlContextResponseSchema.parse({
        schemaVersion: 'canvas-model-sql-context.v1',
        ...target,
        draftRevision: 'sql-context-r1',
        contextSha256: 'a'.repeat(64),
        semanticPlanSha256: null,
        connectionRef: sourceRef.connectionRef,
        sql: null,
        inputs: [
          {
            nodeId: source.id,
            name: source.name,
            sqlName: 'customers',
            columns: ['name', 'email', 'country'].map((name) => ({
              id: name,
              name,
              dataType: 'string',
              nullable: true,
            })),
          },
        ],
        diagnostics: [],
      }),
    }));
    stubE2eApi('POST', `${prefix}/sql-compilation`, ({ body }) => {
      const input = ModelSqlCompilationRequestSchema.parse(body);
      return {
        body: ModelSqlCompilationResponseSchema.parse({
          schemaVersion: 'canvas-model-sql-compilation.v1',
          ...target,
          draftRevision: input.draftRevision,
          contextSha256: input.contextSha256,
          sqlSha256: sha256HexUtf8(input.sql),
          status: 'valid',
          normalizedSql: input.sql,
          semanticDocument: encodeDvtSubstraitSemanticDocument(semantic),
          columns: [{ id: fieldId, name: 'country', dataType: 'string', nullable: true }],
          inputAdditions: [{ nodeId: source.id, columnId: 'country' }],
          diagnostics: [],
        }),
      };
    });
    stubE2eApi('POST', `${prefix}/data-sample`, ({ body }) => {
      const input = TransformSqlDraftDataSampleRequestSchema.parse(body);
      return {
        body: TransformSqlDraftDataSampleResponseSchema.parse({
          schemaVersion: 'canvas-transform-sql-draft-data-sample.v1',
          contextSha256: input.contextSha256,
          sqlSha256: sha256HexUtf8(input.sql),
          sample: {
            contractVersion: TRANSFORM_DATA_SAMPLE_CONTRACT_VERSION,
            ...target,
            draftRevision: input.draftRevision,
            semanticPlanSha256: encodeDvtSubstraitSemanticDocument(semantic).semanticPlan.sha256,
            limit: input.limit,
            columns: [{ name: 'country', type: 'text', nullable: true }],
            rows: [{ values: ['SQL_ROW_3944'] }],
            truncated: false,
            provenance: {
              mode: 'live',
              sourceRefs: [sourceRef],
              queriedAt: '2026-11-17T00:00:00.000Z',
              navigation: 'bounded-first-page',
              limit: input.limit,
            },
          },
        }),
      };
    });
    cy.viewport(1200, 700);
    visitWithE2eWorkspaceSession('/canvas', {
      onBeforeLoad(window) {
        window.localStorage.setItem(
          'dvt-web-application-language',
          JSON.stringify({ state: { language: 'en' }, version: 0 })
        );
      },
    });
    waitForE2eApiCall('/workspace/graph/draft', 'GET');
    cy.get(`.react-flow__node[data-id="${model.id}"] [data-slot="canvas-node-shell"]`).dblclick(
      40,
      18
    );
    cy.get('button[aria-label="Open Model SQL"]').click();
    cy.get(panel).should('be.visible');
    waitForE2eApiCall(`${prefix}/sql-context`, 'GET');
    cy.get(`${panel} .monaco-editor .view-lines`).click(80, 9);
    cy.get(`${panel} .monaco-editor textarea.inputarea`).should('be.focused');
    cy.then(() =>
      Cypress.automation('remote:debugger:protocol', {
        command: 'Input.insertText',
        params: { text: sql },
      })
    );
    cy.then(() => {
      expect(getE2eApiCalls(`${prefix}/sql-compilation`, 'POST')).to.have.length(0);
      expect(getE2eApiCalls(`${prefix}/data-sample`, 'POST')).to.have.length(0);
    });
    cy.get('[data-slot="canvas-model-tab-close"]').click();
    cy.get('[role="alertdialog"]').should('be.visible');
    cy.contains('[role="alertdialog"] button', 'Keep editing').click();
    cy.get(panel)
      .should('be.visible')
      .find('.view-lines')
      .should(($lines) => {
        expect($lines.text().replaceAll('\u00a0', ' ').trim()).to.equal(sql);
      });
    cy.contains(`${panel} button`, 'Validate').should('be.enabled').click();
    waitForE2eApiCall(`${prefix}/sql-compilation`, 'POST');
    let writesBefore = 0;
    cy.then(() => {
      writesBefore = getE2eApiCalls('/workspace/graph/draft', 'PUT').length;
    });
    cy.get(`${panel} .monaco-editor .view-lines`).click(80, 9);
    cy.get(`${panel} .monaco-editor textarea.inputarea`).should('be.focused');
    for (const type of ['keyDown', 'keyUp'])
      cy.then(() =>
        Cypress.automation('remote:debugger:protocol', {
          command: 'Input.dispatchKeyEvent',
          params: {
            type,
            key: 'Enter',
            code: 'Enter',
            windowsVirtualKeyCode: 13,
            nativeVirtualKeyCode: 13,
            modifiers: 2,
          },
        })
      );
    waitForE2eApiCall(`${prefix}/data-sample`, 'POST');
    cy.contains('[data-slot="canvas-model-data"]', 'SQL_ROW_3944').should('be.visible');
    cy.get(panel).should('be.visible');
    cy.then(() =>
      expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(writesBefore)
    );
    cy.screenshot('gh3944-model-sql-data', { capture: 'fullPage' });
    cy.contains(`${panel} button`, 'Generate Model').should('be.enabled').click();
    cy.wrap(null).should(() => {
      const saves = getE2eApiCalls('/workspace/graph/draft', 'PUT');
      expect(saves.length).to.be.greaterThan(writesBefore);
      const saved = WorkspaceGraphDraftSaveRequestSchema.parse(saves.at(-1)!.body).draft;
      const authority = saved.nodes.find((node) => node.id === model.id)!.metadata!
        .transformAuthoring;
      expect(authority).to.have.property('semanticDocument');
    });
    cy.get('[data-slot="canvas-relational-tree-output"]').should('be.visible');
    cy.get('[data-slot="canvas-model-save-status"]').should('have.text', 'Synced');
    cy.then(() =>
      cy.writeFile(
        '../../.dvt/evidence/gh3944/saved-browser-draft.json',
        WorkspaceGraphDraftSaveRequestSchema.parse(
          getE2eApiCalls('/workspace/graph/draft', 'PUT').at(-1)!.body
        ).draft
      )
    );
    cy.get('button[aria-label="Collapse SQL panel"]').last().click();
    cy.get('button[aria-label="Open Model SQL"]').should('have.attr', 'aria-expanded', 'false');
    let readsBefore = 0;
    cy.then(() => {
      readsBefore = getE2eApiCalls('/workspace/graph/draft', 'GET').length;
    });
    visitWithE2eWorkspaceSession('/canvas', {
      onBeforeLoad(window) {
        window.localStorage.setItem(
          'dvt-web-application-language',
          JSON.stringify({ state: { language: 'en' }, version: 0 })
        );
      },
    });
    cy.wrap(null).should(() =>
      expect(getE2eApiCalls('/workspace/graph/draft', 'GET').length).to.be.greaterThan(readsBefore)
    );
    cy.get(`.react-flow__node[data-id="${model.id}"] [data-slot="canvas-node-shell"]`).dblclick(
      40,
      18
    );
    cy.get('[data-slot="canvas-relational-tree-output-open"]').should('be.visible').click();
    cy.get('[data-slot="canvas-model-output-inspector"]')
      .should('be.visible')
      .find('[data-slot="canvas-operation-output-tab"]')
      .click();
    cy.get('[data-slot="canvas-model-output-inspector"]').should('contain.text', 'country');
  });
});
