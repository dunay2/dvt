/**
 * Owned concern: prove a newly saved Canvas model stays editable and draggable after reopening.
 * @baseline GH-3578: blank-source creation is retired; creation and save are still required.
 * @decision Create a real model through the catalog and reuse the public Canvas drag gesture.
 * @consequence No duplicate drag engine, optional legacy path or seeded-created node hides failure.
 * @version 1.0.0
 */
import {
  DbtProjectGraphProjectionSchema,
  WorkspaceGraphAuthoringDraftSchema,
} from '@dvt/contracts';

import { resolveCanvasViewCopy } from '../../../src/app/views/canvas/copy';
import { stubStatefulCanvasDraftAuthoring } from '../../support/canvasDraftAuthoring';
import {
  clickCanvasContextMenuItem,
  openCanvasNodeOperations,
  openCanvasContextMenuAt,
} from '../../support/canvasExecutionSelection';
import { dragCanvasNodeByViewportDelta } from '../../support/canvasGraphAuthoring';
import { getE2eApiCalls, stubE2eJsonApi } from '../../support/e2eApiStub';
import {
  revisitWorkbenchCanvas,
  visitWorkbenchCanvas,
} from '../../support/relationalWorkbench/navigation';
import { dragWorkbenchField } from '../../support/relationalWorkbench/pointer';
import { E2E_PROJECT_WORKSPACE, stubShellBootstrapApis } from '../../support/workspaceSession';

