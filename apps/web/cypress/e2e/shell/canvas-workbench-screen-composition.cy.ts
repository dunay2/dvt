/** Owned concern: verify the governed Canvas entry screen chrome in browser e2e. */
import {
  WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
  WORKSPACE_GRAPH_DRAFT_INITIAL_REVISION,
} from '@dvt/contracts';

import { buildProtectedDraftRecord } from '../../../src/app/services/workspace/workspaceGraphDraftAuthoring.test.fixtures';
import {
  buildDraftReadOkResponse,
  buildDraftReadNotFoundResponse,
  buildDraftSaveSavedResponse,
} from '../../../src/app/services/workspace/workspaceGraphDraftProtocol.test.fixtures';
import { buildCanvasAuthoringDraft } from '../../support/canvasDraftAuthoring';
import {
  openCanvasContextMenuAt,
  openCanvasNodeOperations,
  revealOperationalDrawer,
} from '../../support/canvasExecutionSelection';
import {
  getE2eApiCalls,
  stubE2eApi,
  stubE2eJsonApi,
  waitForE2eApiCall,
} from '../../support/e2eApiStub';
import {
  E2E_PROJECT_WORKSPACE,
  E2E_WORKSPACE_SESSION,
  stubShellBootstrapApis,
  visitWithE2eWorkspaceSession,
} from '../../support/workspaceSession';

const ALTERNATE_WORKSPACE_SESSION = {
  tenantId: E2E_WORKSPACE_SESSION.tenantId,
  projectId: 'e2e-project-alt',
  environmentId: 'staging',
} as const;

const ALTERNATE_PROJECT_WORKSPACE = {
  ...ALTERNATE_WORKSPACE_SESSION,
  projectName: 'Alternate Project',
} as const;

const MODEL_PATH = 'models/analytics/model_orders.sql';
const MODEL_SQL = `select order_id,
       customer_id,
       total_amount
from raw.orders`;
const ORPHAN_PATH = 'models/analytics/orphan_metrics.sql';
const ORPHAN_SQL = `select metric_date,
       gross_revenue,
       refund_amount
from analytics.daily_metrics
where metric_date >= current_date
  - interval '30 days'`;
const ALTERNATE_MODEL_PATH = 'models/staging/alternate_orders.sql';
const ALTERNATE_MODEL_SQL = `select order_id, status
from staging.alternate_orders`;

function assertNoSeriousAccessibilityViolations(context: string): void {
  cy.get(context).should('be.visible');
  cy.injectAxe();
  cy.checkA11y(
    context,
    {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
      },
      includedImpacts: ['serious', 'critical'],
    },
    (violations) => {
      if (violations.length === 0) {
        return;
      }
      throw new Error(
        violations
          .map(
            (violation) =>
              `${violation.id}: ${violation.help} -> ${violation.nodes
                .map((node) => node.target.join(' '))
                .join(', ')}`
          )
          .join('\n')
      );
    }
  );
}

function clearBrowserEmulation(): void {
  cy.then(() =>
    Cypress.automation('remote:debugger:protocol', {
      command: 'Emulation.clearDeviceMetricsOverride',
    })
  );
  cy.then(() =>
    Cypress.automation('remote:debugger:protocol', {
      command: 'Emulation.setEmulatedMedia',
      params: { media: '', features: [] },
    })
  );
}

function emulateBrowserZoom(
  zoom: 2 | 4,
  physicalViewport: Readonly<{ width: number; height: number }>
): void {
  const cssViewport = {
    width: Math.floor(physicalViewport.width / zoom),
    height: Math.floor(physicalViewport.height / zoom),
  };
  cy.viewport(cssViewport.width, cssViewport.height);
  cy.then(() =>
    Cypress.automation('remote:debugger:protocol', {
      command: 'Emulation.setDeviceMetricsOverride',
      params: {
        width: cssViewport.width,
        height: cssViewport.height,
        deviceScaleFactor: zoom,
        mobile: false,
        screenWidth: physicalViewport.width,
        screenHeight: physicalViewport.height,
      },
    })
  );
  cy.window().should((window) => {
    expect(window.innerWidth).to.equal(cssViewport.width);
    expect(window.innerHeight).to.equal(cssViewport.height);
    expect(window.devicePixelRatio).to.equal(zoom);
  });
}

