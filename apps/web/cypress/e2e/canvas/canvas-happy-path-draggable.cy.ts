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
import {
  getE2eApiCalls,
  stubE2eApi,
  stubE2eJsonApi,
  waitForE2eApiCall,
} from '../../support/e2eApiStub';
import { pressNativeKey } from '../../support/nativeKeyboard';
import {
  openWorkbenchProperties,
  revisitWorkbenchCanvas,
  visitWorkbenchCanvas,
} from '../../support/relationalWorkbench/navigation';
import { dragWorkbenchField } from '../../support/relationalWorkbench/pointer';
import { E2E_PROJECT_WORKSPACE, stubShellBootstrapApis } from '../../support/workspaceSession';

function assertDisclosedModelPath(row: string, path: string): void {
  const parent = '[data-slot="canvas-explorer-model-row"]';
  cy.get(row)
    .closest(parent)
    .find('[data-slot="canvas-explorer-model-disclosure"]')
    .then(($button) => {
      if ($button.attr('aria-expanded') === 'false') cy.wrap($button).click();
    });
  cy.get(row).closest(parent).find('dl').should('be.visible').and('contain.text', path);
}

describe('Canvas happy path remains writable after create/save', () => {
  let initialDraft: ReturnType<typeof stubStatefulCanvasDraftAuthoring>;
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
    initialDraft = stubStatefulCanvasDraftAuthoring({
      emptyCanvas: true,
      canvasKind: 'transformation',
    });
    stubE2eJsonApi('GET', '/workspace/warehouse/connections', [
      { id: 'warehouse', name: 'Project warehouse', type: 'postgres', database: 'analytics' },
    ]);
  });

  it('keeps Source models in one searchable catalog and metadata disclosure separate from placement', () => {
    // A source facet must survive without a physical binding; an input seed must not acquire it.
    let writesBeforeDisclosure = 0;
    stubE2eJsonApi('GET', '/workspace/files', []);
    initialDraft.nodes.push(
      {
        id: 'catalog-client',
        name: 'Customers',
        pluginId: 'dvt',
        kind: 'dvt:source',
        role: 'input',
        status: 'idle',
        tags: [],
        metadata: { resourceType: 'source', schema: 'raw', tableIdentifier: 'client' },
      },
      {
        id: 'catalog-revenue',
        name: 'Revenue without physical connection',
        pluginId: 'dvt',
        kind: 'dvt:transform',
        role: 'transform',
        status: 'idle',
        tags: [],
      },
      {
        id: 'catalog-seed',
        name: 'Country seed',
        pluginId: 'dbt',
        kind: 'dbt:seed',
        role: 'input',
        status: 'idle',
        tags: [],
        metadata: { resourceType: 'seed' },
      }
    );
    visitWorkbenchCanvas('es');
    cy.get('[data-slot="canvas-explorer-model-count"]').should('have.text', '3');
    cy.get('[data-slot="canvas-explorer-models"]')
      .should('contain.text', 'Customers')
      .and('contain.text', 'Revenue without physical connection')
      .and('contain.text', 'Country seed');
    cy.get('[data-element-id="catalog-client"]').should('contain.text', 'Fuente');
    cy.get('[data-element-id="catalog-seed"]').should('not.contain.text', 'Fuente');
    cy.get('[data-slot="canvas-explorer-models"] [data-model-icon="model"]').should(
      'have.length',
      3
    );
    cy.get('[data-slot="canvas-explorer-connections"] button[aria-expanded]').first().focus();
    pressNativeKey('Enter');
    cy.get('[data-slot="canvas-explorer-connection-count"]').should('have.text', '1');
    cy.get('[data-slot="canvas-explorer-connections"]').should('contain.text', 'Project warehouse');
    // Entry normalization autosaves; wait for its real acknowledgement before measuring disclosure.
    waitForE2eApiCall('/workspace/graph/draft', 'PUT');
    cy.get('[data-slot="canvas-draft-save-status"]').should('not.exist');
    cy.then(() => {
      writesBeforeDisclosure = getE2eApiCalls('/workspace/graph/draft', 'PUT').length;
    });
    cy.get(
      '[data-slot="canvas-explorer-model-disclosure"][data-model-id="catalog-client"]'
    ).focus();
    cy.press(Cypress.Keyboard.Keys.SPACE);
    cy.get('[data-slot="canvas-explorer-model-disclosure"][data-model-id="catalog-client"]')
      .should('have.attr', 'aria-expanded', 'true')
      .and('be.focused');
    cy.get('.react-flow__node').should('have.length', 0);
    cy.then(() =>
      expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(writesBeforeDisclosure)
    );
    cy.get('[data-slot="canvas-explorer-models"] input[type="search"]').type('Fuente');
    cy.get('[data-slot="canvas-explorer-model-count"]').should('have.text', '1');
    cy.get('[data-element-id="catalog-client"]').should('be.visible');
    cy.get('[data-element-id="catalog-seed"]').should('not.exist');
    cy.get('[data-slot="canvas-explorer-models"] input[type="search"]')
      .clear()
      .type('no-such-model');
    cy.get('[data-slot="canvas-explorer-model-count"]').should('have.text', '0');
    cy.get('[data-slot="canvas-explorer-models"]').should('contain.text', 'No hay coincidencias.');
    cy.get('[data-slot="canvas-explorer-models"] input[type="search"]').clear();
    cy.get(
      '[data-slot="canvas-explorer-model-disclosure"][data-model-id="catalog-client"]'
    ).click();
    cy.get('[data-slot="canvas-explorer-connections"] button[aria-expanded]').first().click();
    cy.get('[data-element-id="catalog-client"]').should(($button) => {
      const button = $button[0]!;
      const document = button.ownerDocument;
      const window = document.defaultView!;
      const rootStyle = window.getComputedStyle(document.documentElement);
      const roleSize = (role: string): number =>
        Number.parseFloat(rootStyle.getPropertyValue(role)) * Number.parseFloat(rootStyle.fontSize);
      const controlSize = roleSize('--text-ui');
      const canvasTab = document.getElementById('canvas-workspace-tab')!;
      expect(
        Number.parseFloat(window.getComputedStyle(canvasTab).fontSize),
        'surrounding Canvas tab'
      ).to.be.at.least(controlSize);
      for (const control of [
        button,
        document.querySelector('[data-slot="canvas-explorer"] h3')!,
        document.querySelector('[data-slot="canvas-explorer-models"] button[aria-expanded]')!,
        document.querySelector('[data-slot="canvas-explorer-models"] input[type="search"]')!,
      ]) {
        expect(
          Number.parseFloat(window.getComputedStyle(control).fontSize),
          'shared UI control scale'
        ).to.equal(controlSize);
      }
      const facet = document.getElementById(button.getAttribute('aria-describedby')!);
      expect(facet, 'the real Source property remains accessible').not.to.equal(null);
      expect(Number.parseFloat(window.getComputedStyle(facet!).fontSize)).to.equal(
        roleSize('--text-ui-micro')
      );
      expect(roleSize('--text-ui-micro')).to.be.lessThan(controlSize);
    });
    cy.contains('[data-slot="canvas-explorer"] h3', 'Explorador').should('be.visible');
    cy.get('[data-slot="canvas-explorer"]').screenshot('project-catalog--connections-models');
    cy.viewport(1544, 868);
    cy.document().should((document) => {
      expect(document.documentElement.scrollWidth).to.be.at.most(1544);
    });
    cy.get('[data-element-id="catalog-client"]').dblclick();
    cy.get('.react-flow__node').should('have.length', 1);
    cy.get('[data-element-id="catalog-client"]').should('have.attr', 'aria-pressed', 'true');
    // Check the actual placement control before the native gesture.
    cy.get('[data-element-id="catalog-client"]')
      .should('be.enabled')
      .and('have.attr', 'draggable', 'true');
    dragWorkbenchField('[data-element-id="catalog-client"]', '[data-testid="canvas-viewport"]');
    cy.get('.react-flow__node').should('have.length', 2);
    cy.get('[data-slot="canvas-explorer-model-count"]').should('have.text', '3');
    cy.get('#canvas-code-main-tab').should('not.exist');
    cy.then(() => expect(getE2eApiCalls('/workspace/files', 'POST')).to.have.length(0));
    // Element screenshots restore runner geometry asynchronously; capture after native gestures.
    cy.get('[data-slot="canvas-explorer"]').screenshot('project-catalog--desktop');
  });

  it('creates independent file-model references through Elements without navigating to Code or creating SQL files', () => {
    const binding = {
      schemaVersion: 'canvas-authoring-authority-binding.v1',
      canvasId: 'file-owner',
      authority: { kind: 'dbt-project-files', projectRoot: '.' },
    } as const;
    let currentRoot = '.';
    stubE2eApi('GET', '/workspace/files', () => ({
      body: [
        {
          name: 'dbt_project.yml',
          path: currentRoot === '.' ? 'dbt_project.yml' : 'models/dbt_project.yml',
          kind: 'file',
        },
      ],
    }));
    stubE2eApi('GET', /\/workspace\/files\/.*dbt_project.yml$/, () => ({
      body: {
        name: 'dbt_project.yml',
        path: currentRoot === '.' ? 'dbt_project.yml' : 'models/dbt_project.yml',
        language: 'yaml',
        content: 'name: demo',
        contentSha256: 'c'.repeat(64),
        lastModified: '2026-11-04T00:00:00.000Z',
        authoringAuthority: {
          kind: 'resolved',
          binding: { ...binding, authority: { ...binding.authority, projectRoot: currentRoot } },
        },
      },
    }));
    const project = DbtProjectGraphProjectionSchema.parse({
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
    });
    let currentProject = project;
    stubE2eApi('GET', '/workspace/dbt/graph', () => ({ body: currentProject }));
    visitWorkbenchCanvas('en');
    const modelRow =
      '[data-slot="canvas-explorer"] [data-element-id="dbt-model-reference:file-owner:model.demo.clientes"]';
    cy.get(modelRow)
      .should('be.visible')
      .and('not.be.disabled')
      .and('contain.text', 'clientes')
      .and('contain.text', 'SQL');
    assertDisclosedModelPath(modelRow, 'models/clientes.sql');
    dragWorkbenchField(modelRow, '[data-testid="canvas-viewport"]');
    cy.get('.react-flow__node').should('have.length', 1);
    cy.get('.react-flow__node').invoke('attr', 'data-id').as('firstFileInstance');
    assertDisclosedModelPath(modelRow, 'models/clientes.sql');
    cy.get(modelRow).click();
    cy.get('.react-flow__node').should('have.length', 2);
    cy.get('#canvas-code-main-tab').should('not.exist');
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
    assertDisclosedModelPath(modelRow, 'models/clientes.sql');
    openCanvasNodeOperations('clientes 2');
    clickCanvasContextMenuItem('Delete');
    cy.get('.react-flow__node').should('have.length', 1);
    cy.wrap(null).should(() => {
      const saved = getE2eApiCalls('/workspace/graph/draft', 'PUT').at(-1)?.body as
        { draft: unknown } | undefined;
      expect(
        WorkspaceGraphAuthoringDraftSchema.parse(saved?.draft).nodes.filter(
          (node) => node.definitionId != null
        )
      ).to.have.length(1);
    });
    const relocatedBinding = {
      ...binding,
      authority: { ...binding.authority, projectRoot: 'models' },
    };
    cy.then(() => {
      // The relocation result changes file authority; already placed definitions remain untouched.
      currentRoot = 'models';
      currentProject = {
        ...project,
        authorityBinding: relocatedBinding,
        projectRevision: { ...project.projectRevision, projectRoot: 'models' },
      };
      stubE2eJsonApi('GET', '/workspace/files/models%2Fmodels%2Fclientes.sql', {
        name: 'clientes.sql',
        path: 'models/models/clientes.sql',
        language: 'sql',
        content: 'select 7 as relocated_client',
        contentSha256: 'e'.repeat(64),
        lastModified: '2026-11-06T00:00:00.000Z',
        authoringAuthority: { kind: 'resolved', binding: relocatedBinding },
      });
    });
    for (let reload = 0; reload < 2; reload += 1) {
      revisitWorkbenchCanvas();
      cy.get('.react-flow__node').should('have.length', 1);
      cy.get<string>('@firstFileInstance').then((nodeId) => openWorkbenchProperties(nodeId));
      cy.get('[data-slot="canvas-node-workbench-tab-code"]').click();
      cy.get('[data-slot="canvas-node-workbench-panel"] [data-slot="workspace-file-code-editor"]')
        .should('have.attr', 'data-file-path', 'models/models/clientes.sql')
        .find('.view-lines')
        .should('contain.text', 'relocated_client');
      cy.then(() => {
        expect(getE2eApiCalls('/workspace/files/models%2Fclientes.sql', 'GET')).to.have.length(0);
        expect(getE2eApiCalls('/workspace/dbt/analysis/selected-model', 'GET')).to.have.length(0);
        expect(getE2eApiCalls(/\/workspace\/files\/.+/, 'POST')).to.have.length(0);
      });
      cy.get('[data-slot="canvas-node-workbench-close"]').click();
      cy.get('[data-slot="canvas-node-workbench-panel"]').should('not.exist');
    }
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
        cy.get('a[data-slot="left-navigation-link"][href="/canvas"]')
          .click()
          .should('have.attr', 'aria-expanded', 'true');
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
