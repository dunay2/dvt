/** Owned concern: prove Canvas project snapshot browser export, import rejection, and reload round trip. */
import { stubStatefulCanvasDraftAuthoring } from '../../support/canvasDraftAuthoring';
import {
  clickCanvasContextMenuItem,
  openCanvasContextMenuAt,
} from '../../support/canvasExecutionSelection';
import {
  resetE2eApiStubs,
  getE2eApiCalls,
  stubE2eJsonApi,
  waitForE2eApiCall,
} from '../../support/e2eApiStub';
import {
  E2E_WORKSPACE_SESSION,
  stubShellBootstrapApis,
  visitWithE2eWorkspaceSession,
} from '../../support/workspaceSession';

describe('Canvas project snapshot round trip', () => {
  function stubRuntimeCapabilities(): void {
    resetE2eApiStubs();
    stubShellBootstrapApis();
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

  function addSqlTransformNode(): void {
    openCanvasContextMenuAt(360, 260);
    clickCanvasContextMenuItem('SQL transform');
  }

  function openWorkspaceMenuIfClosed(): void {
    cy.get('body').then(($body) => {
      if ($body.find('[data-slot="canvas-workspace-import-input"]').length === 0) {
        cy.get('[data-slot="shell-workspace-menu-trigger"]').click();
      }
    });
  }

  function clickVisibleWorkspaceExportSnapshotCommand(): void {
    cy.get('[data-slot="canvas-workspace-export-command"]')
      .should(($commands) => {
        const visibleCommands = $commands.filter(':visible');

        expect(visibleCommands, 'visible export command').to.have.length(1);
        expect(visibleCommands.first(), 'enabled export command').not.to.have.attr('data-disabled');
      })
      .then(($commands) => {
        cy.wrap($commands.filter(':visible').first()).click();
      });
  }

  function waitForDraftSaveCount(expectedCount: number): void {
    cy.wrap(null).should(() => {
      expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(expectedCount);
    });
  }

  it('exports a saved project snapshot and imports it into a clean workspace draft', () => {
    const downloadPath = 'cypress/downloads/sales-canvas-project-snapshot.json';

    stubRuntimeCapabilities();
    stubStatefulCanvasDraftAuthoring();
    visitReadyCanvas();

    addSqlTransformNode();
    cy.contains('.react-flow__node', 'SQL transform 1').should('be.visible');
    waitForDraftSaveCount(1);
    cy.get('[data-slot="shell-workspace-menu-trigger"]').click();
    clickVisibleWorkspaceExportSnapshotCommand();

    cy.readFile(downloadPath).then((contents) => {
      const snapshot = (typeof contents === 'string' ? JSON.parse(contents) : contents) as {
        format: string;
        schemaVersion: number;
        canvas: { title: string };
        project: { tenantId: string; projectId: string; environmentId: string };
        draft: { nodeIds: string[]; nodePositions: Record<string, { x: number; y: number }> };
      };
      expect(snapshot.format).to.equal('dvt.project-snapshot');
      expect(snapshot.schemaVersion).to.equal(1);
      expect(snapshot.canvas.title).to.equal('Sales canvas');
      expect(snapshot.project).to.deep.include(E2E_WORKSPACE_SESSION);
      expect(snapshot.draft.nodeIds).to.include('dvt-sql-transform-1');
      expect(snapshot.draft.nodePositions['dvt-sql-transform-1']).to.include.keys(['x', 'y']);
      expect(snapshot.draft.nodePositions['dvt-sql-transform-1'].x).to.be.a('number');
      expect(snapshot.draft.nodePositions['dvt-sql-transform-1'].y).to.be.a('number');
    });

    stubRuntimeCapabilities();
    stubStatefulCanvasDraftAuthoring({ emptyCanvas: true });
    visitReadyCanvas();

    cy.contains('.react-flow__node', 'model_orders').should('not.exist');
    let saveCountBeforeRejectedImport = 0;
    cy.then(() => {
      saveCountBeforeRejectedImport = getE2eApiCalls('/workspace/graph/draft', 'PUT').length;
    });
    openWorkspaceMenuIfClosed();
    cy.get('[data-slot="canvas-workspace-import-input"]').selectFile(
      {
        contents: Cypress.Buffer.from('{not-json'),
        fileName: 'bad-project-snapshot.json',
        mimeType: 'application/json',
      },
      { force: true }
    );
    cy.then(() => {
      expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(
        saveCountBeforeRejectedImport
      );
    });

    openWorkspaceMenuIfClosed();
    cy.get('[data-slot="canvas-workspace-import-input"]').selectFile(downloadPath, {
      force: true,
    });
    waitForDraftSaveCount(saveCountBeforeRejectedImport + 1);

    visitReadyCanvas();

    cy.contains('Sales canvas').should('be.visible');
    cy.contains('.react-flow__node', 'SQL transform 1').should('be.visible');
  });
});
