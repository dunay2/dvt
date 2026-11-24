import { openCanvasContextMenuAt, openCanvasNodeOperations } from '../canvasExecutionSelection';
import { getE2eApiCalls, waitForE2eApiCall } from '../e2eApiStub';
import { pressNativeKey } from '../nativeKeyboard';
import { assertNoSeriousAccessibilityViolations } from '../shellWorkbench/accessibilityAssertions';
import { readProjectCode } from '../shellWorkbench/projectCodeReadback';
import { E2E_WORKSPACE_SESSION, visitWithE2eWorkspaceSession } from '../workspaceSession';

import type { ScreenCompositionFixtureInput } from './scenario';

function visitSpanishStartupCanvas(): void {
  // Moving global navigation must preserve route-local commands and the existing workspace scope.
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
}

function assertRouteLocalStartupChrome(): void {
  cy.get('[data-slot="app-shell-left-navigation"]').should('be.visible');
  cy.get('[data-slot="shell-top-bar"]').as('topBar');
  cy.get('[data-slot="shell-app-menu-trigger"]').should('not.exist');
  cy.get('@topBar')
    .find('[aria-label="Raven"]')
    .should('be.visible')
    .and(($brand) => {
      expect($brand[0]!.closest('button, a, [role="button"]'), 'brand is identity only').to.equal(
        null
      );
      expect($brand[0]!.getAttribute('tabindex')).not.to.equal('0');
    });
  // Context is visible without opening properties; it cannot mutate scope.
  cy.get('@topBar')
    .find('[data-slot="shell-workspace-breadcrumb"]')
    .should('be.visible')
    .and('contain.text', 'E2E Project')
    .find('[aria-current="location"]')
    .should('have.text', E2E_WORKSPACE_SESSION.environmentId);
  cy.get('@topBar')
    .find(
      '[data-slot="shell-workspace-breadcrumb"] a, [data-slot="shell-workspace-breadcrumb"] button'
    )
    .should('not.exist');
  cy.get('@topBar').should('contain.text', 'Vista');
  cy.get('@topBar').find('[data-slot="shell-workspace-menu-trigger"]').should('not.exist');
  cy.get('[data-slot="left-navigation-rail"] [data-slot="shell-workspace-menu-trigger"]')
    .should('have.attr', 'aria-label')
    .and('contain', 'E2E Project');
  cy.get('@topBar').find('[data-slot="shell-project-identity-badge"]').should('not.exist');
  cy.get('@topBar').find('[data-slot="shell-workspace-context-trigger"]').should('not.exist');
  cy.get('@topBar').find('[data-slot="shell-git-ref"]').should('not.exist');
  cy.get('@topBar').find('[data-slot="shell-top-bar-canvas-controls"]').should('not.exist');
  cy.get('@topBar').should('not.contain.text', 'Plan');
  cy.get('@topBar').should('not.contain.text', 'Vista previa obligatoria');
  cy.get('@topBar')
    .find('[data-slot="shell-run-command"]')
    .should('have.attr', 'aria-label', 'Ejecutar');
  cy.get('@topBar').should('not.contain.text', 'Exportar');
  cy.get('@topBar').should('not.contain.text', 'Importar');

  cy.get('[data-slot="canvas-playground-empty-state"]').should('be.visible');
  cy.get('[data-slot="canvas-playground-empty-state"] h2').contains('Canvas').should('be.visible');
  cy.get('[data-slot="canvas-playground-template-choice"]')
    .should('have.length', 1)
    .and('have.text', 'Empezar Canvas')
    .and('be.visible')
    .and('be.enabled');
  cy.contains('Canvas dbt').should('not.exist');
  cy.contains('Flow-based transformation canvas').should('not.exist');
  cy.get('[data-slot="canvas-toolbar-plan-command"]').should('not.exist');
  cy.get('[data-slot="canvas-toolbar-run-command"]').should('not.exist');
}

