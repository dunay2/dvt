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

describe('Canvas workbench screen composition', () => {
  beforeEach(() => {
    cy.viewport(1544, 868);
    stubShellBootstrapApis();
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
    let persistedDraft: {
      revision: string;
      draft: ReturnType<typeof buildProtectedDraftRecord>['draft'];
    } | null = null;

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

      expect(saveRequest).to.deep.include({
        scope: E2E_WORKSPACE_SESSION,
        schemaVersion: WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
        expectedRevision: WORKSPACE_GRAPH_DRAFT_INITIAL_REVISION,
      });
      expect(saveRequest.draft.canvas).to.deep.include({
        kind: 'transformation',
        title: 'Canvas de transformacion',
      });
      expect(saveRequest.draft.nodeIds).to.deep.equal([]);
      expect(saveRequest.draft.nodes).to.deep.equal([]);
      expect(saveRequest.draft.edges).to.deep.equal([]);
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
    cy.get('@topBar').should('not.contain.text', 'Ejecutar');
    cy.get('@topBar').should('not.contain.text', 'Exportar');
    cy.get('@topBar').should('not.contain.text', 'Importar');

    cy.get('[data-slot="canvas-playground-empty-state"]').should('be.visible');
    cy.contains('Crear canvas en este workspace').should('be.visible');
    cy.contains('Canvas dbt').should('be.visible');
    cy.contains('Canvas de transformacion').should('be.visible');
    cy.contains('button', 'Canvas de transformacion').should('not.be.disabled');
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
    cy.contains('[data-slot="shell-menu-navigation-link"]', 'Admin').should('be.visible');
    cy.contains('Contexto del proyecto').should('be.visible');
    cy.contains('Contexto Git').should('be.visible');
    cy.get('body').type('{esc}');

    cy.contains('button', 'Canvas de transformacion').click();
    waitForE2eApiCall('/workspace/graph/draft', 'PUT');
    cy.get('@topBar')
      .find('[data-slot="shell-active-canvas-identity"]')
      .should('contain.text', 'Canvas de transformacion')
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
    cy.get('body').type('{esc}', { force: true });

    cy.get('[data-slot="shell-workspace-menu-trigger"]').click();
    cy.get('[data-slot="canvas-workspace-explore-project-command"]')
      .should('be.visible')
      .should(($item) => {
        expect($item.attr('data-disabled')).to.be.undefined;
      })
      .click();
    cy.get('[data-slot="canvas-project-explorer-dialog"]')
      .should('be.visible')
      .and('contain.text', 'Canvas de transformacion')
      .and('contain.text', 'Canvas actual');
    cy.get('[data-slot="canvas-project-explorer-close-command"]').click();

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
        window.document.documentElement.lang = 'es-ES';
      },
    });

    waitForE2eApiCall('/workspace/graph/draft', 'GET');
    cy.contains('button', 'Canvas de transformacion').click();
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
    cy.get('body').type('{esc}', { force: true });

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

    cy.get('[data-slot="shell-menu-trigger"]').click();
    cy.get('[data-slot="shell-language-menu"]').click();
    cy.get('[data-slot="shell-language-option-en"]').click();
    cy.get('[data-slot="shell-menu-trigger"]').should('contain.text', 'View');
    cy.get('html').should('have.attr', 'lang', 'en');
  });
});
