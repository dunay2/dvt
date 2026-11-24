import { buildCanvasAuthoringDraft } from '../canvasDrafts/buildCanvasAuthoringDraft';
import { openCanvasContextMenuAt, openCanvasNodeOperations } from '../canvasExecutionSelection';
import { getE2eApiCalls, waitForE2eApiCall } from '../e2eApiStub';
import { pressNativeKey } from '../nativeKeyboard';
import { openWorkbenchProperties } from '../relationalWorkbench/navigation';
import { assertNoSeriousAccessibilityViolations } from '../shellWorkbench/accessibilityAssertions';
import { emulateAccessibilityMedia } from '../shellWorkbench/browserEmulation';
import { assertDependencyDirectionCues } from '../shellWorkbench/dependencyDirection';
import { readProjectCode } from '../shellWorkbench/projectCodeReadback';
import { visitWithE2eWorkspaceSession } from '../workspaceSession';

import type { ScreenCompositionFixtureInput, ScreenCompositionScenario } from './scenario';

function prepareDirectionalFocusCanvas(scenario: ScreenCompositionScenario): void {
  const graphDraft = buildCanvasAuthoringDraft({ includeLooseNode: true });
  scenario.persistedDraft = {
    revision: 'rev-e2e-graph-ready',
    draft: {
      ...graphDraft,
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
}

function assertNodeFocusAndExecutionSelection(): void {
  cy.get('.react-flow__node[data-id="model_orders"]').as('modelNode').should('be.visible');
  cy.get('.react-flow__node[data-id="orphan_metrics"]').as('orphanNode').should('be.visible');
  openCanvasContextMenuAt(260, 260);
  cy.get('[data-menu-action="open-canvas-settings"]').click();
  cy.get('[data-slot="canvas-properties-impact"]')
    .should('have.attr', 'data-state', 'unchecked')
    .click();
  cy.get('[data-slot="workbench-properties-apply"]').click();
  cy.get('[data-slot="canvas-settings-dialog"]').should('not.exist');
  cy.get('body').should('not.have.css', 'pointer-events', 'none');
  cy.get('[data-slot="canvas-viewport-context-surface"]').should('be.focused');

  cy.get('@modelNode').click();
  cy.focused().closest('.react-flow__node').should('have.attr', 'data-id', 'model_orders');
  cy.get('@modelNode').find('[data-slot="graph-node-card"]').should('have.css', 'opacity', '1');
  cy.get('@orphanNode').find('[data-slot="graph-node-card"]').should('have.css', 'opacity', '0.3');

  cy.get('@orphanNode').focus();
  cy.get('@orphanNode').find('[data-slot="graph-node-card"]').should('have.css', 'opacity', '1');
  cy.get('@modelNode').find('[data-slot="graph-node-card"]').should('have.css', 'opacity', '0.3');

  cy.get('.react-flow__pane').click('topLeft');
  cy.get('@modelNode').find('[data-slot="graph-node-card"]').should('have.css', 'opacity', '1');
  cy.get('@orphanNode').find('[data-slot="graph-node-card"]').should('have.css', 'opacity', '1');

  cy.get('@modelNode').find('[data-slot="graph-node-card-play"]').should('not.exist');
  cy.get('@modelNode').find('[data-slot="canvas-node-shell"]').focus().should('be.focused');
  openCanvasNodeOperations('model_orders');
  cy.contains('[data-slot="canvas-node-context-menu-item"]', 'Seleccionar para ejecución').click();
  cy.get('[data-slot="canvas-node-context-menu"]').should('not.exist');
  cy.get('body').should('not.have.css', 'pointer-events', 'none');
  cy.focused().closest('.react-flow__node').should('have.attr', 'data-id', 'model_orders');
  openCanvasNodeOperations('model_orders');
  cy.contains('[data-slot="canvas-node-context-menu-item"]', 'Quitar de la ejecución').should(
    'be.visible'
  );
  cy.focused().type('{esc}');
  cy.get('[data-slot="canvas-node-context-menu"]').should('not.exist');
  cy.get('body').should('not.have.css', 'pointer-events', 'none');
  cy.focused().closest('.react-flow__node').should('have.attr', 'data-id', 'model_orders');
  cy.get('.react-flow__pane').click('topLeft');
  cy.get('@orphanNode').find('[data-slot="graph-node-card"]').should('have.css', 'opacity', '1');
  cy.get('@modelNode').find('[data-slot="canvas-node-shell"]').focus().should('be.focused');
  openCanvasNodeOperations('model_orders');
  cy.contains('[data-slot="canvas-node-context-menu-item"]', 'Quitar de la ejecución').should(
    'be.visible'
  );
  cy.focused().type('{esc}');
  cy.get('[data-slot="canvas-node-context-menu"]').should('not.exist');
  cy.focused().closest('.react-flow__node').should('have.attr', 'data-id', 'model_orders');
  cy.get('@modelNode').find('[data-slot="graph-node-card-play"]').should('not.exist');
  assertDependencyDirectionCues();

  cy.get('[data-slot="canvas-viewport-context-surface"]').type('{ctrl}f');
  cy.get('[data-slot="canvas-graph-search-control"] input').type('orders');
  cy.get('.react-flow__edge.canvas-graph-search-relevant-edge').should('have.length.at.least', 1);
  assertDependencyDirectionCues();
  cy.get('[data-slot="canvas-graph-search-control"] input').type('{esc}');
}

function assertInspectorFocusReturnsToNodes(): void {
  cy.get('.react-flow__controls-fitview').click();
  openWorkbenchProperties('model_orders');
  cy.get('[data-slot="canvas-node-workbench-panel"] h2')
    .should('be.visible')
    .and('have.text', 'model_orders');
  cy.get('[data-slot="canvas-node-workbench-overlay"]').should('be.visible');

  cy.get('[data-slot="canvas-node-workbench-drag-handle"]').should('not.exist');
  cy.get('[data-slot="canvas-node-workbench-overlay"]').should(($panel) => {
    expect($panel[0]!.tagName).to.equal('ASIDE');
    expect($panel[0]!.style.left).to.equal('');
    expect($panel[0]!.getBoundingClientRect().right).to.be.at.most(
      $panel[0]!.ownerDocument.defaultView!.innerWidth
    );
  });
  assertNoSeriousAccessibilityViolations('[data-slot="canvas-node-workbench-overlay"]');
  cy.get('[data-slot="canvas-node-workbench-close"]').click();
  cy.get('.react-flow__node[data-id="model_orders"]')
    .find('[data-slot="canvas-node-shell"]')
    .should('be.focused');

  openWorkbenchProperties('orphan_metrics');
  cy.get('[data-slot="canvas-node-workbench-panel"] h2')
    .should('be.visible')
    .and('have.text', 'orphan_metrics');
  cy.get('[data-slot="canvas-node-workbench-close"]').click();
  cy.get('[data-slot="canvas-node-workbench-overlay"]').should('not.exist');
  cy.get('@orphanNode').find('[data-slot="canvas-node-shell"]').should('be.focused');

  cy.get('.react-flow__controls-fitview').should('be.visible').click();
  openWorkbenchProperties('src_orders');
  cy.get('[data-slot="canvas-node-workbench-close"]').click();
  cy.get('[data-slot="canvas-node-workbench-overlay"]').should('not.exist');
  cy.get('.react-flow__node[data-id="src_orders"]')
    .find('[data-slot="canvas-node-shell"]')
    .should('be.focused');
}

function assertProjectCodeClosePreservesCanvas(): void {
  cy.get('[data-slot="canvas-code-main-tab"]').click();
  cy.get('[data-slot="canvas-code-tab-close"]').should('be.visible').click();
  cy.get('[data-slot="canvas-code-main-tab"]').should('not.exist');
  cy.get('[data-slot="canvas-code-workspace-surface"]').should('not.exist');
  cy.get('[data-slot="canvas-workspace-tab"]')
    .should('have.attr', 'aria-selected', 'true')
    .and('be.focused');
  cy.get<JQuery<HTMLElement>>('@codeLifetimeViewport').then(($original) => {
    cy.get('[data-testid="canvas-viewport"]').should(($current) => {
      expect($current[0], 'closing Code preserves the existing Canvas').to.equal($original[0]);
    });
  });
}

function assertProjectFilesRetainCanvas({
  MODEL_PATH,
  MODEL_SQL,
  ORPHAN_PATH,
  ORPHAN_SQL,
  CLIPBOARD_EOL,
}: ScreenCompositionFixtureInput): void {
  cy.get('[data-testid="canvas-viewport"]').as('codeLifetimeViewport', { type: 'static' });
  for (const [path, sql] of [
    [MODEL_PATH, MODEL_SQL],
    [ORPHAN_PATH, ORPHAN_SQL],
    [MODEL_PATH, MODEL_SQL],
  ] as const) {
    cy.get('[data-slot="shell-project-code-command"]').click();
    cy.get('[data-slot="canvas-code-main-tab"]').should('have.attr', 'aria-selected', 'true');
    cy.get('[data-slot="canvas-code-workspace-surface"]').should('be.visible');
    cy.get(
      `[data-slot="canvas-code-workspace-surface"] [data-slot="code-workspace-file-entry"][data-workspace-path="${path}"]`
    )
      .should('be.visible')
      .click();
    waitForE2eApiCall(`/workspace/files/${encodeURIComponent(path)}`, 'GET');
    cy.get('[data-slot="canvas-code-workspace-surface"] [data-testid="monaco-code-viewer"]').should(
      'be.visible'
    );
    readProjectCode()
      .should('equal', sql.replaceAll('\n', CLIPBOARD_EOL))
      .and(
        'not.equal',
        (path === MODEL_PATH ? ORPHAN_SQL : MODEL_SQL).replaceAll('\n', CLIPBOARD_EOL)
      );
    assertNoSeriousAccessibilityViolations('[data-slot="canvas-code-workspace-surface"]');
    cy.get('[data-slot="canvas-workspace-tab"]')
      .click()
      .should('have.attr', 'aria-selected', 'true')
      .and('be.focused');
    cy.get('[data-slot="canvas-code-main-tab"]').should('have.attr', 'aria-selected', 'false');
    cy.get('[data-slot="canvas-workspace-surface"]').should('be.visible');
    cy.get('[data-slot="canvas-code-workspace-surface"]')
      .should('not.be.visible')
      .and('have.attr', 'aria-hidden', 'true')
      .and('have.attr', 'inert');
    assertProjectCodeClosePreservesCanvas();
    cy.get('[data-slot="shell-project-code-command"]').click();
    cy.get('[data-slot="canvas-code-main-tab"]')
      .should('have.length', 1)
      .and('have.attr', 'aria-selected', 'true');
    cy.get('[data-slot="canvas-code-workspace-surface"]').should('have.length', 1);
    cy.get(
      `[data-slot="canvas-code-workspace-surface"] [data-slot="code-workspace-file-entry"][data-workspace-path="${path}"]`
    ).click();
    readProjectCode().should('equal', sql.replaceAll('\n', CLIPBOARD_EOL));
    cy.get('[data-testid="monaco-code-editor"]').should('not.exist');
    cy.get('[data-slot="canvas-workspace-tab"]').click();
  }
  cy.then(() => {
    expect(getE2eApiCalls(/^\/workspace\/files\//, 'POST')).to.have.length(0);
  });
}

function assertAccessibleShellFocus(): void {
  assertNoSeriousAccessibilityViolations('[data-slot="canvas-viewport-context-surface"]');
  emulateAccessibilityMedia();
  assertDependencyDirectionCues();
  cy.get('.react-flow__node[data-id="model_orders"]').focus().should('be.focused');
  cy.get('.react-flow__node[data-id="model_orders"]').should(($node) => {
    expect(getComputedStyle($node.get(0)).outlineStyle).not.to.equal('none');
  });
  // System contrast and reduced motion must also preserve the newly direct shell controls.
  cy.get('[data-slot="left-navigation-link"][href="/canvas"]').focus();
  cy.press(Cypress.Keyboard.Keys.TAB);
  cy.get('[data-slot="left-navigation-link"][href="/canvas"]')
    .focus()
    .should('be.focused')
    .and(($link) => {
      const style = getComputedStyle($link[0]!);
      expect(style.outlineStyle).not.to.equal('none');
      expect(parseFloat(style.outlineWidth)).to.be.greaterThan(0);
      expect(style.transitionDuration).to.equal('0s');
    });
  cy.get('[data-slot="shell-about-command"]').focus().should('be.focused');
  pressNativeKey('Enter');
  cy.get('[data-slot="shell-about-dialog"]').should('be.visible');
  pressNativeKey('Escape');
  cy.get('[data-slot="shell-about-command"]').should('be.focused');
}

export function assertDirectionalScreenComposition(
  input: ScreenCompositionFixtureInput,
  scenario: ScreenCompositionScenario
): void {
  prepareDirectionalFocusCanvas(scenario);
  assertNodeFocusAndExecutionSelection();
  assertInspectorFocusReturnsToNodes();
  assertProjectFilesRetainCanvas(input);
  assertAccessibleShellFocus();
}