function assertProjectMenuAndDirectNavigation(): void {
  cy.get('[data-slot="shell-menu-trigger"]').click();
  cy.get('[data-slot="shell-menu-navigation-link"]').should('not.exist');
  cy.get('[data-slot="shell-menu-workspace-context"]').should('not.exist');
  cy.contains('Contexto Git').should('not.exist');
  cy.contains('Panel inspector').should('not.exist');
  cy.contains('Opciones de vista').should('be.visible');
  cy.get('body').type('{esc}');

  cy.get('[data-slot="shell-workspace-menu-trigger"]').focus().type('{enter}');
  cy.contains('Propiedades del proyecto').should('be.visible');
  cy.get('[data-slot="shell-menu-workspace-context"]')
    .should('be.visible')
    .find('[data-slot="shell-workspace-deployment-context"]')
    .should('contain.text', 'temporal');
  cy.get('[data-slot="shell-workspace-context-details"]').should('not.exist');
  cy.get('nav[aria-label="Contexto del proyecto"]').should('be.visible');
  cy.contains('Contexto Git').should('be.visible');
  cy.get('[data-slot="shell-menu-navigation-link"]').should('not.exist');
  cy.get('body').type('{esc}');

  cy.get('[data-slot="left-navigation-link"]').then(($links) => {
    expect([...$links].map((link) => link.getAttribute('href'))).to.deep.equal([
      '/canvas',
      '/templates',
      '/runs',
      '/plugins',
      '/admin',
    ]);
  });
  cy.get('[data-slot="left-navigation-link"][href="/plugins"]').should('be.visible');
  cy.get('[data-slot="left-navigation-link"][href="/admin"]')
    .should('be.visible')
    .and('have.attr', 'aria-label', 'Administración');
  cy.get('[data-slot="left-navigation-link"][href="/canvas"]').should(
    'have.attr',
    'aria-current',
    'page'
  );
}

function assertAboutDialogKeyboardReturn(): void {
  // About owns a real dialog and returns keyboard focus to its visible trigger.
  cy.get('[data-slot="shell-about-command"]')
    .should('be.visible')
    .and('have.attr', 'aria-label', 'Acerca de Raven')
    .focus();
  pressNativeKey('Enter');
  cy.get('[data-slot="shell-about-dialog"]')
    .should('be.visible')
    .and('contain.text', 'Acerca de Raven')
    .and('contain.text', 'Versión');
  assertNoSeriousAccessibilityViolations('[data-slot="shell-about-dialog"]');
  pressNativeKey('Escape');
  cy.get('[data-slot="shell-about-dialog"]').should('not.exist');
  cy.get('[data-slot="shell-about-command"]').should('be.focused');
  cy.press(Cypress.Keyboard.Keys.SPACE);
  cy.get('[data-slot="shell-about-dialog"]').should('be.visible').find('button').last().click();
  cy.get('[data-slot="shell-about-dialog"]').should('not.exist');
  cy.get('[data-slot="shell-about-command"]').should('be.focused');
  cy.get('[data-slot="shell-menu-workspace-context"]').should('not.exist');
  cy.contains('Contexto Git').should('not.exist');
}

function assertEmptyProjectCodeAndImportEntry(): void {
  cy.get('[data-slot="left-navigation-link"][href="/runs"]').click();
  cy.location('pathname').should('eq', '/runs');
  waitForE2eApiCall('/runs', 'GET');
  cy.get('[data-slot="run-operational-table"]').should('contain.text', 'run_primary_project');
  cy.get('[data-slot="canvas-explorer-elements-toggle"]').should('not.exist');
  cy.get('[data-slot="shell-project-code-command"]').click();
  cy.location('pathname').should('eq', '/canvas');
  cy.get('[data-slot="canvas-code-main-tab"]').should('have.attr', 'aria-selected', 'true');
  cy.get('[data-slot="canvas-code-tab-close"]').click();
  cy.get('[data-slot="canvas-code-main-tab"]').should('not.exist');
  cy.get('[data-slot="shell-project-code-command"]').should('be.focused');
  cy.get('[data-slot="canvas-playground-empty-state"]').should('be.visible');

  // A new project must be able to import before a Canvas exists, without creating one.
  cy.get('[data-slot="shell-project-code-command"]').click();
  cy.get('[data-slot="canvas-code-main-tab"]').should('have.attr', 'aria-selected', 'true');
  cy.get('[data-slot="canvas-workspace-import-dbt-project-command"]').click();
  cy.get('[data-slot="dbt-project-import-dialog"]').should('be.visible');
  cy.get('[data-slot="dbt-project-cancel-command"]').click();
  cy.get('[data-slot="canvas-workspace-import-dbt-project-command"]').should('be.focused');
  cy.then(() => expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(0));
  cy.get('[data-slot="canvas-workspace-tab"]').click();
}

