/** Owned concern: prove independent references retain file authority through placement, removal and relocation. */
import {
  DbtProjectGraphProjectionSchema,
  WorkspaceGraphAuthoringDraftSchema,
  type DbtProjectGraphProjection,
} from '@dvt/contracts';

import { openCanvasNodeOperations, clickCanvasContextMenuItem } from './canvasExecutionSelection';
import { dragCanvasNodeByViewportDelta } from './canvasGraphAuthoring';
import { getE2eApiCalls, stubE2eApi, stubE2eJsonApi } from './e2eApiStub';
import { openWorkbenchProperties, revisitWorkbenchCanvas } from './relationalWorkbench/navigation';
import { dragWorkbenchField } from './relationalWorkbench/pointer';
function buildFileModelProject(
  binding: DbtProjectGraphProjection['authorityBinding']
): DbtProjectGraphProjection {
  return DbtProjectGraphProjectionSchema.parse({
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
}

export function prepareFileModelReferences(): Readonly<{ canvasId: string; relocate: () => void }> {
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
  const project = buildFileModelProject(binding);
  let currentProject = project;
  stubE2eApi('GET', '/workspace/dbt/graph', () => ({ body: currentProject }));
  const relocatedBinding = {
    ...binding,
    authority: { ...binding.authority, projectRoot: 'models' },
  };
  return {
    canvasId: binding.canvasId,
    relocate: () => {
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
    },
  };
}

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

export const FILE_MODEL_ROW =
  '[data-slot="canvas-explorer"] [data-element-id="dbt-model-reference:file-owner:model.demo.clientes"]';
export function inspectUnplacedFileModel(): void {
  cy.get(FILE_MODEL_ROW)
    .should('be.visible')
    .and('not.be.disabled')
    .and('contain.text', 'clientes')
    .and('contain.text', 'SQL');
  assertDisclosedModelPath(FILE_MODEL_ROW, 'models/clientes.sql');
  // A discovered file model is inspected with its current authority before any definition exists.
  cy.get(FILE_MODEL_ROW).click();
  cy.get('[data-slot="canvas-node-workbench-tab-general"]')
    .should('have.attr', 'aria-selected', 'true')
    .and('contain.text', 'Overview');
  cy.get('[data-slot="canvas-node-workbench-panel"]').should('contain.text', 'clientes');
  cy.get('.react-flow__node').should('have.length', 0);
  cy.get('#canvas-code-main-tab').should('not.exist');
  cy.get('[data-slot="canvas-node-workbench-close"]').click();
  cy.get(FILE_MODEL_ROW).should('be.focused');
}

export function placeFileModelReferences(canvasId: string): void {
  dragWorkbenchField(FILE_MODEL_ROW, '[data-testid="canvas-viewport"]');
  cy.get('.react-flow__node').should('have.length', 1);
  cy.get('.react-flow__node').invoke('attr', 'data-id').as('firstFileInstance');
  assertDisclosedModelPath(FILE_MODEL_ROW, 'models/clientes.sql');
  cy.get(FILE_MODEL_ROW).click();
  cy.get('[data-slot="canvas-node-workbench-tab-general"]').should(
    'have.attr',
    'aria-selected',
    'true'
  );
  cy.get('.react-flow__node').should('have.length', 1);
  cy.get('[data-slot="canvas-node-workbench-close"]').click();
  // A second actual drag creates the independent reference; clicking the registered row cannot.
  dragWorkbenchField(FILE_MODEL_ROW, '[data-testid="canvas-viewport"]');
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
      canvasId: canvasId,
      uniqueId: 'model.demo.clientes',
    });
    expect(instances.every((node) => node.metadata == null)).to.equal(true);
    expect(draft.edges).to.have.length(0);
    expect(JSON.stringify(draft)).not.to.contain('compiledSql');
    expect(getE2eApiCalls('/workspace/dbt/graph-artifacts/publications', 'POST')).to.have.length(0);
    expect(getE2eApiCalls('/workspace/files/models%2Fclientes.sql', 'GET')).to.have.length(0);
  });
}

export function reopenFileModelReferences(): void {
  revisitWorkbenchCanvas();
  cy.get('.react-flow__node').should('have.length', 2);
  cy.get<string>('@firstFileInstance').then((nodeId) => {
    cy.get(`.react-flow__node[data-id="${nodeId}"]`).should('contain.text', 'models/clientes.sql');
    dragCanvasNodeByViewportDelta('clientes', { x: 110, y: 80 }, { nodeId });
  });
  revisitWorkbenchCanvas();
  cy.get('.react-flow__node').should('have.length', 2);
  assertDisclosedModelPath(FILE_MODEL_ROW, 'models/clientes.sql');
}

export function removeFileModelReference(): void {
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
}

export function assertRelocatedFileAuthority(): void {
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
}
