import {
  stubFailingCanvasDraftSave,
  stubCanvasDraftRead,
  stubCanvasDraftSave,
  stubStatefulCanvasDraftAuthoring,
} from '../../support/canvasDraftAuthoring';
import {
  getE2eApiCalls,
  getLastE2eApiCall,
  stubE2eJsonApi,
  waitForE2eApiCall,
} from '../../support/e2eApiStub';
import {
  stubShellBootstrapApis,
  visitWithE2eWorkspaceSession,
} from '../../support/workspaceSession';

type CanvasDraftSaveRequestBody = {
  draft: {
    nodeIds: string[];
    nodes: Array<{
      id: string;
      name: string;
      kind: string;
      pluginId: string;
    }>;
  };
};

function stubRuntimeCapabilities(): void {
  stubE2eJsonApi('GET', '/capabilities', {
    apiVersion: '1.0.0',
    minFrontendVersion: '0.0.1',
    plugins: {
      dvt: { available: true },
    },
  });
}

function visitReadyCanvas(): void {
  visitWithE2eWorkspaceSession('/canvas');
  waitForE2eApiCall('/healthz', 'GET');
  waitForE2eApiCall('/readyz', 'GET');
  waitForE2eApiCall('/version', 'GET');
  waitForE2eApiCall('/db/ready', 'GET');
  waitForE2eApiCall('/capabilities', 'GET');
  waitForE2eApiCall('/workspace/graph/draft', 'GET');
}

function showExplorerPanel(): void {
  cy.get('[aria-label="Show explorer panel"]').click();
  cy.contains('Project Nodes').should('be.visible');
}

function waitForDraftSaveCount(expectedCount: number): void {
  cy.wrap(null).should(() => {
    expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(expectedCount);
  });
}

function addSqlTransformNode(): void {
  showExplorerPanel();
  cy.contains('h3', 'Add node')
    .parent()
    .contains('button', 'SQL transform')
    .should('be.enabled')
    .click();
}

function removeCanvasNode(nodeName: string): void {
  cy.contains('.react-flow__node', nodeName).rightclick();
  cy.contains('[role="menuitem"]', 'Remove node').click();
}

describe('Canvas ready node authoring', () => {
  beforeEach(() => {
    stubShellBootstrapApis();
    stubRuntimeCapabilities();
  });

  it('adds a governed authoring node from the Explorer on an existing canvas', () => {
    stubCanvasDraftRead();
    stubCanvasDraftSave();

    visitReadyCanvas();

    cy.contains('Sales canvas').should('be.visible');
    cy.contains('.react-flow__node', 'model_orders').should('be.visible');
    showExplorerPanel();
    cy.contains('h3', 'Add node')
      .parent()
      .contains('button', 'SQL transform')
      .should('be.enabled')
      .click();

    cy.contains('.react-flow__node', 'SQL transform 1').should('be.visible');
    waitForE2eApiCall('/workspace/graph/draft', 'PUT');
    cy.then(() => {
      const saveBody = getLastE2eApiCall('/workspace/graph/draft', 'PUT')?.body as
        | CanvasDraftSaveRequestBody
        | undefined;
      const createdNode = saveBody?.draft.nodes.find((node) => node.id === 'dvt-sql-transform-1');

      expect(saveBody?.draft.nodeIds).to.include('dvt-sql-transform-1');
      expect(createdNode).to.deep.include({
        id: 'dvt-sql-transform-1',
        name: 'SQL transform 1',
        kind: 'dvt:sql_transform',
        pluginId: 'dvt',
      });
    });
  });

  it('persists add and remove authoring changes across route reloads', () => {
    stubStatefulCanvasDraftAuthoring();

    visitReadyCanvas();

    addSqlTransformNode();
    cy.contains('.react-flow__node', 'SQL transform 1').should('be.visible');
    waitForDraftSaveCount(1);

    visitReadyCanvas();

    cy.contains('.react-flow__node', 'SQL transform 1').should('be.visible');
    removeCanvasNode('SQL transform 1');
    cy.contains('.react-flow__node', 'SQL transform 1').should('not.exist');
    waitForDraftSaveCount(2);

    visitReadyCanvas();

    cy.contains('.react-flow__node', 'model_orders').should('be.visible');
    cy.contains('.react-flow__node', 'SQL transform 1').should('not.exist');
  });

  it('does not present failed draft saves as persisted after reload', () => {
    stubCanvasDraftRead();
    stubFailingCanvasDraftSave();

    visitReadyCanvas();

    addSqlTransformNode();
    cy.contains('.react-flow__node', 'SQL transform 1').should('be.visible');
    waitForDraftSaveCount(1);

    visitReadyCanvas();

    cy.contains('.react-flow__node', 'model_orders').should('be.visible');
    cy.contains('.react-flow__node', 'SQL transform 1').should('not.exist');
  });

  it('does not expose ready-canvas node creation when draft capability is read-only', () => {
    stubCanvasDraftRead({ readOnly: true });
    stubCanvasDraftSave();

    visitReadyCanvas();

    cy.contains('Sales canvas').should('be.visible');
    showExplorerPanel();
    cy.contains('h3', 'Add node').should('not.exist');
    cy.then(() => {
      expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(0);
    });
  });
});