function assertCreatedCanvasCodeSurface({
  MODEL_PATH,
  MODEL_SQL,
  CLIPBOARD_EOL,
}: ScreenCompositionFixtureInput): void {
  cy.get('[data-slot="canvas-playground-template-choice"]').click();
  waitForE2eApiCall('/workspace/graph/draft', 'PUT');
  cy.get('@topBar')
    .find('[data-slot="shell-active-canvas-identity"]')
    .should('contain.text', 'Canvas')
    .and('have.attr', 'data-kind', 'transformation')
    .and('have.attr', 'data-canvas-id', 'canvas');
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

  cy.get('[data-slot="shell-file-menu-trigger"]').should('not.exist');
  cy.get('[data-slot="canvas-project-explorer-dialog"]').should('not.exist');

  cy.get('[data-slot="shell-project-code-command"]')
    .should('be.visible')
    .should('not.have.attr', 'aria-disabled', 'true')
    .click();
  cy.get('[data-slot="canvas-code-main-tab"]')
    .should('be.visible')
    .and('have.attr', 'aria-selected', 'true')
    .and('contain.text', 'Código');
  cy.get('[data-slot="canvas-code-workspace-surface"]').should('be.visible');
  waitForE2eApiCall('/workspace/files', 'GET');
  for (const path of ['dbt_project.yml', 'models', 'models/analytics', MODEL_PATH]) {
    cy.get(
      `[data-slot="canvas-code-workspace-surface"] [data-slot="code-workspace-file-entry"][data-workspace-path="${path}"]`
    ).should('be.visible');
  }
  cy.get(
    `[data-slot="canvas-code-workspace-surface"] [data-slot="code-workspace-file-entry"][data-workspace-path="${MODEL_PATH}"]`
  ).click();
  waitForE2eApiCall('/workspace/files/models%2Fanalytics%2Fmodel_orders.sql', 'GET');
  readProjectCode().should('equal', MODEL_SQL.replaceAll('\n', CLIPBOARD_EOL));
  assertNoSeriousAccessibilityViolations('[data-slot="canvas-code-workspace-surface"]');

  cy.get('[data-slot="canvas-workspace-tab"]').click().should('have.attr', 'aria-selected', 'true');
  cy.get('[data-slot="canvas-workspace-surface"]').should('be.visible');
}

function assertAlternateWorkspaceModelAndContextActions(): void {
  // Scope choices must participate in Radix arrow navigation, not require pointer focus.
  cy.get('[data-slot="shell-workspace-menu-trigger"]').focus();
  pressNativeKey('Enter');
  cy.focused().should('have.attr', 'role', 'menuitemradio').and('contain.text', 'E2E Project');
  pressNativeKey('ArrowDown');
  cy.focused().should('contain.text', 'Alternate Project / staging');
  pressNativeKey('Enter');
  cy.get('[data-slot="shell-workspace-menu-trigger"]').should(
    'have.attr',
    'aria-label',
    'Propiedades del proyecto: Alternate Project'
  );
  cy.get('[data-slot="shell-workspace-breadcrumb"]')
    .should('contain.text', 'Alternate Project')
    .find('[aria-current="location"]')
    .should('have.text', 'staging');
  cy.get('[data-slot="shell-active-canvas-identity"]')
    .should('contain.text', 'Alternate staging canvas')
    .and('have.attr', 'data-canvas-id', 'main-canvas');
  cy.get('.react-flow__node[data-id="source-1"]', { timeout: 20_000 }).should('be.visible');
  cy.get('[data-slot="canvas-draft-save-status"]').should('not.exist');
  cy.get('[data-slot="shell-run-command"]').should('be.disabled');
  cy.get('[data-slot="shell-run-status-indicator"]')
    .invoke('attr', 'aria-label')
    .should('contain', 'Vista previa obligatoria');
  cy.get('.react-flow__node[data-id="source-1"] [data-slot="graph-node-card-play"]').should(
    'not.exist'
  );
  cy.get('.react-flow__node[data-id="source-1"] [data-slot="canvas-node-shell"]')
    .should('be.visible')
    .focus()
    .should('be.focused');
  openCanvasNodeOperations('source-1');
  cy.contains('[data-slot="canvas-node-context-menu-item"]', 'Seleccionar para ejecución').click();
  cy.get('[data-slot="canvas-node-context-menu"]').should('not.exist');
  cy.get('body').should('not.have.css', 'pointer-events', 'none');
  cy.focused().closest('.react-flow__node').should('have.attr', 'data-id', 'source-1');
  openCanvasNodeOperations('source-1');
  cy.contains('[data-slot="canvas-node-context-menu-item"]', 'Quitar de la ejecución').should(
    'be.visible'
  );
  cy.focused().type('{esc}');
  cy.get('[data-slot="canvas-node-context-menu"]').should('not.exist');
  cy.get('body').should('not.have.css', 'pointer-events', 'none');
  cy.focused().closest('.react-flow__node').should('have.attr', 'data-id', 'source-1');
}

