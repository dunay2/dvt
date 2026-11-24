import { openCanvasContextMenuAt, revealOperationalDrawer } from '../canvasExecutionSelection';
import { getE2eApiCalls, waitForE2eApiCall } from '../e2eApiStub';
import { pressNativeKey } from '../nativeKeyboard';
import { assertNoSeriousAccessibilityViolations } from '../shellWorkbench/accessibilityAssertions';
import { clearBrowserEmulation, emulateBrowserZoom } from '../shellWorkbench/browserEmulation';
import {
  assertViewportHasNoGlobalHorizontalOverflow,
  assertCanvasPropertiesFitsViewport,
} from '../shellWorkbench/viewportGeometry';
import { visitWithE2eWorkspaceSession } from '../workspaceSession';

function assertNarrowCanvasEntryAndReadiness(): void {
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
  cy.get('[data-slot="left-navigation-link"][href="/canvas"]')
    .should('be.visible')
    .and('have.attr', 'aria-current', 'page');
  cy.get('[data-slot="shell-about-command"]').should('be.visible');
  cy.document().its('documentElement.scrollWidth').should('be.at.most', 390);
  // Disabled Run must explain its readiness gate without consuming narrow header space.
  cy.get('[data-slot="shell-run-status-label"]').should('not.exist');
  cy.get('[data-slot="shell-run-command"]').should('be.disabled');
  cy.get('[data-slot="shell-run-status-indicator"]').should('have.attr', 'tabindex', '0').focus();
  cy.get('[role="tooltip"]')
    .should('have.text', 'Vista previa obligatoria')
    .parent()
    .should('be.visible');
  cy.press(Cypress.Keyboard.Keys.ESC);
  cy.get('[role="tooltip"]').should('not.exist');
  // Activating the help target also works without hover and never submits disabled Run.
  cy.get('[data-slot="shell-run-status-indicator"]').blur().click();
  cy.get('[role="tooltip"]').should('have.text', 'Vista previa obligatoria');
  cy.get('[data-slot="shell-run-command"]').should('be.disabled');
  cy.then(() => expect(getE2eApiCalls('/runs/start', 'POST')).to.have.length(0));
  cy.press(Cypress.Keyboard.Keys.ESC);
  cy.get('[role="tooltip"]').should('not.exist');
  cy.get('[data-slot="canvas-playground-template-choice"]')
    .should('have.text', 'Empezar Canvas')
    .and('be.enabled')
    .click();
  waitForE2eApiCall('/workspace/graph/draft', 'PUT');
  cy.contains('button', /^Añadir componente$/).should('not.exist');
}

function assertNarrowComponentCatalog(): void {
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
    .should('deep.equal', ['source', 'model', 'output']);
  cy.get('@addComponentDialog').find('input[type="search"]').type('modelo');
  cy.get('[data-slot="canvas-context-menu-add-catalog-category"]')
    .should('have.length', 1)
    .and('have.attr', 'data-catalog-category', 'model');
  cy.get('@addComponentDialog').should(($dialog) => {
    const rect = $dialog.get(0).getBoundingClientRect();
    expect(rect.left).to.be.at.least(0);
    expect(rect.right).to.be.at.most(390);
    expect(rect.bottom).to.be.at.most(844);
  });
  assertNoSeriousAccessibilityViolations('[role="dialog"]');
  cy.get('body').type('{esc}');
  cy.get('[data-slot="canvas-context-menu-add-catalog-layout"]').should('not.exist');
}

function assertNarrowProjectMenuAfterCreation(): void {
  openCanvasContextMenuAt(260, 260);
  cy.get('[data-menu-action="open-add-node-catalog"]').click();
  cy.get('[role="dialog"] input[type="search"]').type('modelo');
  cy.get('[data-slot="canvas-context-menu-add-catalog-item"]')
    .first()
    .should('be.visible')
    .should('be.enabled')
    .click();
  cy.get('[role="dialog"]').should('not.exist');
  cy.get('.react-flow__node').should('have.length.at.least', 1);
  // The same Project entry must remain usable at mobile width, without a second dialog.
  cy.get('[data-slot="shell-workspace-menu-trigger"]').focus().type('{enter}');
  cy.get('[role="menu"]')
    .should('be.visible')
    .and(($menu) => {
      const rect = $menu.get(0).getBoundingClientRect();
      expect(rect.left).to.be.at.least(0);
      expect(rect.right).to.be.at.most(390);
      expect(rect.top).to.be.at.least(0);
      expect(rect.bottom).to.be.at.most(844);
    });
  cy.focused().type('{esc}');
  cy.get('[role="menu"]').should('not.exist');
  cy.get('[data-slot="shell-workspace-menu-trigger"]').should('be.focused');
}

