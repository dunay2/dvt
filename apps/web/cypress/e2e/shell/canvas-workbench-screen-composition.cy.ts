/** Owned concern: verify the governed Canvas entry screen chrome in browser e2e. */
import { buildProtectedDraftRecord } from '../../../src/app/services/workspace/workspaceGraphDraftAuthoring.test.fixtures';
import {
  WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
  WORKSPACE_GRAPH_DRAFT_INITIAL_REVISION,
} from '../../../src/app/services/workspace/workspaceGraphDraftProtocol';
import {
  buildDraftReadOkResponse,
  buildDraftSaveSavedResponse,
} from '../../../src/app/services/workspace/workspaceGraphDraftProtocol.test.fixtures';
import { buildCanvasAuthoringDraft } from '../../support/canvasDraftAuthoring';
import { openCanvasContextMenuAt } from '../../support/canvasExecutionSelection';
import { stubE2eApi, stubE2eJsonApi, waitForE2eApiCall } from '../../support/e2eApiStub';
import {
  E2E_WORKSPACE_SESSION,
  stubShellBootstrapApis,
  visitWithE2eWorkspaceSession,
} from '../../support/workspaceSession';

const ALTERNATE_WORKSPACE_SESSION = {
  tenantId: E2E_WORKSPACE_SESSION.tenantId,
  projectId: 'e2e-project-alt',
  environmentId: 'staging',
} as const;

const MODEL_PATH = 'models/analytics/model_orders.sql';
const MODEL_SQL = `select order_id,
       customer_id,
       total_amount
from raw.orders`;

function assertNoSeriousAccessibilityViolations(context: string): void {
  cy.get(context).should('be.visible');
  cy.injectAxe();
  cy.checkA11y(context, {
    runOnly: {
      type: 'tag',
      values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
    },
    includedImpacts: ['serious', 'critical'],
  });
}

