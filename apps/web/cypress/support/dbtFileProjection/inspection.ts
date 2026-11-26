/** Inspect projected resources and check the authoritative file and its revision. */
import { requestLiveDbtProjectGraph } from '../dbtProjectLive';
import { readLiveWorkspaceFile } from '../liveProtectedRuntime';
import { openWorkbenchProperties } from '../relationalWorkbench/navigation';

import { CANVAS_ID, PROJECT_FILES, PROJECT_ROOT } from './project';

export function readInitialProjectRevision(): void {
  readLiveWorkspaceFile(`${PROJECT_ROOT}/models/orders.sql`).then((response) => {
    expect(response.status).to.equal(200);
    expect(response.body).to.have.property(
      'content',
      PROJECT_FILES[`${PROJECT_ROOT}/models/orders.sql`]
    );
    cy.wrap(response.body)
      .its('contentSha256')
      .should('match', /^[a-f0-9]{64}$/)
      .as('openedModelRevision');
  });
  cy.viewport(1500, 900);
  requestLiveDbtProjectGraph(PROJECT_ROOT, CANVAS_ID).then((response) => {
    const body = response.body as {
      readonly freshness?: unknown;
      readonly diagnostics?: unknown;
    };
    expect(response.status).to.equal(200);
    expect(body.freshness, JSON.stringify(body.diagnostics)).to.equal('fresh');
  });
}

export function assertProjectedResourceCards(): void {
  cy.get('.react-flow__node[data-id="source.analytics.raw.orders"]', {
    timeout: 60_000,
  })
    .should('be.visible')
    .and('contain.text', 'orders');
  cy.get('.react-flow__node[data-id="model.analytics.orders"]')
    .should('be.visible')
    .find('[data-slot="graph-node-column-toggle"]')
    .should('contain.text', 'Columns (2)');
  openWorkbenchProperties('model.analytics.orders');
  cy.get('[data-slot="canvas-card-metrics-switch"]')
    .should('have.attr', 'aria-checked', 'false')
    .click();
  cy.get('[data-slot="canvas-node-workbench-close"]').click();
  cy.get('.react-flow__node[data-id="model.analytics.orders"]')
    .find('[data-slot="graph-node-operational-rail"]')
    .within(() => {
      cy.contains('Rows').should('be.visible');
      cy.contains('Size').should('be.visible');
    });
  cy.get('[data-slot="canvas-viewport-context-surface"] .react-flow__node').should(
    'have.length',
    7
  );
  cy.get('[data-slot="canvas-viewport-context-surface"] .react-flow__controls-fitview').click();
  cy.get('.react-flow__node[data-id="seed.analytics.country_codes"]').should('be.visible');
  cy.get('.react-flow__node[data-id="snapshot.analytics.orders_snapshot"]').should('be.visible');
  cy.get('.react-flow__node[data-id="exposure.analytics.orders_dashboard"]').should('be.visible');
  cy.get('.react-flow__node[data-id^="test.analytics.not_null_orders_order_id."]')
    .should('be.visible')
    .and('contain.text', 'Not Null Orders Order Id');
  cy.get('.react-flow__node[data-id^="test.analytics.unique_orders_order_id."]')
    .should('be.visible')
    .and('contain.text', 'Unique Orders Order Id');
  cy.get('.react-flow__edge').should('have.length.greaterThan', 0);
}

export function inspectSourceColumns(): void {
  cy.get('[data-slot="canvas-explorer-sources-toggle"]').should('not.exist');
  cy.get('a[data-slot="left-navigation-link"][href="/canvas"]')
    .click()
    .should('have.attr', 'aria-expanded', 'true');
  cy.get('[data-element-id="source.analytics.raw.orders"]')
    .filter(':visible')
    .should('be.enabled')
    .and('have.prop', 'draggable', true);
  openWorkbenchProperties('source.analytics.raw.orders');
  cy.get('[data-slot="canvas-node-workbench-overlay"]').should('contain.text', 'orders');
  cy.get('[data-slot="canvas-node-workbench-tab-columns"]').click();
  cy.get('[data-slot="canvas-node-workbench-overlay"]')
    .should('contain.text', 'order_id')
    .and('contain.text', 'customer_id');
  cy.get('[data-slot="canvas-node-workbench-close"]').click();
  cy.get('[data-slot="canvas-node-workbench-overlay"]').should('not.exist');
  cy.get('[data-slot="canvas-viewport-context-surface"] .react-flow__node').should(
    'have.length',
    7
  );
}

