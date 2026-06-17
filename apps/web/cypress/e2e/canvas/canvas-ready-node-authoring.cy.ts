/** Owned concern: prove governed Canvas draft reads, saves, and reload posture in browser. */
import { resolveCanvasViewCopy, type CanvasViewCopy } from '../../../src/app/views/canvas/copy';
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

function dispatchCanvasContextMenu(clientX: number, clientY: number): void {
  cy.get('[data-slot="canvas-viewport-context-surface"]')
    .should('be.visible')
    .then(($surface) => {
      $surface[0]?.dispatchEvent(
        new MouseEvent('contextmenu', {
          clientX,
          clientY,
          button: 2,
          bubbles: true,
          cancelable: true,
        })
      );
    });
}

function chooseSqlTransformFromCanvasContextMenu(): void {
  cy.get('[data-slot="canvas-viewport-context-surface"]').should(($surface) => {
    $surface[0]?.dispatchEvent(
      new MouseEvent('contextmenu', {
        clientX: 560,
        clientY: 260,
        button: 2,
        bubbles: true,
        cancelable: true,
      })
    );

    const menu = $surface[0]?.ownerDocument.querySelector('[data-slot="canvas-context-menu"]');
    expect(menu).not.to.equal(null);

    const sqlTransformItem = Array.from(
      $surface[0]?.ownerDocument.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? []
    ).find((button) => button.textContent?.includes('SQL transform'));
    expect(sqlTransformItem).not.to.equal(undefined);
    sqlTransformItem?.click();
  });
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
    stubShellBootstrapApis();
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

    cy.get('[data-slot="canvas-viewport-context-surface"]')
      .should('be.visible')
      .rightclick(96, 220, { force: true });

    cy.get('[data-slot="canvas-context-menu"]').should('be.visible');
    cy.contains('[data-slot="canvas-context-menu"] [role="menuitem"]', 'SQL transform').should(
      'be.visible'
    );
    cy.contains('[data-slot="canvas-context-menu"] [role="menuitem"]', 'Explore project').should(
      'be.visible'
    );
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
    dispatchCanvasContextMenu(620, 340);
    cy.contains('[role="menuitem"]', 'SQL transform').should('not.exist');
    cy.contains('[role="menuitem"]', 'Add source').should('not.exist');
    cy.then(() => {
      expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(0);
    });
  });
});