function assertNarrowCodeZoomGeometry(): void {
  cy.get('[data-slot="shell-project-code-command"]').click();
  cy.get('[data-slot="canvas-code-main-tab"]').should('have.attr', 'aria-selected', 'true');
  for (const zoom of [1, 2] as const) {
    if (zoom === 2) {
      emulateBrowserZoom(2, { width: 780, height: 1688 });
    }
    cy.get('[data-slot="canvas-code-workspace-surface"]')
      .should('be.visible')
      .and(($workbench) => {
        const rect = $workbench.get(0).getBoundingClientRect();
        const allocated = $workbench.get(0).parentElement!.getBoundingClientRect();
        expect(rect.left, 'Code starts at the allocated workspace edge').to.be.closeTo(
          allocated.left,
          1
        );
        expect(rect.top, 'Code starts below the workspace tabs').to.be.closeTo(allocated.top, 1);
        expect(rect.width, 'Code fills the allocated workspace width').to.be.closeTo(
          allocated.width,
          1
        );
        expect(rect.height, 'Code fills the allocated workspace height').to.be.closeTo(
          allocated.height,
          1
        );
        expect(rect.left).to.be.at.least(0);
        expect(rect.right).to.be.at.most(390);
        expect(rect.top).to.be.at.least(0);
        expect(rect.bottom).to.be.at.most(844);
      });
    assertViewportHasNoGlobalHorizontalOverflow(390);
    cy.get('[data-slot="shell-project-code-command"]')
      .should('have.length', 1)
      .and('be.visible')
      .and('have.attr', 'aria-expanded', 'true')
      .and(($control) => {
        expect($control[0]!.closest('[inert], [hidden], [aria-hidden="true"]')).to.equal(null);
      });
    cy.get('[data-slot="left-navigation-link"][href="/admin"]')
      .scrollIntoView()
      .focus()
      .should('be.focused')
      .and('have.attr', 'aria-label', 'Administración');
    cy.get('[role="tooltip"]').should('contain.text', 'Administración');
    cy.get('[data-slot="shell-about-command"]').should('be.visible');
  }
}

