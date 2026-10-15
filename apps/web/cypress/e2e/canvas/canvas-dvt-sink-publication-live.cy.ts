/** Public authoring -> immutable PlanRef -> one explicit PostgreSQL Sink -> rendered rows. */
import { WorkspaceGraphAuthoringDraftSchema, type WorkspaceGraphDraftScope } from '@dvt/contracts';

import {
  clickCanvasAddCatalogAction,
  clickCanvasContextMenuAction,
  openCanvasContextMenuAt,
} from '../../support/canvasExecutionSelection';
import {
  connectCanvasNodes,
  getVisibleCanvasNodeByCardTitle,
} from '../../support/canvasGraphAuthoring';
import { resetE2eApiStubs } from '../../support/e2eApiStub';
import { hasLiveProtectedRuntimeEnv, readLiveGraphDraft } from '../../support/liveProtectedRuntime';
import {
  createPublicationWorkspace,
  loadPublicationRows,
  publicationRows,
  runPublicationModel,
} from '../../support/postgresPublicationFlow';
import { openWorkbenchProperties } from '../../support/relationalWorkbench/navigation';

describe('Explicit PostgreSQL Sink live', () => {
  beforeEach(function () {
    if (!hasLiveProtectedRuntimeEnv()) this.skip();
    resetE2eApiStubs();
  });

  it('authors and reloads a transient TRIM/JOIN model, then publishes only through its explicit Sink', () => {
    let scope: WorkspaceGraphDraftScope;
    let sinkId = '';
    let modelId = '';
    let connectionId = '';
    const schema: unknown = Cypress.env('postgresTargetSchema');
    if (typeof schema !== 'string' || schema.trim().length === 0)
      throw new Error('postgresTargetSchema is required');
    const relation = 'pcv1_explicit_sink';
    createPublicationWorkspace('Explicit Sink').then((workspace) => {
      ({ scope, modelId, connectionId } = workspace);
      openWorkbenchProperties(modelId);
      cy.get('select[name="dvt-transform-materialization"]').select('ephemeral');
      cy.get('[data-slot="dvt-transform-result-target"]').should('not.exist');
      cy.contains('[data-slot="canvas-node-workbench-panel"] button', /^Apply$/).click();
      cy.get('[data-slot="canvas-node-workbench-close"]').click();
    });
    openCanvasContextMenuAt(1050, 700);
    clickCanvasContextMenuAction('open-add-node-catalog');
    clickCanvasAddCatalogAction('create-node', 'dvt:sink');
    getVisibleCanvasNodeByCardTitle('Sink 1')
      .invoke('attr', 'data-id')
      .then((id) => {
        sinkId = id!;
      });
    cy.get('[data-slot="canvas-draft-save-status"]').should('not.exist');
    connectCanvasNodes('Model 1', 'Sink 1');
    cy.get('.react-flow__edge').should('have.length', 3);
    cy.then(() => {
      openWorkbenchProperties(sinkId);
      cy.get('select[name="dvt-sink-connection"]').should('have.value', '').select(connectionId);
      cy.get('input[name="dvt-sink-schema"]').clear().type(schema);
      cy.get('input[name="dvt-sink-table"]').clear().type(relation);
      cy.get('select[name="dvt-sink-materialization"]').should('have.value', 'table');
      cy.get('select[name="dvt-sink-write-mode"]').should('have.value', 'replace');
      cy.contains('[data-slot="canvas-node-workbench-panel"] button', /^Apply$/).click();
      cy.get('[data-slot="canvas-node-workbench-close"]').click();
    });
    cy.get('[data-slot="canvas-draft-save-status"]').should('not.exist');
    cy.then(() => readLiveGraphDraft(scope)).then(({ status, body }) => {
      expect(status).to.equal(200);
      const draft = WorkspaceGraphAuthoringDraftSchema.parse(
        (body as { record: { draft: unknown } }).record.draft
      );
      const transformConfig = draft.nodes.find((node) => node.id === modelId)!.metadata!.config;
      expect(transformConfig)
        .to.include({ materialized: 'ephemeral' })
        .and.not.have.property('resultTarget');
      expect(draft.nodes.find((node) => node.id === sinkId)!.metadata!.config).to.deep.include({
        schema,
        table: relation,
        materialization: 'table',
        writeMode: 'replace',
        connectionRef: { schemaVersion: 'connection-ref.v1', connectionId, provider: 'postgres' },
      });
    });
    cy.reload();
    cy.then(() => {
      openWorkbenchProperties(sinkId);
      cy.get('select[name="dvt-sink-connection"]').should('have.value', connectionId);
      cy.get('input[name="dvt-sink-table"]').should('have.value', relation);
      cy.get('[data-slot="canvas-node-workbench-close"]').click();
    });
    cy.intercept('GET', '**/source-data-sample?*').as('publicationSample');
    cy.then(() => runPublicationModel(sinkId, scope)).then(({ evidence }) => {
      expect(evidence.target).to.deep.include({ schema, relation });
      expect(evidence.publication.outcome).to.equal('created');
      loadPublicationRows(evidence.publication.token, publicationRows);
    });
  });
});