describe('Canvas workbench screen composition', () => {
  let persistedDraft: {
    revision: string;
    draft: ReturnType<typeof buildProtectedDraftRecord>['draft'];
  } | null;

  beforeEach(() => {
    cy.viewport(1544, 868);
    stubShellBootstrapApis({
      scopes: [
        'workspace:graph-draft:view',
        'workspace:graph-draft:save',
        'plan:preview',
        'run:start',
      ],
    });
    stubE2eJsonApi('GET', '/capabilities', {
      apiVersion: '1.0.0',
      minFrontendVersion: '0.0.1',
      plugins: {
        dbt: { available: true },
        dvt: { available: true },
      },
    });
    stubE2eJsonApi('GET', '/workspace/context', {
      effectiveWorkspace: E2E_WORKSPACE_SESSION,
      availableWorkspaces: [E2E_WORKSPACE_SESSION, ALTERNATE_WORKSPACE_SESSION],
    });
    stubE2eJsonApi('GET', '/workspace/files', [
      {
        path: 'dbt_project.yml',
        name: 'dbt_project.yml',
        kind: 'file',
      },
      {
        path: 'models',
        name: 'models',
        kind: 'directory',
        children: [
          {
            path: 'models/analytics',
            name: 'analytics',
            kind: 'directory',
            children: [
              {
                path: MODEL_PATH,
                name: 'model_orders.sql',
                kind: 'file',
              },
            ],
          },
        ],
      },
    ]);
    stubE2eJsonApi('GET', '/workspace/files/dbt_project.yml', {
      path: 'dbt_project.yml',
      name: 'dbt_project.yml',
      language: 'yaml',
      content: 'name: e2e_project\nversion: 2',
      contentSha256: 'a'.repeat(64),
      lastModified: '2026-08-06T00:00:00.000Z',
    });
    stubE2eJsonApi('GET', '/workspace/files/models%2Fanalytics%2Fmodel_orders.sql', {
      path: MODEL_PATH,
      name: 'model_orders.sql',
      language: 'sql',
      content: MODEL_SQL,
      contentSha256: 'b'.repeat(64),
      lastModified: '2026-08-06T00:00:00.000Z',
    });
    stubE2eJsonApi('GET', /\/workspace\/file-history\/.+/, []);
    persistedDraft = null;

    stubE2eApi('GET', '/workspace/graph/draft', () => {
      if (persistedDraft == null) {
        return {
          statusCode: 404,
          body: {
            error: {
              type: 'not_found',
              reason: 'workspace_graph_draft_not_found',
            },
          },
        };
      }

      return {
        body: buildDraftReadOkResponse(E2E_WORKSPACE_SESSION, {
          record: buildProtectedDraftRecord(E2E_WORKSPACE_SESSION, {
            revision: persistedDraft.revision,
            draft: persistedDraft.draft,
            updatedAt: '2026-06-12T00:00:00.000Z',
          }),
        }),
      };
    });
    stubE2eApi('PUT', '/workspace/graph/draft', ({ body }) => {
      const saveRequest = body as {
        scope: typeof E2E_WORKSPACE_SESSION;
        schemaVersion: string;
        expectedRevision: string;
        draft: {
          canvas: {
            id?: string;
            kind: string;
            title: string;
          };
          nodeIds: string[];
          nodes: unknown[];
          edges: unknown[];
        };
      };

      const expectedRevision = persistedDraft?.revision ?? WORKSPACE_GRAPH_DRAFT_INITIAL_REVISION;
      expect(saveRequest).to.deep.include({
        scope: E2E_WORKSPACE_SESSION,
        schemaVersion: WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
        expectedRevision,
      });
      if (expectedRevision === WORKSPACE_GRAPH_DRAFT_INITIAL_REVISION) {
        expect(saveRequest.draft.canvas).to.deep.include({
          kind: 'transformation',
          title: 'Canvas de transformación',
        });
        expect(saveRequest.draft.nodeIds).to.deep.equal([]);
        expect(saveRequest.draft.nodes).to.deep.equal([]);
        expect(saveRequest.draft.edges).to.deep.equal([]);
      }
      persistedDraft = {
        revision: 'rev-e2e-first-canvas',
        draft: saveRequest.draft,
      };

      return {
        body: buildDraftSaveSavedResponse(E2E_WORKSPACE_SESSION, {
          revision: 'rev-e2e-first-canvas',
        }),
      };
    });
  });

  it('keeps Canvas startup commands route-local and exposes global navigation in the menu', () => {
    visitWithE2eWorkspaceSession('/canvas', {
      onBeforeLoad(window) {
        Object.defineProperty(window.navigator, 'language', {
          configurable: true,
          value: 'es-ES',
        });
        Object.defineProperty(window.navigator, 'languages', {
          configurable: true,
          value: ['es-ES'],
        });
        window.localStorage.removeItem('dvt-web-application-language');
        window.document.documentElement.lang = 'es-ES';
      },
    });

    waitForE2eApiCall('/workspace/graph/draft', 'GET');

    cy.get('[data-slot="app-shell-left-navigation"]').should('not.exist');
    cy.get('[data-slot="shell-top-bar"]').as('topBar');
    cy.get('@topBar').should('contain.text', 'Raven');
    cy.get('@topBar').should('contain.text', 'Vista');
    cy.get('@topBar').should('contain.text', 'Proyecto: e2e-project');
    cy.get('@topBar').find('[data-slot="shell-project-identity-badge"]').should('not.exist');
    cy.get('@topBar').find('[data-slot="shell-workspace-context-trigger"]').should('not.exist');
    cy.get('@topBar').find('[data-slot="shell-git-ref"]').should('not.exist');
    cy.get('@topBar').find('[data-slot="shell-top-bar-canvas-controls"]').should('not.exist');
    cy.get('@topBar').should('not.contain.text', 'Plan');
    cy.get('@topBar').should('contain.text', 'Vista previa obligatoria');
    cy.get('@topBar')
      .find('[data-slot="shell-run-command"]')
      .should('have.attr', 'aria-label', 'Ejecutar');
    cy.get('@topBar').should('not.contain.text', 'Exportar');
    cy.get('@topBar').should('not.contain.text', 'Importar');

    cy.get('[data-slot="canvas-playground-empty-state"]').should('be.visible');
    cy.contains('Crear canvas en este workspace').should('be.visible');
    cy.contains('Canvas dbt').should('be.visible');
    cy.contains('Canvas de transformación').should('be.visible');
    cy.contains('button', 'Canvas de transformación').should('not.be.disabled');
    cy.contains('Flow-based transformation canvas').should('not.exist');
    cy.get('[data-slot="canvas-toolbar-plan-command"]').should('not.exist');
    cy.get('[data-slot="canvas-toolbar-run-command"]').should('not.exist');

    cy.get('[data-slot="shell-menu-trigger"]').click();
    cy.get('[data-slot="shell-menu-navigation-link"]').should('not.exist');
    cy.contains('Contexto del proyecto').should('not.exist');
    cy.contains('Contexto Git').should('not.exist');
    cy.contains('Panel inspector').should('not.exist');
    cy.contains('Opciones de vista').should('be.visible');
    cy.get('body').type('{esc}');

    cy.get('[data-slot="shell-workspace-menu-trigger"]').click();
    cy.get('[data-slot="shell-menu-navigation-link"]').then(($links) => {
      expect([...$links].map((link) => link.getAttribute('href'))).to.deep.equal([
        '/canvas',
        '/runs',
        '/templates',
        '/plugins',
        '/admin',
      ]);
    });
    cy.contains('[data-slot="shell-menu-navigation-link"]', 'Plugins').should('be.visible');
    cy.contains('[data-slot="shell-menu-navigation-link"]', 'Administración').should('be.visible');
    cy.contains('Contexto del proyecto').should('be.visible');
    cy.contains('Contexto Git').should('be.visible');
    cy.get('body').type('{esc}');

    cy.contains('button', 'Canvas de transformación').click();
    waitForE2eApiCall('/workspace/graph/draft', 'PUT');
    cy.get('@topBar')
      .find('[data-slot="shell-active-canvas-identity"]')
      .should('contain.text', 'Canvas de transformación')
      .and('have.attr', 'data-kind', 'transformation')
      .and('have.attr', 'data-canvas-id', 'canvas-de-transformacion');
    cy.get('[data-slot="canvas-active-canvas-identity"]').should('not.exist');
    cy.get('[data-slot="canvas-draft-save-status"]').should('not.exist');
    cy.contains('Borrador sincronizado').should('not.exist');

    openCanvasContextMenuAt(520, 300);
    cy.get('[data-slot="canvas-context-menu"]')
      .should('be.visible')
      .and('contain.text', 'Configuración de canvas')
      .and('not.contain.text', 'Explorar proyecto')
      .and('not.contain.text', 'Abrir código del proyecto');
    cy.get('body').type('{esc}');

    cy.get('[data-slot="shell-workspace-menu-trigger"]').click();
    cy.get('[data-slot="canvas-workspace-explore-project-command"]')
      .should('be.visible')
      .should(($item) => {
        expect($item.attr('data-disabled')).to.be.undefined;
      })
      .click();
    cy.get('[data-slot="canvas-project-explorer-dialog"]')
      .should('be.visible')
      .and('contain.text', 'Canvas de transformación')
      .and('contain.text', 'Canvas actual');
    cy.get('[data-slot="canvas-project-explorer-close-command"]').click();
    cy.get('body').should('not.have.css', 'pointer-events', 'none');
    cy.get('[data-slot="shell-workspace-menu-trigger"]').should('be.focused');

    cy.get('[data-slot="shell-workspace-menu-trigger"]').click();
    cy.get('[data-slot="canvas-workspace-open-project-code-command"]')
      .should('be.visible')
      .should(($item) => {
        expect($item.attr('data-disabled')).to.be.undefined;
      })
      .click();
    cy.get('[data-slot="canvas-contextual-workbench"]')
      .should('be.visible')
      .and('contain.text', 'Código del proyecto');
    waitForE2eApiCall('/workspace/files', 'GET');
    for (const path of ['dbt_project.yml', 'models', 'models/analytics', MODEL_PATH]) {
      cy.get(`[data-slot="code-workspace-file-entry"][data-workspace-path="${path}"]`).should(
        'be.visible'
      );
    }
    cy.get(`[data-slot="code-workspace-file-entry"][data-workspace-path="${MODEL_PATH}"]`).click();
    waitForE2eApiCall('/workspace/files/models%2Fanalytics%2Fmodel_orders.sql', 'GET');
    cy.get('[data-testid="monaco-code-editor"]')
      .find('.view-line')
      .should('have.length.at.least', 4)
      .then(($lines) => {
        const renderedLines = [...$lines].map((line) =>
          (line.textContent ?? '').replaceAll('\u00a0', ' ').trimEnd()
        );
        expect(renderedLines.join('\n')).to.equal(MODEL_SQL);
      });
    assertNoSeriousAccessibilityViolations('[data-slot="canvas-contextual-workbench"]');

    cy.get('[data-slot="canvas-contextual-workbench-close"]').click();
    cy.get('[data-slot="shell-workspace-menu-trigger"]').click();
    cy.contains(
      '[data-slot="shell-workspace-scope-selector"] button',
      'e2e-tenant / e2e-project-alt / staging'
    ).click();
    cy.get('[data-slot="shell-workspace-menu-trigger"]').should(
      'contain.text',
      'Proyecto: e2e-project-alt'
    );
  });

  it('keeps grouped actions, dialogs, language controls and exits visible in a narrow viewport', () => {
    cy.viewport(390, 844);
    visitWithE2eWorkspaceSession('/canvas', {
      onBeforeLoad(window) {
        Object.defineProperty(window.navigator, 'language', {
          configurable: true,
          value: 'es-ES',
        });
        window.localStorage.removeItem('dvt-web-application-language');
        window.document.documentElement.lang = 'es-ES';
      },
    });

    waitForE2eApiCall('/workspace/graph/draft', 'GET');
    cy.get('[data-slot="shell-top-bar"]').should(($topBar) => {
      const rect = $topBar.get(0).getBoundingClientRect();
      expect(rect.left).to.be.at.least(0);
      expect(rect.right).to.be.at.most(390);
    });
    cy.document().its('documentElement.scrollWidth').should('be.at.most', 390);
    cy.contains('button', 'Canvas de transformación').click();
    waitForE2eApiCall('/workspace/graph/draft', 'PUT');

    openCanvasContextMenuAt(260, 260);
    cy.get('[data-menu-action="open-add-node-catalog"]').click();
    cy.get('[data-slot="canvas-context-menu-add-catalog-layout"]')
      .should('be.visible')
      .and(($catalog) => {
        const element = $catalog.get(0);
        expect(element.scrollWidth).to.be.at.most(element.clientWidth);
      });
    cy.get('[data-slot="canvas-context-menu-add-catalog-category"]')
      .its('length')
      .should('be.greaterThan', 1);
    cy.get('[data-slot="canvas-context-menu"]').should(($menu) => {
      const rect = $menu.get(0).getBoundingClientRect();
      expect(rect.left).to.be.at.least(0);
      expect(rect.right).to.be.at.most(390);
      expect(rect.bottom).to.be.at.most(844);
    });
    cy.get('body').type('{esc}');

    cy.get('[data-slot="shell-workspace-menu-trigger"]').click();
    cy.get('[data-slot="canvas-workspace-explore-project-command"]').click();
    cy.get('[data-slot="canvas-project-explorer-dialog"]')
      .should('be.visible')
      .and('contain.text', 'Cerrar')
      .and(($dialog) => {
        const rect = $dialog.get(0).getBoundingClientRect();
        expect(rect.left).to.be.at.least(0);
        expect(rect.right).to.be.at.most(390);
        expect(rect.top).to.be.at.least(0);
        expect(rect.bottom).to.be.at.most(844);
      });
    cy.get('[data-slot="canvas-project-explorer-close-command"]').click();
    cy.get('[data-slot="canvas-project-explorer-dialog"]').should('not.exist');
    cy.get('body').should('not.have.css', 'pointer-events', 'none');
    cy.get('[data-slot="shell-workspace-menu-trigger"]').should('be.focused');

    cy.get('[data-slot="shell-workspace-menu-trigger"]').click();
    cy.get('[data-slot="canvas-workspace-open-project-code-command"]').click();
    cy.get('[data-slot="canvas-contextual-workbench-overlay"]')
      .should('be.visible')
      .and(($workbench) => {
        const rect = $workbench.get(0).getBoundingClientRect();
        expect(rect.left).to.be.at.least(0);
        expect(rect.right).to.be.at.most(390);
        expect(rect.top).to.be.at.least(0);
        expect(rect.bottom).to.be.at.most(844);
      });
    cy.document().its('documentElement.scrollWidth').should('be.at.most', 390);
    cy.document().then((document) => {
      document.documentElement.style.fontSize = '200%';
    });
    cy.get('[data-slot="canvas-contextual-workbench-overlay"]').should(($workbench) => {
      const rect = $workbench.get(0).getBoundingClientRect();
      expect(rect.left).to.be.at.least(0);
      expect(rect.right).to.be.at.most(390);
    });
    cy.document().its('documentElement.scrollWidth').should('be.at.most', 390);
    assertNoSeriousAccessibilityViolations('[data-slot="canvas-contextual-workbench"]');
    cy.get('[data-slot="canvas-contextual-workbench-close"]').click();
    cy.document().then((document) => {
      document.documentElement.style.fontSize = '';
    });

    openCanvasContextMenuAt(260, 260);
    cy.get('[data-menu-action="open-canvas-settings"]').click();
    cy.get('[data-slot="canvas-settings-dialog"]')
      .should('be.visible')
      .and('contain.text', 'Cerrar');
    cy.get('[data-slot="canvas-settings-close-command"]').click();
    cy.get('[data-slot="canvas-settings-dialog"]').should('not.exist');
    cy.get('body').should('not.have.css', 'pointer-events', 'none');

    cy.get('[data-slot="shell-workspace-menu-trigger"]').click();
    cy.get('[data-slot="canvas-workspace-import-dbt-project-command"]').click();
    cy.get('[data-slot="dbt-project-import-dialog"]')
      .should('be.visible')
      .and('contain.text', 'Cancelar');
    cy.get('[data-slot="dbt-project-cancel-command"]').click();
    cy.get('[data-slot="dbt-project-import-dialog"]').should('not.exist');
    cy.get('body').should('not.have.css', 'pointer-events', 'none');

    cy.get('[data-slot="shell-menu-trigger"]').click();
    cy.get('[data-slot="shell-language-menu"]').should('contain.text', 'Idioma');
    cy.get('[data-slot="shell-language-option-en"]').click();
    cy.get('[data-slot="shell-menu-trigger"]').should('contain.text', 'View');
    cy.get('html').should('have.attr', 'lang', 'en');
  });

  it('shows directional graph semantics and opens complete node code in a movable workbench', () => {
    const graphDraft = buildCanvasAuthoringDraft();
    const graphNodes = graphDraft.nodes.map((node) =>
      node.id === 'model_orders'
        ? {
            ...node,
            metadata: {
              ...node.metadata,
              sql: MODEL_SQL,
              config: { ...node.metadata?.config, sql: MODEL_SQL },
            },
          }
        : node
    );
    persistedDraft = {
      revision: 'rev-e2e-graph-ready',
      draft: {
        ...graphDraft,
        nodes: graphNodes,
        nodePositions: {
          ...graphDraft.nodePositions,
          src_orders: { x: 40, y: 140 },
          model_orders: { x: 420, y: 140 },
          orders_dashboard: { x: 800, y: 140 },
        },
      },
    };
    visitWithE2eWorkspaceSession('/canvas', {
      onBeforeLoad(window) {
        Object.defineProperty(window.navigator, 'language', {
          configurable: true,
          value: 'es-ES',
        });
        window.localStorage.removeItem('dvt-web-application-language');
        window.document.documentElement.lang = 'es-ES';
      },
    });

    waitForE2eApiCall('/workspace/graph/draft', 'GET');
    cy.get('.react-flow__edge-path')
      .should('have.length.at.least', 2)
      .each(($edge) => {
        expect($edge.attr('marker-end')).to.match(/^url\(/);
      });

    cy.get('.react-flow__node[data-id="model_orders"]').as('modelNode').should('be.visible');
    cy.get('@modelNode')
      .find('[data-slot="graph-node-card-play"]')
      .should('have.attr', 'data-state', 'select')
      .find('[data-slot="graph-node-card-play-icon"]')
      .should('exist');
    cy.get('@modelNode').find('[data-slot="graph-node-card-play"]').click();
    cy.get('@modelNode')
      .find('[data-slot="graph-node-card-play"]')
      .should('have.attr', 'data-state', 'deselect')
      .find('[data-slot="graph-node-card-play-icon"]')
      .should('not.exist');

    cy.get('@modelNode').click();
    cy.get(
      '[data-slot="canvas-node-floating-toolbar"][data-node-id="model_orders"] [data-toolbar-action="code"]'
    )
      .should('have.attr', 'aria-label', 'Abrir código del nodo')
      .click();
    cy.get('[data-slot="canvas-node-workbench-overlay"]')
      .should('be.visible')
      .and('contain.text', 'Código');
    cy.get('[data-slot="canvas-node-workbench-code-section"]')
      .should('be.visible')
      .find('textarea[name="dvt-transform-sql"]')
      .should('have.value', MODEL_SQL);

    cy.get('[data-slot="canvas-node-workbench-overlay"]')
      .invoke('attr', 'style')
      .then((initialStyle) => {
        cy.get('[data-slot="canvas-node-workbench-drag-handle"]')
          .focus()
          .type('{rightarrow}{downarrow}');
        cy.get('[data-slot="canvas-node-workbench-overlay"]')
          .invoke('attr', 'style')
          .should('not.equal', initialStyle);
      });
    assertNoSeriousAccessibilityViolations('[data-slot="canvas-node-workbench-overlay"]');
    cy.get('[data-slot="canvas-node-workbench-close"]').click();
    cy.get('.react-flow__node[data-id="model_orders"]').should('be.visible');
  });
});
