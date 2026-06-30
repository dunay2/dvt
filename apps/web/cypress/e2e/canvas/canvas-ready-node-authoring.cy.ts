/** Owned concern: prove governed Canvas draft reads, saves, and reload posture in browser. */
import { resolveCanvasViewCopy, type CanvasViewCopy } from '../../../src/app/views/canvas/copy';
import {
  stubFailingCanvasDraftSave,
  stubCanvasDraftRead,
  stubCanvasDraftSave,
  stubStatefulCanvasDraftAuthoring,
} from '../../support/canvasDraftAuthoring';
import {
  clickCanvasContextMenuItem,
  openCanvasContextMenuAt,
} from '../../support/canvasExecutionSelection';
import {
  getE2eApiCalls,
  getLastE2eApiCall,
  stubE2eJsonApi,
  waitForE2eApiCall,
} from '../../support/e2eApiStub';
import {
  E2E_WORKSPACE_SESSION,
  stubShellBootstrapApis,
  visitWithE2eWorkspaceSession,
} from '../../support/workspaceSession';

type CanvasDraftSaveRequestBody = {
  draft: {
    nodeIds: string[];
    nodePositions: Record<string, { x: number; y: number }>;
    nodes: Array<{
      id: string;
      name: string;
      kind: string;
      pluginId: string;
    }>;
  };
};
type CanvasDraftStatusCopyKey = keyof Pick<
  CanvasViewCopy,
  'draftSyncedLabel' | 'draftSavedLabel' | 'draftSaveFailedLabel'
>;