export function inspectReadOnlyModelCode(observedFileWrites: readonly string[]): void {
  // Inspect the node with one click, then request its Code section explicitly.
  cy.get('.react-flow__node[data-id="model.analytics.orders"]')
    .find('[data-slot="graph-node-card-title"]')
    .click();
  cy.get('[data-slot="canvas-node-workbench-overlay"]', { timeout: 20_000 }).should('be.visible');
  cy.get('[data-slot="canvas-node-workbench-tab-code"]')
    .should('be.visible')
    .click()
    .and('have.attr', 'aria-selected', 'true');

  // Properties Code inspects the authoritative file without changing it.
  cy.get('[data-slot="workspace-file-code-editor"]', { timeout: 30_000 })
    .should('be.visible')
    .and('have.attr', 'data-file-path', `${PROJECT_ROOT}/models/orders.sql`);
  cy.get('[data-testid="monaco-code-editor"]').should('not.exist');
  cy.get('[data-testid="monaco-code-viewer"]', { timeout: 30_000 })
    .find('.view-lines')
    .invoke('text')
    .should((editorText) => {
      expect(editorText.replaceAll('\u00a0', ' ')).to.match(/source\(\s*'raw'\s*,\s*'orders'\s*\)/);
    });
  cy.get('[data-testid="monaco-code-viewer"] .view-line').first().click();
  cy.get('[data-testid="monaco-code-viewer"] textarea.inputarea')
    .should('have.prop', 'readOnly', true)
    .and('be.focused');
  cy.get('[data-testid="monaco-code-viewer"] textarea.inputarea').type('blocked_projection_edit', {
    force: true,
    delay: 0,
  });
  cy.get('@openedModelRevision').then((revision) => {
    readLiveWorkspaceFile(`${PROJECT_ROOT}/models/orders.sql`).then((response) => {
      expect(response.status).to.equal(200);
      expect(response.body).to.have.property(
        'content',
        PROJECT_FILES[`${PROJECT_ROOT}/models/orders.sql`]
      );
      expect(response.body).to.have.property('contentSha256', revision);
      expect(observedFileWrites).to.deep.equal([]);
    });
  });
  cy.get('[data-slot="canvas-contextual-workbench"]').should('not.exist');
}

export function inspectModelProperties(): void {
  // Other Properties sections remain in the same node context.
  cy.get('[data-slot="canvas-node-workbench-overlay"]', { timeout: 20_000 }).should('be.visible');
  cy.get('[data-slot="canvas-node-workbench-help"]')
    .should('be.visible')
    .and('have.attr', 'aria-label');
  cy.get('[data-slot="canvas-node-workbench-tab-columns"]').click();
  cy.get('[data-slot="canvas-node-workbench-overlay"]')
    .should('contain.text', 'order_id')
    .and('contain.text', 'integer')
    .and('contain.text', 'customer_id');
  cy.get('[data-slot="canvas-node-workbench-tab-tests"]').click();
  cy.get('[data-slot="canvas-node-workbench-overlay"]')
    .should('contain.text', 'Value is present')
    .and('contain.text', 'blocks run');

  cy.get('[data-slot="canvas-node-workbench-close"]').should('be.visible').click();
  cy.get('[data-slot="canvas-node-workbench-overlay"]').should('not.exist');
  cy.get('[data-slot="canvas-node-floating-toolbar"]').should('not.exist');

  // The shared context menu keeps one Properties entry for node inspection.
  cy.get('.react-flow__node[data-id="model.analytics.orders"]')
    .find('[data-slot="graph-node-card-title"]')
    .rightclick();
  cy.get('[data-slot="canvas-node-context-menu"]', { timeout: 20_000 })
    .should('be.visible')
    .within(() => {
      cy.contains('[role="menuitem"]', 'Properties').should('be.visible');
      cy.contains('[role="menuitem"]', 'Open code').should('not.exist');
    });
  cy.get('body').type('{esc}', { force: true });
  cy.get('[data-slot="canvas-node-context-menu"]').should('not.exist');
}