function assertAlternateWorkspaceCodeReadback({
  MODEL_PATH,
  ALTERNATE_MODEL_PATH,
  ALTERNATE_MODEL_SQL,
  CLIPBOARD_EOL,
}: ScreenCompositionFixtureInput): void {
  cy.get('[data-slot="shell-project-code-command"]').should('be.visible').click();
  cy.get('[data-slot="canvas-code-main-tab"]').should('have.attr', 'aria-selected', 'true');
  cy.get('[data-slot="canvas-code-workspace-surface"]').should('be.visible');
  cy.get(
    `[data-slot="canvas-code-workspace-surface"] [data-slot="code-workspace-file-entry"][data-workspace-path="${ALTERNATE_MODEL_PATH}"]`
  )
    .should('be.visible')
    .click();
  waitForE2eApiCall('/workspace/files/models%2Fstaging%2Falternate_orders.sql', 'GET');
  cy.get(
    `[data-slot="canvas-code-workspace-surface"] [data-slot="code-workspace-file-entry"][data-workspace-path="${MODEL_PATH}"]`
  ).should('not.exist');
  readProjectCode().should('equal', ALTERNATE_MODEL_SQL.replaceAll('\n', CLIPBOARD_EOL));
  cy.get('[data-slot="canvas-draft-save-status"]').should('not.exist');
  cy.then(() => {
    for (const { body } of getE2eApiCalls('/workspace/graph/draft', 'PUT')) {
      expect(body).to.have.property('scope').that.deep.equals(E2E_WORKSPACE_SESSION);
    }
    expect(getE2eApiCalls(/^\/workspace\/files\//, 'POST')).to.have.length(0);
  });
  cy.get('[data-slot="canvas-workspace-tab"]').click().should('have.attr', 'aria-selected', 'true');
  cy.get('[data-slot="canvas-workspace-surface"]').should('be.visible');
}

function assertWorkspaceRunIsolation({
  ALTERNATE_WORKSPACE_SESSION,
}: ScreenCompositionFixtureInput): void {
  cy.get('[data-slot="left-navigation-link"][href="/runs"]').click();
  cy.location('pathname').should('eq', '/runs');
  waitForE2eApiCall('/runs', 'GET');
  cy.get('[data-slot="run-operational-table"]', { timeout: 20_000 })
    .should('contain.text', 'run_alternate_project')
    .and('not.contain.text', 'run_primary_project');

  cy.get('[data-slot="shell-workspace-menu-trigger"]').click();
  cy.contains(
    '[data-slot="shell-workspace-scope-selector"] [role="menuitemradio"]',
    'E2E Project / e2e-env'
  ).click();
  cy.get('[data-slot="run-operational-table"]', { timeout: 20_000 })
    .should('contain.text', 'run_primary_project')
    .and('not.contain.text', 'run_alternate_project');

  cy.get('[data-slot="left-navigation-link"][href="/canvas"]').click();
  cy.location('pathname').should('eq', '/canvas');
  cy.get('[data-slot="shell-active-canvas-identity"]')
    .should('contain.text', 'Canvas')
    .and('have.attr', 'data-canvas-id', 'canvas');
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
}

export function assertStartupScreenComposition(input: ScreenCompositionFixtureInput): void {
  visitSpanishStartupCanvas();
  assertRouteLocalStartupChrome();
  assertProjectMenuAndDirectNavigation();
  assertAboutDialogKeyboardReturn();
  assertEmptyProjectCodeAndImportEntry();
  assertCreatedCanvasCodeSurface(input);
  assertAlternateWorkspaceModelAndContextActions();
  assertAlternateWorkspaceCodeReadback(input);
  assertWorkspaceRunIsolation(input);
}