describe('Canvas happy path remains writable after create/save', () => {
  beforeEach(() => {
    stubShellBootstrapApis({
      scopes: ['workspace:files:view', 'workspace:graph-draft:view', 'workspace:graph-draft:save'],
    });
    stubE2eJsonApi('GET', '/capabilities', {
      apiVersion: '1.0.0',
      minFrontendVersion: '0.0.1',
      plugins: { dvt: { available: true } },
    });
    stubE2eJsonApi('GET', '/workspace/context', {
      defaultWorkspace: E2E_PROJECT_WORKSPACE,
      availableWorkspaces: [E2E_PROJECT_WORKSPACE],
    });
    stubStatefulCanvasDraftAuthoring({ emptyCanvas: true, canvasKind: 'transformation' });
  });

  it('creates independent file-model references through Elements without navigating to Code or creating SQL files', () => {
    const binding = {
      schemaVersion: 'canvas-authoring-authority-binding.v1',
      canvasId: 'file-owner',
      authority: { kind: 'dbt-project-files', projectRoot: '.' },
    } as const;
    stubE2eJsonApi('GET', '/workspace/files', [
      { name: 'dbt_project.yml', path: 'dbt_project.yml', kind: 'file' },
    ]);
    stubE2eJsonApi('GET', '/workspace/files/dbt_project.yml', {
      name: 'dbt_project.yml',
      path: 'dbt_project.yml',
      language: 'yaml',
      content: 'name: demo',
      contentSha256: 'c'.repeat(64),
      lastModified: '2026-11-04T00:00:00.000Z',
      authoringAuthority: { kind: 'resolved', binding },
    });
    stubE2eJsonApi(
      'GET',
      '/workspace/dbt/graph',
      DbtProjectGraphProjectionSchema.parse({
        schemaVersion: 'dbt-project-graph-projection.v1',
        authorityBinding: binding,
        freshness: 'fresh',
        adapterType: 'postgres',
        analysisSha256: 'a'.repeat(64),
        projectRevision: {
          projectRoot: '.',
          projectName: 'demo',
          contentSetSha256: 'b'.repeat(64),
          analyzedAt: '2026-11-04T00:00:00.000Z',
          analyzerVersion: 'native-dbt',
          dbtVersion: '1.10.0',
        },
        nodes: [
          {
            uniqueId: 'model.demo.clientes',
            resourceType: 'model',
            name: 'clientes',
            packageName: 'demo',
            originalFilePath: 'models/clientes.sql',
            columns: [{ name: 'client_id', dataType: 'text' }],
            tags: [],
            visualEditability: { status: 'code_only', reasons: ['File authority'] },
          },
        ],
        edges: [],
        diagnostics: [],
        capabilities: { canPreview: true, canRun: true, codeOnlyResourceCount: 1 },
        executionTarget: {
          provider: 'temporal',
          adapter: 'postgres',
          targetName: 'dev',
          connectionRef: {
            schemaVersion: 'connection-ref.v1',
            provider: 'postgres',
            connectionId: 'warehouse',
          },
          credentialRef: 'env:DBT_PROFILES_DIR',
          resolutionSource: 'environment-default',
        },
      })
    );
    visitWorkbenchCanvas('en');
    const modelRow =
      '[data-slot="canvas-explorer"] [data-element-id="dbt-model-reference:file-owner:model.demo.clientes"]';
    cy.get(modelRow)
      .should('be.visible')
      .and('not.be.disabled')
      .and('contain.text', 'models/clientes.sql');
    dragWorkbenchField(modelRow, '[data-testid="canvas-viewport"]');
    cy.get('.react-flow__node').should('have.length', 1);
    cy.get('.react-flow__node').invoke('attr', 'data-id').as('firstFileInstance');
    cy.get(modelRow).should('contain.text', 'models/clientes.sql');
    cy.get(modelRow).click();
    cy.get('.react-flow__node').should('have.length', 2);
    cy.get('#canvas-code-main-tab').should('have.attr', 'aria-selected', 'false');
    cy.wrap(null).should(() => {
      const saved = getE2eApiCalls('/workspace/graph/draft', 'PUT').at(-1)?.body as
        { draft: unknown } | undefined;
      const draft = WorkspaceGraphAuthoringDraftSchema.parse(saved?.draft);
      const instances = draft.nodes.filter((node) => node.definitionId != null);
      expect(instances).to.have.length(2);
      expect(new Set(instances.map((node) => node.id)).size).to.equal(2);
      expect(new Set(instances.map((node) => node.definitionId)).size).to.equal(1);
      const definition = draft.nodes.find((node) => node.id === instances[0]!.definitionId)!;
      expect(definition.metadata?.dbtModelReference).to.include({
        canvasId: binding.canvasId,
        uniqueId: 'model.demo.clientes',
      });
      expect(instances.every((node) => node.metadata == null)).to.equal(true);
      expect(draft.edges).to.have.length(0);
      expect(JSON.stringify(draft)).not.to.contain('compiledSql');
      expect(getE2eApiCalls('/workspace/dbt/graph-artifacts/publications', 'POST')).to.have.length(
        0
      );
      expect(getE2eApiCalls('/workspace/files/models%2Fclientes.sql', 'GET')).to.have.length(0);
    });
    revisitWorkbenchCanvas();
    cy.get('.react-flow__node').should('have.length', 2);
    cy.get<string>('@firstFileInstance').then((nodeId) => {
      cy.get(`.react-flow__node[data-id="${nodeId}"]`).should(
        'contain.text',
        'models/clientes.sql'
      );
      dragCanvasNodeByViewportDelta('clientes', { x: 110, y: 80 }, { nodeId });
    });
    revisitWorkbenchCanvas();
    cy.get('.react-flow__node').should('have.length', 2);
    cy.get(modelRow).should('contain.text', 'models/clientes.sql');
    openCanvasNodeOperations('clientes 2');
    clickCanvasContextMenuItem('Delete');
    cy.get('.react-flow__node').should('have.length', 1);
  });

  it('creates and saves a model, reopens without a projection gap, and allows drag', () => {
    const copy = resolveCanvasViewCopy('en');
    cy.viewport(1280, 720);
    visitWorkbenchCanvas('en');
    cy.get('html').should('have.attr', 'lang', 'en');
    cy.get('.react-flow__node').should('not.exist');
    openCanvasContextMenuAt(320, 240);
    clickCanvasContextMenuItem('Add...');
    cy.get(
      '[data-slot="canvas-context-menu-add-catalog-item"][data-registration-kind="dvt:transform"]'
    )
      .should('be.visible')
      .click();
    cy.get('.react-flow__node')
      .should('have.length', 1)
      .invoke('attr', 'data-id')
      .then((nodeId) => {
        expect(nodeId, 'created model identity').to.be.a('string').and.not.be.empty;
        cy.wrap(null).should(() => {
          const saved = getE2eApiCalls('/workspace/graph/draft', 'PUT').at(-1)?.body as
            { draft: unknown } | undefined;
          expect(saved, 'real model save').not.to.be.undefined;
          const draft = WorkspaceGraphAuthoringDraftSchema.parse(saved!.draft);
          expect(draft.nodes).to.have.length(1);
          expect(draft.nodes[0]).to.include({ id: nodeId, name: 'Model 1', kind: 'transform' });
        });
        cy.get('[data-slot="canvas-draft-save-status"]').should('not.exist');
        revisitWorkbenchCanvas();
        cy.get('.react-flow__node').should('have.length', 1).and('have.attr', 'data-id', nodeId);
        cy.contains(copy.draftProjectionGapTitle).should('not.exist');
        cy.get('[data-slot="canvas-draft-save-status"]').should('not.exist');
        cy.screenshot('canvas-happy-path-before-drag');
        dragCanvasNodeByViewportDelta('Model 1', { x: 110, y: 80 }, { nodeId: nodeId! });
        cy.contains(copy.draftProjectionGapTitle).should('not.exist');
        cy.get('[data-slot="canvas-draft-save-status"]').should('not.exist');
        cy.screenshot('canvas-happy-path-after-drag');
        cy.get('[data-slot="canvas-explorer-elements-toggle"]').then(($button) => {
          if ($button.attr('aria-expanded') === 'false') cy.wrap($button).click();
        });
        cy.get(`[data-slot="canvas-explorer"] [data-element-id="${nodeId}"]`)
          .should('be.visible')
          .click();
        cy.get('.react-flow__node').should('have.length', 2);
        cy.wrap(null).should(() => {
          const saved = getE2eApiCalls('/workspace/graph/draft', 'PUT').at(-1)?.body as
            { draft: unknown } | undefined;
          const graph = WorkspaceGraphAuthoringDraftSchema.parse(saved?.draft);
          const instance = graph.nodes.find((node) => node.definitionId === nodeId);
          expect(instance, 'independent reference to the original model').to.exist;
          expect(instance!.id).not.to.equal(nodeId);
          expect(instance!.metadata, 'configuration is owned by the definition').to.be.undefined;
          expect(graph.edges, 'creating an instance adds no dependency').to.have.length(0);
        });
        revisitWorkbenchCanvas();
        cy.get('.react-flow__node').should('have.length', 2);
        cy.get('[data-slot="canvas-draft-save-status"]').should('not.exist');
        openCanvasNodeOperations('Model 1 2');
        clickCanvasContextMenuItem('Delete');
        cy.get('.react-flow__node').should('have.length', 1).and('have.attr', 'data-id', nodeId);
        cy.wrap(null).should(() => {
          const saved = getE2eApiCalls('/workspace/graph/draft', 'PUT').at(-1)?.body as
            { draft: unknown } | undefined;
          const graph = WorkspaceGraphAuthoringDraftSchema.parse(saved?.draft);
          expect(graph.nodeIds).to.deep.equal([nodeId]);
          expect(graph.nodes.map((node) => node.id)).to.deep.equal([nodeId]);
          expect(graph.edges).to.have.length(0);
        });
      });
  });
});