function stubRuntimeCapabilities(): void {
  stubShellBootstrapApis({
    scopes: ['workspace:graph-draft:view', 'workspace:graph-draft:save', 'run:start'],
  });
  stubE2eJsonApi('GET', '/workspace/context', {
    effectiveWorkspace: E2E_WORKSPACE_SESSION,
    availableWorkspaces: [E2E_WORKSPACE_SESSION],
  });
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

function waitForDraftSaveCount(expectedCount: number): void {
  cy.wrap(null).should(() => {
    expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(expectedCount);
  });
}

function assertNoManualSaveCommand(): void {
  cy.contains('button', /^Save$/).should('not.exist');
  cy.contains('button', /^Guardar$/).should('not.exist');
}

function assertDraftSaveStatus(copyKey: CanvasDraftStatusCopyKey): void {
  cy.window({ log: false }).then((window) => {
    const copy = resolveCanvasViewCopy(
      window.navigator.language || window.document.documentElement.lang
    );

    cy.get('[data-slot="canvas-draft-save-status"]').should('contain.text', copy[copyKey]);
  });
}

function assertNoDraftSaveStatus(): void {
  cy.get('[data-slot="canvas-draft-save-status"]').should('not.exist');
}

function chooseSqlTransformFromCanvasContextMenu(): void {
  openCanvasContextMenuAt(560, 260);
  clickCanvasContextMenuItem(/^(Add|Anadir)\.\.\.$/);
  clickCanvasContextMenuItem(/^(Add transformation|Anadir transformacion)/);
}

function addSqlTransformNode(): void {
  cy.get('.react-flow__node').should('have.length.greaterThan', 0);
  cy.get('[data-slot="canvas-add-node-palette"]').should('not.exist');
  chooseSqlTransformFromCanvasContextMenu();
}

function removeCanvasNode(nodeName: string): void {
  cy.contains('.react-flow__node', nodeName).rightclick();
  cy.contains('[role="menuitem"]', 'Delete').click();
}

describe('Canvas ready node authoring', () => {
  beforeEach(() => {
    stubRuntimeCapabilities();
  });

  it('adds a governed authoring node from the canvas context menu on an existing canvas', () => {
    stubCanvasDraftRead();
    stubCanvasDraftSave();

    visitReadyCanvas();

    cy.contains('Sales canvas').should('be.visible');
    assertNoManualSaveCommand();
    assertNoDraftSaveStatus();
    cy.contains('.react-flow__node', 'model_orders').should('be.visible');
    addSqlTransformNode();

    cy.contains('.react-flow__node', 'SQL transform 1').should('be.visible');
    waitForE2eApiCall('/workspace/graph/draft', 'PUT');
    cy.then(() => {
      const saveBody = getLastE2eApiCall('/workspace/graph/draft', 'PUT')?.body as
        | CanvasDraftSaveRequestBody
        | undefined;
      const createdNode = saveBody?.draft.nodes.find((node) => node.id === 'dvt-sql-transform-1');
      const createdPosition = saveBody?.draft.nodePositions['dvt-sql-transform-1'];

      expect(saveBody?.draft.nodeIds).to.include('dvt-sql-transform-1');
      expect(createdPosition?.x).to.be.a('number');
      expect(createdPosition?.y).to.be.a('number');
      expect(createdNode).to.deep.include({
        id: 'dvt-sql-transform-1',
        name: 'SQL transform 1',
        kind: 'sql_transform',
        pluginId: 'dvt',
      });
    });
    assertNoManualSaveCommand();
  });

  it('keeps the canvas context menu visible after a real browser right-click gesture', () => {
    stubCanvasDraftRead();
    stubCanvasDraftSave();

    visitReadyCanvas();

    cy.get('.react-flow__pane').should('be.visible').rightclick(320, 260, { force: true });
    cy.get('.react-flow__pane').trigger('click', {
      button: 0,
      clientX: 356,
      clientY: 288,
      bubbles: true,
      force: true,
    });

    cy.get('[data-slot="canvas-context-menu"]').should('be.visible');
    cy.wait(1_500);
    cy.get('[data-slot="canvas-context-menu"]').should('be.visible');
    cy.contains(
      '[data-slot="canvas-context-menu"] [role="menuitem"]',
      /^(Add|Anadir)\.\.\.$/
    ).should('be.visible');
    cy.get('[data-slot="canvas-context-menu"]').should('not.contain.text', 'Explore project');
  });

  it('opens node workbench from node context only, not from plain node selection', () => {
    stubCanvasDraftRead();
    stubCanvasDraftSave();

    visitReadyCanvas();

    cy.contains('.react-flow__node', 'model_orders').as('ordersNode').should('be.visible').click();
    cy.get('@ordersNode')
      .find('[data-slot="graph-node-card"]')
      .should('contain.text', 'Draft')
      .and('contain.text', 'models/analytics/model_orders.sql')
      .find('button[aria-label="Select for execution"]')
      .should('be.visible')
      .and('have.css', 'cursor', 'pointer');
    cy.get('[data-slot="canvas-node-floating-toolbar"]')
      .should('be.visible')
      .should(($toolbar) => {
        expect($toolbar[0].parentElement).to.equal($toolbar[0].ownerDocument.body);
        const toolbarRect = $toolbar[0].getBoundingClientRect();
        const viewportRect = $toolbar[0].ownerDocument.documentElement.getBoundingClientRect();

        expect(toolbarRect.width, 'toolbar width').to.be.greaterThan(0);
        expect(toolbarRect.height, 'toolbar height').to.be.greaterThan(0);
        expect(toolbarRect.left, 'toolbar is not clipped left').to.be.greaterThan(
          viewportRect.left
        );
        expect(toolbarRect.top, 'toolbar is not clipped top').to.be.greaterThan(viewportRect.top);
      });
    cy.get('@ordersNode').then(($node) => {
      cy.get('[data-slot="canvas-node-floating-toolbar"]').should(($toolbar) => {
        const nodeRect = $node[0].getBoundingClientRect();
        const toolbarRect = $toolbar[0].getBoundingClientRect();

        expect(Math.round(toolbarRect.left), 'toolbar aligns to node left').to.equal(
          Math.round(nodeRect.left)
        );
      });
    });
    cy.get('[data-slot="canvas-node-floating-toolbar"]')
      .find('button[aria-label="Seleccionar para ejecución"]')
      .should('not.exist');
    cy.get('[data-slot="canvas-node-workbench-overlay"]').should('not.exist');

    cy.contains('.react-flow__node', 'model_orders').rightclick();
    cy.contains('[role="menuitem"]', 'Open workbench').click();

    cy.get('[data-slot="canvas-node-workbench-overlay"]').should('be.visible');
    cy.get('[data-slot="canvas-node-workbench-panel"]').should('contain.text', 'model_orders');
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
    assertNoManualSaveCommand();
    assertDraftSaveStatus('draftSaveFailedLabel');

    visitReadyCanvas();

    cy.contains('.react-flow__node', 'model_orders').should('be.visible');
    cy.contains('.react-flow__node', 'SQL transform 1').should('not.exist');
  });

  it('does not expose ready-canvas node creation when draft capability is read-only', () => {
    stubCanvasDraftRead({ readOnly: true });
    stubCanvasDraftSave();

    visitReadyCanvas();

    cy.contains('Sales canvas').should('be.visible');
    cy.get('[data-slot="canvas-toolbar-insert-command"]').should('not.exist');
    openCanvasContextMenuAt(620, 340);
    cy.contains('[role="menuitem"]', /^(Add|Anadir)\.\.\.$/).should('not.exist');
    cy.contains('[role="menuitem"]', 'Add transformation').should('not.exist');
    cy.contains('[role="menuitem"]', 'Add source').should('not.exist');
    cy.then(() => {
      expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(0);
    });
  });
});