function emulateAccessibilityMedia(): void {
  cy.then(() =>
    Cypress.automation('remote:debugger:protocol', {
      command: 'Emulation.setEmulatedMedia',
      params: {
        media: '',
        features: [
          { name: 'prefers-reduced-motion', value: 'reduce' },
          { name: 'forced-colors', value: 'active' },
        ],
      },
    })
  );
  cy.window().should((window) => {
    expect(window.matchMedia('(prefers-reduced-motion: reduce)').matches).to.equal(true);
    expect(window.matchMedia('(forced-colors: active)').matches).to.equal(true);
  });
}

function assertViewportHasNoGlobalHorizontalOverflow(expectedWidth: number): void {
  cy.document().should((document) => {
    expect(document.documentElement.scrollWidth).to.be.at.most(expectedWidth);
  });
}

function assertCanvasPropertiesFitsViewport(width: number, height: number): void {
  cy.get('[data-slot="canvas-settings-dialog"]').should(($dialog) => {
    const rect = $dialog.get(0).getBoundingClientRect();
    expect(rect.left).to.be.at.least(0);
    expect(rect.right).to.be.at.most(width);
    expect(rect.top).to.be.at.least(0);
    expect(rect.bottom).to.be.at.most(height);
  });
  cy.get('[data-slot="workbench-properties-footer"]').should(($footer) => {
    const rect = $footer.get(0).getBoundingClientRect();
    expect(rect.top).to.be.at.least(0);
    expect(rect.bottom).to.be.at.most(height);
  });
  assertViewportHasNoGlobalHorizontalOverflow(width);
}

function assertDependencyDirectionCues(): void {
  cy.get('[data-slot="canvas-dependency-direction-cue"]')
    .should('have.length.at.least', 2)
    .each(($cue) => {
      const cue = $cue.get(0) as SVGGraphicsElement;
      const bounds = cue.getBBox();
      const edgePath = cue.closest('.react-flow__edge')?.querySelector('.react-flow__edge-path');

      expect(bounds.width).to.equal(12);
      expect(bounds.height).to.equal(10);
      expect(cue.getAttribute('aria-hidden')).to.equal('true');
      expect(getComputedStyle(cue).fill).not.to.equal('none');
      expect(getComputedStyle(cue).pointerEvents).to.equal('none');
      expect(edgePath?.getAttribute('marker-end')).to.equal(null);
    });
}