function assertNarrowCodeReturnsToCanvas(): void {
  cy.get(
    '[data-slot="canvas-code-workspace-surface"] [data-testid="monaco-code-viewer"] textarea.inputarea'
  ).should('have.prop', 'readOnly', true);
  assertNoSeriousAccessibilityViolations('[data-slot="canvas-code-workspace-surface"]');
  cy.get('[data-slot="canvas-workspace-tab"]')
    .click()
    .should('have.attr', 'aria-selected', 'true')
    .and('be.focused');
  cy.get('[data-slot="canvas-workspace-surface"]').should('be.visible');
  cy.then(() => {
    expect(getE2eApiCalls(/^\/workspace\/files\//, 'POST')).to.have.length(0);
  });
}

function assertNarrowOperationalDrawerControls(): void {
  revealOperationalDrawer();
  cy.get('[data-slot="bottom-operational-drawer-tabs"]')
    .should('have.attr', 'aria-label', 'Cajón operativo del Canvas')
    .and(($tabList) => {
      const element = $tabList.get(0);
      expect(element.scrollWidth).to.be.at.most(element.clientWidth);
    });
  cy.get('[data-slot="bottom-operational-drawer-tab"]').should('have.length', 1);
  cy.get('#shell-operational-problems')
    .should('have.attr', 'aria-label')
    .and('match', /^Problemas \([1-9]\d*\)$/u);
  cy.get('#shell-operational-problems').focus().should('be.focused');
  pressNativeKey('Enter');
  cy.get('[data-slot="shell-operational-workspace"][data-view="problems"]').should('be.visible');
  cy.get('[data-slot="bottom-operational-drawer"]').should('not.exist');
  cy.get('#shell-operational-log').click();
  cy.get('[data-slot="shell-operational-workspace"][data-view="log"]').should('be.visible');
  cy.get('#shell-operational-log').click();
  cy.get('[data-slot="canvas-workspace-surface"]').should('be.visible');
  cy.get('[data-slot="bottom-operational-drawer-tab"][data-tab="preview"]')
    .should('have.attr', 'aria-selected', 'true')
    .and('have.attr', 'tabindex', '0');
  assertViewportHasNoGlobalHorizontalOverflow(390);
  assertNoSeriousAccessibilityViolations('[data-slot="bottom-operational-drawer"]');
  cy.get('[data-tab-close="preview"]').click();
  cy.get('[data-slot="bottom-operational-drawer-tab"][data-tab="preview"]').should('not.exist');
  cy.get('[data-slot="bottom-operational-drawer-restore"]').click();
  cy.get('[data-restore-tab="preview"]').should('be.visible').click();
  cy.get('[data-slot="bottom-operational-drawer-tab"][data-tab="preview"]')
    .should('be.visible')
    .and('have.attr', 'aria-selected', 'true');
}

function assertNarrowCanvasPropertiesCancel(): void {
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
}

function assertNarrowCanvasPropertiesApply(): void {
  openCanvasContextMenuAt(260, 260);
  cy.get('[data-menu-action="open-canvas-settings"]').click();
  cy.get('[data-slot="canvas-properties-impact"]').should('have.attr', 'data-state', 'unchecked');
  cy.get('[data-slot="canvas-properties-background-input"]')
    .clear()
    .type('#223344')
    .should('have.value', '#223344');
  cy.get('[data-slot="workbench-properties-apply"]').click();
  cy.get('[data-slot="canvas-settings-dialog"]').should('not.exist');
  cy.get('body').should('not.have.css', 'pointer-events', 'none');
  cy.get('[data-slot="canvas-viewport-context-surface"]').should('be.focused');
  cy.get('.react-flow').should('have.css', 'background-color', 'rgb(34, 51, 68)');
  assertNoSeriousAccessibilityViolations('[data-slot="canvas-viewport-context-surface"]');
}

function assertNarrowImportAndLanguageControls(): void {
  cy.get('[data-slot="shell-project-code-command"]').click();
  cy.get('[data-slot="canvas-workspace-import-dbt-project-command"]').click();
  cy.get('[data-slot="dbt-project-import-dialog"]')
    .should('be.visible')
    .and('contain.text', 'Cancelar');
  cy.get('[data-slot="dbt-project-cancel-command"]').click();
  cy.get('[data-slot="dbt-project-import-dialog"]').should('not.exist');
  cy.get('body').should('not.have.css', 'pointer-events', 'none');
  cy.get('[data-slot="canvas-workspace-import-dbt-project-command"]').should('be.focused');

  cy.get('[data-slot="shell-menu-trigger"]').click();
  cy.get('[data-slot="shell-language-menu"]').should('contain.text', 'Idioma');
  cy.get('[role="menu"]')
    .should('not.contain.text', 'Fondo del canvas')
    .and('not.contain.text', 'Tamaño de rejilla')
    .and('not.contain.text', 'Propiedades del canvas');
  cy.get('[data-slot="shell-language-option-en"]').click();
  cy.get('[data-slot="shell-menu-trigger"]').should('contain.text', 'View');
  cy.get('html').should('have.attr', 'lang', 'en');
  cy.get('[data-slot="canvas-workspace-tab"]').click();
}

function assertNarrowPropertiesKeyboardAndValidation(): void {
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
  cy.get('[data-slot="canvas-settings-dialog"]').should('not.exist');
  cy.get('body').should('not.have.css', 'pointer-events', 'none');
  cy.get('[data-slot="canvas-viewport-context-surface"]').should('be.focused');
}

function assertPropertiesAtAccessibleViewportScales(): void {
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
  cy.get('[data-slot="canvas-settings-dialog"]').should('not.exist');
  cy.get('body').should('not.have.css', 'pointer-events', 'none');
  cy.get('[data-slot="canvas-viewport-context-surface"]').should('be.focused');
}

function assertEnglishCatalogAtMaximumZoom(): void {
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
}

export function assertNarrowScreenComposition(): void {
  assertNarrowCanvasEntryAndReadiness();
  assertNarrowComponentCatalog();
  assertNarrowProjectMenuAfterCreation();
  assertNarrowCodeZoomGeometry();
  assertNarrowCodeReturnsToCanvas();
  assertNarrowOperationalDrawerControls();
  assertNarrowCanvasPropertiesCancel();
  assertNarrowCanvasPropertiesApply();
  assertNarrowImportAndLanguageControls();
  assertNarrowPropertiesKeyboardAndValidation();
  assertPropertiesAtAccessibleViewportScales();
  assertEnglishCatalogAtMaximumZoom();
}