describe('Canvas workbench screen composition', () => {
  let persistedDraft: {
    revision: string;
    draft: ReturnType<typeof buildProtectedDraftRecord>['draft'];
  } | null;
  let alternateDraft: ReturnType<typeof buildCanvasAuthoringDraft>;

  beforeEach(() => {
    clearBrowserEmulation();
    cy.viewport(1544, 868);
    stubShellBootstrapApis({
      projectIds: [E2E_WORKSPACE_SESSION.projectId, ALTERNATE_WORKSPACE_SESSION.projectId],
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
      defaultWorkspace: E2E_PROJECT_WORKSPACE,
      availableWorkspaces: [E2E_PROJECT_WORKSPACE, ALTERNATE_PROJECT_WORKSPACE],
    });
    stubE2eApi('GET', '/workspace/files', ({ headers }) => ({
      body:
        headers['x-project-id'] === ALTERNATE_WORKSPACE_SESSION.projectId
          ? [
              {
                path: 'models',
                name: 'models',
                kind: 'directory',
                children: [
                  {
                    path: 'models/staging',
                    name: 'staging',
                    kind: 'directory',
                    children: [
                      {
                        path: ALTERNATE_MODEL_PATH,
                        name: 'alternate_orders.sql',
                        kind: 'file',
                      },
                    ],
                  },
                ],
              },
            ]
          : [
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
                      {
                        path: ORPHAN_PATH,
                        name: 'orphan_metrics.sql',
                        kind: 'file',
                      },
                    ],
                  },
                ],
              },
            ],
    }));
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
    stubE2eJsonApi('GET', '/workspace/files/models%2Fanalytics%2Forphan_metrics.sql', {
      path: ORPHAN_PATH,
      name: 'orphan_metrics.sql',
      language: 'sql',
      content: ORPHAN_SQL,
      contentSha256: 'c'.repeat(64),
      lastModified: '2026-08-06T00:00:00.000Z',
    });
    stubE2eApi('GET', '/workspace/files/models%2Fstaging%2Falternate_orders.sql', ({ headers }) => {
      expect(headers['x-project-id']).to.equal(ALTERNATE_WORKSPACE_SESSION.projectId);
      return {
        body: {
          path: ALTERNATE_MODEL_PATH,
          name: 'alternate_orders.sql',
          language: 'sql',
          content: ALTERNATE_MODEL_SQL,
          contentSha256: 'd'.repeat(64),
          lastModified: '2026-08-06T00:00:00.000Z',
        },
      };
    });
    stubE2eJsonApi('GET', /\/workspace\/file-history\/.+/, []);
    persistedDraft = null;
    const alternateDraftFixture = buildCanvasAuthoringDraft({
      authoringGenerated: true,
      title: 'Alternate staging canvas',
    });
    alternateDraft = {
      ...alternateDraftFixture,
      nodePositions: {
        ...alternateDraftFixture.nodePositions,
        'source-1': { x: 40, y: 140 },
        'dvt-transform-1': { x: 420, y: 140 },
        'sink-1': { x: 800, y: 140 },
      },
    };

    stubE2eApi('GET', '/workspace/graph/draft', ({ url }) => {
      const requestedProjectId = url.searchParams.get('projectId');
      if (requestedProjectId === ALTERNATE_WORKSPACE_SESSION.projectId) {
        return {
          body: buildDraftReadOkResponse(ALTERNATE_WORKSPACE_SESSION, {
            record: buildProtectedDraftRecord(ALTERNATE_WORKSPACE_SESSION, {
              revision: 'rev-alternate-project',
              draft: alternateDraft,
              updatedAt: '2026-08-06T00:00:00.000Z',
            }),
          }),
        };
      }

      expect(requestedProjectId).to.equal(E2E_WORKSPACE_SESSION.projectId);
      if (persistedDraft == null) {
        return {
          statusCode: 404,
          body: buildDraftReadNotFoundResponse(E2E_WORKSPACE_SESSION),
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
    stubE2eApi('GET', '/runs', ({ url, headers }) => {
      const projectId = url.searchParams.get('projectId');
      expect(headers['x-project-id']).to.equal(projectId);
      const alternate = projectId === ALTERNATE_WORKSPACE_SESSION.projectId;
      return {
        body: {
          items: [
            {
              runId: alternate ? 'run_alternate_project' : 'run_primary_project',
              planId: alternate ? 'plan_alternate_project' : 'plan_primary_project',
              status: 'COMPLETED',
              environmentId: alternate
                ? ALTERNATE_WORKSPACE_SESSION.environmentId
                : E2E_WORKSPACE_SESSION.environmentId,
              startedAt: '2026-08-06T00:00:00.000Z',
              completedAt: '2026-08-06T00:00:10.000Z',
            },
          ],
        },
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
    cy.get('@topBar').should('contain.text', 'Proyecto: E2E Project');
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

    cy.get('[data-slot="shell-workspace-menu-trigger"]').focus().type('{enter}');
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
    cy.contains('[data-slot="shell-menu-navigation-link"]', 'Ejecuciones').click();
    cy.location('pathname').should('eq', '/runs');
    waitForE2eApiCall('/runs', 'GET');
    cy.get('[data-slot="run-operational-table"]').should('contain.text', 'run_primary_project');
    cy.get('[data-slot="shell-workspace-menu-trigger"]').click();
    cy.contains('[data-slot="shell-menu-navigation-link"]', 'Canvas').click();
    cy.location('pathname').should('eq', '/canvas');
    cy.get('[data-slot="canvas-playground-empty-state"]').should('be.visible');

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
      .and('contain.text', 'Propiedades del canvas')
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
    cy.get('[data-testid="monaco-code-editor"], [data-testid="monaco-code-viewer"]')
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
      'Alternate Project / staging'
    ).click();
    cy.get('[data-slot="shell-workspace-menu-trigger"]').should(
      'contain.text',
      'Proyecto: Alternate Project'
    );
    cy.get('[data-slot="shell-active-canvas-identity"]')
      .should('contain.text', 'Alternate staging canvas')
      .and('have.attr', 'data-canvas-id', 'main-canvas');
    cy.get('.react-flow__node[data-id="source-1"]', { timeout: 20_000 }).should('be.visible');
    cy.get('[data-slot="shell-run-command"]').should('be.disabled');
    cy.get('[data-slot="shell-run-status-indicator"]')
      .invoke('attr', 'aria-label')
      .should('contain', 'Vista previa obligatoria');
    cy.get('.react-flow__node[data-id="source-1"] [data-slot="graph-node-card-play"]').should(
      'not.exist'
    );
    openCanvasNodeOperations('source-1');
    cy.contains(
      '[data-slot="canvas-node-context-menu-item"]',
      'Seleccionar para ejecución'
    ).click();
    openCanvasNodeOperations('source-1');
    cy.contains('[data-slot="canvas-node-context-menu-item"]', 'Quitar de la ejecución').should(
      'be.visible'
    );
    cy.get('body').type('{esc}');

    cy.get('[data-slot="shell-workspace-menu-trigger"]').click();
    cy.get('[data-slot="canvas-workspace-open-project-code-command"]').click();
    cy.get(`[data-slot="code-workspace-file-entry"][data-workspace-path="${ALTERNATE_MODEL_PATH}"]`)
      .should('be.visible')
      .click();
    waitForE2eApiCall('/workspace/files/models%2Fstaging%2Falternate_orders.sql', 'GET');
    cy.get(`[data-slot="code-workspace-file-entry"][data-workspace-path="${MODEL_PATH}"]`).should(
      'not.exist'
    );
    cy.get('[data-testid="monaco-code-editor"], [data-testid="monaco-code-viewer"]')
      .find('.view-line')
      .should(($lines) => {
        const renderedLines = [...$lines].map((line) =>
          (line.textContent ?? '').replaceAll('\u00a0', ' ').trimEnd()
        );
        expect(renderedLines.join('\n')).to.equal(ALTERNATE_MODEL_SQL);
      });
    cy.get('[data-slot="canvas-contextual-workbench-close"]').click();

    cy.get('[data-slot="shell-workspace-menu-trigger"]').click();
    cy.contains('[data-slot="shell-menu-navigation-link"]', 'Ejecuciones').click();
    cy.location('pathname').should('eq', '/runs');
    waitForE2eApiCall('/runs', 'GET');
    cy.get('[data-slot="run-operational-table"]', { timeout: 20_000 })
      .should('contain.text', 'run_alternate_project')
      .and('not.contain.text', 'run_primary_project');

    cy.get('[data-slot="shell-workspace-menu-trigger"]').click();
    cy.contains(
      '[data-slot="shell-workspace-scope-selector"] button',
      'E2E Project / e2e-env'
    ).click();
    cy.get('[data-slot="run-operational-table"]', { timeout: 20_000 })
      .should('contain.text', 'run_primary_project')
      .and('not.contain.text', 'run_alternate_project');

    cy.get('[data-slot="shell-workspace-menu-trigger"]').click();
    cy.contains('[data-slot="shell-menu-navigation-link"]', 'Canvas').click();
    cy.location('pathname').should('eq', '/canvas');
    cy.get('[data-slot="shell-active-canvas-identity"]')
      .should('contain.text', 'Canvas de transformación')
      .and('have.attr', 'data-canvas-id', 'canvas-de-transformacion');
    cy.get('.react-flow__node[data-id="source-1"]').should('not.exist');
    cy.get('[data-slot="shell-run-command"]').should('be.disabled');
    cy.get('[data-slot="shell-run-status-indicator"]')
      .invoke('attr', 'aria-label')
      .should('contain', 'Vista previa obligatoria');

    cy.then(() => {
      const draftProjects = getE2eApiCalls('/workspace/graph/draft', 'GET').map((call) =>
        call.url.searchParams.get('projectId')
      );
      expect(draftProjects).to.include.members([
        E2E_WORKSPACE_SESSION.projectId,
        ALTERNATE_WORKSPACE_SESSION.projectId,
      ]);
      const fileProjects = getE2eApiCalls('/workspace/files', 'GET').map(
        (call) => call.headers['x-project-id']
      );
      expect(fileProjects).to.include.members([
        E2E_WORKSPACE_SESSION.projectId,
        ALTERNATE_WORKSPACE_SESSION.projectId,
      ]);
      const runProjects = getE2eApiCalls('/runs', 'GET').map((call) =>
        call.url.searchParams.get('projectId')
      );
      expect(runProjects).to.include.members([
        E2E_WORKSPACE_SESSION.projectId,
        ALTERNATE_WORKSPACE_SESSION.projectId,
      ]);
    });
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
    cy.get('[data-slot="shell-run-status-label"]')
      .should('have.text', 'Vista previa obligatoria')
      .and(($label) => {
        const label = $label.get(0);
        expect(label.scrollWidth).to.be.at.most(label.clientWidth);
        expect(getComputedStyle(label).textOverflow).not.to.equal('ellipsis');
      });
    cy.contains('button', 'Canvas de transformación').click();
    waitForE2eApiCall('/workspace/graph/draft', 'PUT');
    cy.contains('button', /^Añadir componente$/).should('not.exist');

    openCanvasContextMenuAt(260, 260);
    cy.get('[data-menu-action="open-add-node-catalog"]').click();
    cy.get('[data-slot="canvas-context-menu"]').should('not.exist');
    cy.get('[data-slot="canvas-context-menu-add-catalog-layout"]')
      .closest('[role="dialog"]')
      .as('addComponentDialog')
      .should('be.visible')
      .and('contain.text', 'Añadir componente')
      .and(($catalog) => {
        const element = $catalog.get(0);
        expect(element.scrollWidth).to.be.at.most(element.clientWidth);
      });
    cy.get('@addComponentDialog').find('[role="menu"], [role="menuitem"]').should('not.exist');
    cy.get('@addComponentDialog')
      .find('input[type="search"]')
      .should('be.focused')
      .and('have.attr', 'placeholder', 'Buscar origen, modelo, transformación, test, salida...');
    cy.get('[data-slot="canvas-context-menu-add-catalog-category"]')
      .its('length')
      .should('be.greaterThan', 1);
    cy.get('[data-slot="canvas-context-menu-add-catalog-category"]')
      .then(($groups) => [...$groups].map((group) => group.getAttribute('data-catalog-category')))
      .should('deep.equal', ['source', 'transformation', 'output']);
    cy.get('@addComponentDialog').find('input[type="search"]').type('transformación');
    cy.get('[data-slot="canvas-context-menu-add-catalog-category"]')
      .should('have.length', 1)
      .and('have.attr', 'data-catalog-category', 'transformation');
    cy.get('@addComponentDialog').should(($dialog) => {
      const rect = $dialog.get(0).getBoundingClientRect();
      expect(rect.left).to.be.at.least(0);
      expect(rect.right).to.be.at.most(390);
      expect(rect.bottom).to.be.at.most(844);
    });
    assertNoSeriousAccessibilityViolations('[role="dialog"]');
    cy.get('body').type('{esc}');
    cy.get('[data-slot="canvas-context-menu-add-catalog-layout"]').should('not.exist');

    openCanvasContextMenuAt(260, 260);
    cy.get('[data-menu-action="open-add-node-catalog"]').click();
    cy.get('[role="dialog"] input[type="search"]').type('transformación');
    cy.get('[data-slot="canvas-context-menu-add-catalog-item"]')
      .first()
      .should('be.visible')
      .should('be.enabled')
      .click();
    cy.get('[role="dialog"]').should('not.exist');
    cy.get('.react-flow__node').should('have.length.at.least', 1);
    cy.get('[data-slot="shell-workspace-menu-trigger"]').focus().type('{enter}');
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
    assertViewportHasNoGlobalHorizontalOverflow(390);
    emulateBrowserZoom(2, { width: 780, height: 1688 });
    cy.get('[data-slot="canvas-contextual-workbench-overlay"]').should(($workbench) => {
      const rect = $workbench.get(0).getBoundingClientRect();
      expect(rect.left).to.be.at.least(0);
      expect(rect.right).to.be.at.most(390);
    });
    assertViewportHasNoGlobalHorizontalOverflow(390);
    assertNoSeriousAccessibilityViolations('[data-slot="canvas-contextual-workbench"]');
    cy.get('[data-slot="canvas-contextual-workbench-close"]').click();
    cy.get('[data-slot="shell-workspace-menu-trigger"]').should('be.focused');

    revealOperationalDrawer();
    cy.get('[data-slot="bottom-operational-drawer-tabs"]')
      .should('have.attr', 'aria-label', 'Cajón operativo del Canvas')
      .and(($tabList) => {
        const element = $tabList.get(0);
        expect(element.scrollWidth).to.be.at.most(element.clientWidth);
      });
    cy.get('[data-slot="bottom-operational-drawer-tab"][data-tab="preview"]')
      .focus()
      .type('{leftarrow}');
    cy.get('[data-slot="bottom-operational-drawer-tab"][data-tab="runs"]')
      .should('have.attr', 'aria-selected', 'true')
      .and('have.attr', 'tabindex', '0')
      .and('have.attr', 'aria-controls', 'bottom-operational-drawer-panel-runs');
    cy.get('[data-slot="bottom-operational-drawer-tab"][data-tab="preview"]').should(
      'have.attr',
      'tabindex',
      '-1'
    );
    cy.get('#bottom-operational-drawer-panel-runs')
      .should('be.visible')
      .and('have.attr', 'role', 'tabpanel')
      .and('have.attr', 'aria-labelledby', 'bottom-operational-drawer-tab-runs');
    assertViewportHasNoGlobalHorizontalOverflow(390);
    assertNoSeriousAccessibilityViolations('[data-slot="bottom-operational-drawer"]');

    openCanvasContextMenuAt(260, 260);
    cy.get('[data-menu-action="open-canvas-settings"]').click();
    cy.get('[data-slot="canvas-settings-dialog"]')
      .should('be.visible')
      .and('contain.text', 'Propiedades del canvas')
      .and('contain.text', 'Apariencia')
      .and('contain.text', 'Rejilla')
      .and('contain.text', 'Distribución');
    cy.get('[data-slot="canvas-properties-impact"]')
      .should('have.attr', 'data-state', 'unchecked')
      .click()
      .should('have.attr', 'data-state', 'checked');
    cy.get('[data-slot="workbench-properties-apply"]').should('be.enabled');
    cy.get('[data-slot="workbench-properties-cancel"]').click();
    cy.get('[data-slot="canvas-settings-dialog"]').should('not.exist');
    cy.get('body').should('not.have.css', 'pointer-events', 'none');

    openCanvasContextMenuAt(260, 260);
    cy.get('[data-menu-action="open-canvas-settings"]').click();
    cy.get('[data-slot="canvas-properties-impact"]').should('have.attr', 'data-state', 'unchecked');
    cy.get('[data-slot="canvas-properties-background-input"]')
      .clear()
      .type('#223344')
      .should('have.value', '#223344');
    cy.get('[data-slot="workbench-properties-apply"]').click();
    cy.get('.react-flow').should('have.css', 'background-color', 'rgb(34, 51, 68)');
    assertNoSeriousAccessibilityViolations('[data-slot="canvas-viewport-context-surface"]');

    cy.get('[data-slot="shell-workspace-menu-trigger"]').click();
    cy.get('[data-slot="canvas-workspace-import-dbt-project-command"]').click();
    cy.get('[data-slot="dbt-project-import-dialog"]')
      .should('be.visible')
      .and('contain.text', 'Cancelar');
    cy.get('[data-slot="dbt-project-cancel-command"]').click();
    cy.get('[data-slot="dbt-project-import-dialog"]').should('not.exist');
    cy.get('body').should('not.have.css', 'pointer-events', 'none');
    cy.get('[data-slot="shell-workspace-menu-trigger"]').should('be.focused');

    cy.get('[data-slot="shell-menu-trigger"]').click();
    cy.get('[data-slot="shell-language-menu"]').should('contain.text', 'Idioma');
    cy.get('[role="menu"]')
      .should('not.contain.text', 'Fondo del canvas')
      .and('not.contain.text', 'Tamaño de rejilla')
      .and('not.contain.text', 'Propiedades del canvas');
    cy.get('[data-slot="shell-language-option-en"]').click();
    cy.get('[data-slot="shell-menu-trigger"]').should('contain.text', 'View');
    cy.get('html').should('have.attr', 'lang', 'en');

    openCanvasContextMenuAt(260, 260);
    cy.get('[data-slot="canvas-context-menu"]')
      .should('contain.text', 'Add...')
      .and('contain.text', 'Canvas properties');
    cy.get('[data-menu-action="open-canvas-settings"]').click();
    cy.get('[data-slot="canvas-settings-dialog"]')
      .should('contain.text', 'Canvas properties')
      .and('contain.text', 'Appearance')
      .and('contain.text', 'Grid')
      .and('contain.text', 'Layout');
    cy.get('[data-slot="canvas-settings-dialog"] [role="tab"]')
      .first()
      .focus()
      .type('{rightarrow}')
      .should('have.attr', 'aria-selected', 'false');
    cy.focused().should('contain.text', 'Grid').and('have.attr', 'aria-selected', 'true');
    cy.focused().type('{leftarrow}');
    cy.focused().should('contain.text', 'Appearance').and('have.attr', 'aria-selected', 'true');
    assertNoSeriousAccessibilityViolations('[data-slot="canvas-settings-dialog"]');

    cy.contains('[data-slot="canvas-settings-dialog"] [role="tab"]', 'Grid').click();
    cy.get('[data-slot="canvas-properties-grid-color-input"]')
      .clear()
      .type('#12345')
      .should('have.attr', 'aria-invalid', 'true');
    cy.get('[data-slot="workbench-properties-apply"]').should('be.disabled');
    cy.contains('button', 'Restore grid defaults').click();
    cy.get('[data-slot="canvas-properties-grid-color-input"]')
      .should('have.value', '#94a3b8')
      .and('have.attr', 'aria-invalid', 'false');
    cy.get('[data-slot="canvas-properties-grid-visible"]').click();
    cy.get('[data-slot="workbench-properties-apply"]').should('be.enabled').click();

    openCanvasContextMenuAt(260, 260);
    cy.get('[data-menu-action="open-canvas-settings"]').click();

    clearBrowserEmulation();
    cy.viewport(1366, 768);
    assertCanvasPropertiesFitsViewport(1366, 768);
    emulateBrowserZoom(2, { width: 1366, height: 768 });
    assertCanvasPropertiesFitsViewport(683, 384);
    clearBrowserEmulation();
    cy.viewport(1920, 1080);
    assertCanvasPropertiesFitsViewport(1920, 1080);
    emulateBrowserZoom(2, { width: 1920, height: 1080 });
    assertCanvasPropertiesFitsViewport(960, 540);
    cy.get('[data-slot="workbench-properties-cancel"]').click();

    openCanvasContextMenuAt(260, 260);
    cy.get('[data-menu-action="open-add-node-catalog"]').click();
    cy.get('[role="dialog"]')
      .should('contain.text', 'Add component')
      .find('input[type="search"]')
      .should('be.focused')
      .and('have.attr', 'placeholder', 'Search source, model, transformation, test, output...');
    cy.get('body').type('{esc}');

    emulateBrowserZoom(4, { width: 1280, height: 1800 });
    cy.get('[data-slot="shell-workspace-menu-trigger"]').should('be.visible');
    assertViewportHasNoGlobalHorizontalOverflow(320);
  });

  it('shows directional graph semantics and opens complete node code in a movable workbench', () => {
    const graphDraft = buildCanvasAuthoringDraft({ includeLooseNode: true });
    persistedDraft = {
      revision: 'rev-e2e-graph-ready',
      draft: {
        ...graphDraft,
        nodes: graphDraft.nodes.map((node) => {
          const sql =
            node.id === 'model_orders'
              ? MODEL_SQL
              : node.id === 'orphan_metrics'
                ? ORPHAN_SQL
                : null;
          return sql == null
            ? node
            : {
                ...node,
                metadata: {
                  ...node.metadata,
                  sql,
                  config: { ...node.metadata?.config, sql },
                },
              };
        }),
        nodePositions: {
          ...graphDraft.nodePositions,
          src_orders: { x: 40, y: 140 },
          model_orders: { x: 420, y: 140 },
          orders_dashboard: { x: 800, y: 140 },
          orphan_metrics: { x: 420, y: 420 },
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
    assertDependencyDirectionCues();

    cy.get('.react-flow__node[data-id="model_orders"]').as('modelNode').should('be.visible');
    cy.get('.react-flow__node[data-id="orphan_metrics"]').as('orphanNode').should('be.visible');
    openCanvasContextMenuAt(260, 260);
    cy.get('[data-menu-action="open-canvas-settings"]').click();
    cy.get('[data-slot="canvas-properties-impact"]')
      .should('have.attr', 'data-state', 'unchecked')
      .click();
    cy.get('[data-slot="workbench-properties-apply"]').click();

    cy.get('@modelNode').click();
    cy.get('@modelNode').find('[data-slot="graph-node-card"]').should('have.css', 'opacity', '1');
    cy.get('@orphanNode')
      .find('[data-slot="graph-node-card"]')
      .should('have.css', 'opacity', '0.3');

    cy.get('@orphanNode').focus();
    cy.get('@orphanNode').find('[data-slot="graph-node-card"]').should('have.css', 'opacity', '1');
    cy.get('@modelNode').find('[data-slot="graph-node-card"]').should('have.css', 'opacity', '0.3');

    cy.get('.react-flow__pane').click('topLeft', { force: true });
    cy.get('@modelNode').find('[data-slot="graph-node-card"]').should('have.css', 'opacity', '1');
    cy.get('@orphanNode').find('[data-slot="graph-node-card"]').should('have.css', 'opacity', '1');

    cy.get('@modelNode').find('[data-slot="graph-node-card-play"]').should('not.exist');
    openCanvasNodeOperations('model_orders');
    cy.contains(
      '[data-slot="canvas-node-context-menu-item"]',
      'Seleccionar para ejecución'
    ).click();
    openCanvasNodeOperations('model_orders');
    cy.contains('[data-slot="canvas-node-context-menu-item"]', 'Quitar de la ejecución').should(
      'be.visible'
    );
    cy.get('body').type('{esc}');
    cy.get('.react-flow__pane').click('topLeft', { force: true });
    cy.get('@orphanNode').find('[data-slot="graph-node-card"]').should('have.css', 'opacity', '1');
    openCanvasNodeOperations('model_orders');
    cy.contains('[data-slot="canvas-node-context-menu-item"]', 'Quitar de la ejecución').should(
      'be.visible'
    );
    cy.get('body').type('{esc}');
    cy.get('@modelNode').find('[data-slot="graph-node-card-play"]').should('not.exist');
    assertDependencyDirectionCues();

    cy.get('[data-slot="canvas-viewport-context-surface"]').type('{ctrl}f');
    cy.get('[data-slot="canvas-graph-search-control"] input').type('orders');
    cy.get('.react-flow__edge.canvas-graph-search-relevant-edge').should('have.length.at.least', 1);
    assertDependencyDirectionCues();
    cy.get('[data-slot="canvas-graph-search-control"] input').type('{esc}');

    cy.get('@modelNode').find('[data-slot="canvas-node-shell"]').dblclick();
    cy.get('[data-slot="canvas-node-workbench-tab-code"]')
      .should('be.visible')
      .and('have.attr', 'aria-selected', 'true');
    cy.get('[data-slot="canvas-node-workbench-overlay"]').should('be.visible');
    cy.get('[data-testid="monaco-code-editor"]')
      .find('.view-line')
      .should(($lines) => {
        const renderedLines = [...$lines].map((line) =>
          (line.textContent ?? '').replaceAll('\u00a0', ' ').trimEnd()
        );
        expect(renderedLines.join('\n')).to.equal(MODEL_SQL);
      });

    cy.get('[data-slot="canvas-node-workbench-overlay"]')
      .invoke('attr', 'style')
      .then((initialStyle) => {
        cy.get('[data-slot="canvas-node-workbench-drag-handle"]')
          .focus()
          .type('{leftarrow}{uparrow}');
        cy.get('[data-slot="canvas-node-workbench-overlay"]')
          .invoke('attr', 'style')
          .should('not.equal', initialStyle);
      });
    assertNoSeriousAccessibilityViolations('[data-slot="canvas-node-workbench-overlay"]');
    cy.get('[data-slot="canvas-node-workbench-close"]').click();
    cy.get('.react-flow__node[data-id="model_orders"]').should('be.focused');

    cy.get('.react-flow__node[data-id="orphan_metrics"]')
      .find('[data-slot="canvas-node-shell"]')
      .dblclick();
    cy.get('[data-slot="canvas-node-workbench-tab-code"]')
      .should('be.visible')
      .and('have.attr', 'aria-selected', 'true');
    cy.get('[data-testid="monaco-code-editor"]')
      .find('.view-line')
      .should(($lines) => {
        const renderedLines = [...$lines].map((line) =>
          (line.textContent ?? '').replaceAll('\u00a0', ' ').trimEnd()
        );
        expect(renderedLines.join('\n')).to.equal(ORPHAN_SQL);
        expect(renderedLines.join('\n')).not.to.equal(MODEL_SQL);
      });
    cy.get('[data-slot="canvas-node-workbench-close"]').click();

    cy.get('.react-flow__node[data-id="src_orders"]')
      .find('[data-slot="canvas-node-shell"]')
      .dblclick();
    cy.get('[data-slot="canvas-node-workbench-close"]').click();

    assertNoSeriousAccessibilityViolations('[data-slot="canvas-viewport-context-surface"]');
    emulateAccessibilityMedia();
    assertDependencyDirectionCues();
    cy.get('.react-flow__node[data-id="model_orders"]').focus().should('be.focused');
    cy.get('.react-flow__node[data-id="model_orders"]').should(($node) => {
      expect(getComputedStyle($node.get(0)).outlineStyle).not.to.equal('none');
    });
  });
});
