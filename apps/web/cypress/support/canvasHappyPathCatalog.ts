/** Owned concern: prove catalog disclosure, placement boundaries and scoped connection management. */
import type { CanvasAuthoringDraft } from './canvasDrafts/scenario';
import { getE2eApiCalls, stubE2eJsonApi } from './e2eApiStub';
import { pressNativeKey } from './nativeKeyboard';
import { dragWorkbenchField } from './relationalWorkbench/pointer';
export function seedCatalogModels(initialDraft: CanvasAuthoringDraft): void {
  stubE2eJsonApi('GET', '/workspace/files', []);
  initialDraft.nodes.push(
    {
      id: 'catalog-client',
      name: 'Customers',
      pluginId: 'dvt',
      kind: 'dvt:source',
      role: 'input',
      status: 'idle',
      tags: [],
      metadata: { resourceType: 'source', schema: 'raw', tableIdentifier: 'client' },
    },
    {
      id: 'catalog-revenue',
      name: 'Revenue without physical connection',
      pluginId: 'dvt',
      kind: 'dvt:transform',
      role: 'transform',
      status: 'idle',
      tags: [],
    },
    {
      id: 'catalog-seed',
      name: 'Country seed',
      pluginId: 'dbt',
      kind: 'dbt:seed',
      role: 'input',
      status: 'idle',
      tags: [],
      metadata: { resourceType: 'seed' },
    }
  );
}

export function assertCatalogFacets(): void {
  cy.get('[data-slot="canvas-explorer-model-count"]').should('have.text', '3');
  cy.get('[data-slot="canvas-explorer-models"]')
    .should('contain.text', 'Customers')
    .and('contain.text', 'Revenue without physical connection')
    .and('contain.text', 'Country seed');
  cy.get('[data-element-id="catalog-client"]').should('contain.text', 'Fuente');
  cy.get('[data-element-id="catalog-seed"]').should('not.contain.text', 'Fuente');
  cy.get('[data-slot="canvas-explorer-models"] [data-model-icon="model"]').should('have.length', 3);
  cy.get('[data-slot="canvas-explorer-connections"] button[aria-expanded]').first().focus();
  pressNativeKey('Enter');
  cy.get('[data-slot="canvas-explorer-connection-count"]').should('have.text', '1');
  cy.get('[data-slot="canvas-explorer-connections"]').should('contain.text', 'Project warehouse');
}

export function inspectCatalogDisclosureAndSearch(): void {
  let writesBeforeDisclosure = 0;
  cy.get('[data-testid="canvas-viewport"]').should('be.visible');
  cy.then(() => expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(0));
  cy.get('[data-slot="canvas-draft-save-status"]').should('not.exist');
  cy.then(() => {
    writesBeforeDisclosure = getE2eApiCalls('/workspace/graph/draft', 'PUT').length;
  });
  cy.get('[data-slot="canvas-explorer-model-disclosure"][data-model-id="catalog-client"]').focus();
  cy.press(Cypress.Keyboard.Keys.SPACE);
  cy.get('[data-slot="canvas-explorer-model-disclosure"][data-model-id="catalog-client"]')
    .should('have.attr', 'aria-expanded', 'true')
    .and('be.focused');
  cy.get('.react-flow__node').should('have.length', 0);
  cy.then(() =>
    expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(writesBeforeDisclosure)
  );
  cy.get('[data-slot="canvas-explorer-models"] input[type="search"]').type('Fuente');
  cy.get('[data-slot="canvas-explorer-model-count"]').should('have.text', '1');
  cy.get('[data-element-id="catalog-client"]').should('be.visible');
  cy.get('[data-element-id="catalog-seed"]').should('not.exist');
  cy.get('[data-slot="canvas-explorer-models"] input[type="search"]').clear().type('no-such-model');
  cy.get('[data-slot="canvas-explorer-model-count"]').should('have.text', '0');
  cy.get('[data-slot="canvas-explorer-models"]').should('contain.text', 'No hay coincidencias.');
  cy.get('[data-slot="canvas-explorer-models"] input[type="search"]').clear();
  cy.get('[data-slot="canvas-explorer-model-disclosure"][data-model-id="catalog-client"]').click();
  cy.get('[data-slot="canvas-explorer-connections"] button[aria-expanded]').first().click();
}

export function assertCatalogControlScale(): void {
  cy.get('[data-element-id="catalog-client"]').should(($button) => {
    const button = $button[0]!;
    const document = button.ownerDocument;
    const window = document.defaultView!;
    const rootStyle = window.getComputedStyle(document.documentElement);
    const roleSize = (role: string): number =>
      Number.parseFloat(rootStyle.getPropertyValue(role)) * Number.parseFloat(rootStyle.fontSize);
    const controlSize = roleSize('--text-ui');
    const canvasTab = document.getElementById('canvas-workspace-tab')!;
    expect(
      Number.parseFloat(window.getComputedStyle(canvasTab).fontSize),
      'surrounding Canvas tab'
    ).to.be.at.least(controlSize);
    for (const control of [
      button,
      document.querySelector('[data-slot="canvas-explorer"] h3')!,
      document.querySelector('[data-slot="canvas-explorer-models"] button[aria-expanded]')!,
      document.querySelector('[data-slot="canvas-explorer-models"] input[type="search"]')!,
    ]) {
      expect(
        Number.parseFloat(window.getComputedStyle(control).fontSize),
        'shared UI control scale'
      ).to.equal(controlSize);
    }
    const facet = document.getElementById(button.getAttribute('aria-describedby')!);
    expect(facet, 'the real Source property remains accessible').not.to.equal(null);
    expect(Number.parseFloat(window.getComputedStyle(facet!).fontSize)).to.equal(
      roleSize('--text-ui-micro')
    );
    expect(roleSize('--text-ui-micro')).to.be.lessThan(controlSize);
  });
  cy.contains('[data-slot="canvas-explorer"] h3', 'Explorador').should('be.visible');
  cy.get('[data-slot="canvas-explorer"]').screenshot('project-catalog--connections-models');
  cy.viewport(1544, 868);
  cy.document().should((document) => {
    expect(document.documentElement.scrollWidth).to.be.at.most(1544);
  });
}

export function inspectAndPlaceCatalogSource(writesBeforeDisclosure = 0): void {
  cy.get('[data-element-id="catalog-client"]').dblclick();
  cy.get('.react-flow__node').should('have.length', 0);
  cy.get('[data-slot="canvas-node-workbench-panel"]').should('be.visible');
  cy.get('[data-slot="canvas-node-workbench-tab-general"]').should(
    'have.attr',
    'aria-selected',
    'true'
  );
  // Catalogue inspection must never take the placement rail, including an unplaced Source.
  cy.get('[data-element-id="catalog-client"]').click();
  cy.get('[data-slot="canvas-node-workbench-tab-general"]')
    .should('have.attr', 'aria-selected', 'true')
    .and('contain.text', 'Resumen');
  cy.get('.react-flow__node').should('have.length', 0);
  cy.get('[data-element-id="catalog-client"]').should('have.attr', 'aria-pressed', 'true');
  cy.then(() =>
    expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(writesBeforeDisclosure)
  );
  cy.get('[data-slot="canvas-node-workbench-close"]').click();
  cy.get('[data-slot="canvas-node-workbench-panel"]').should('not.exist');
  // Check the actual placement control before the native gesture.
  cy.get('[data-element-id="catalog-client"]')
    .should('be.enabled')
    .and('have.attr', 'draggable', 'true');
  dragWorkbenchField('[data-element-id="catalog-client"]', '[data-testid="canvas-viewport"]');
  cy.get('.react-flow__node').should('have.length', 1);
  cy.get('.react-flow__node').first().find('[data-slot="canvas-node-shell"]').click(50, 18);
  cy.get('[data-slot="canvas-node-workbench-tab-general"]').should(
    'have.attr',
    'aria-selected',
    'true'
  );
  cy.get('[data-slot="canvas-node-workbench-close"]').click();
  cy.get('[data-slot="canvas-explorer-model-count"]').should('have.text', '3');
  cy.get('#canvas-code-main-tab').should('not.exist');
  cy.then(() => expect(getE2eApiCalls('/workspace/files', 'POST')).to.have.length(0));
  // Element screenshots restore runner geometry asynchronously; capture after native gestures.
  cy.get('[data-slot="canvas-explorer"]').screenshot('project-catalog--desktop');
}

export function manageCanvasConnections(writesBeforeManagement = 0): void {
  cy.get('[data-slot="canvas-draft-save-indicator"]').should('not.exist');
  cy.get(
    '[data-slot="canvas-explorer-connections"] button[aria-label="Configure connections"]'
  ).click();
  cy.get('[data-slot="source-import-workspace"]').within(() => {
    cy.contains('h2', 'Connections').should('be.visible');
    cy.contains('button', 'New connection').click();
    cy.get('[data-slot="source-import-create-connection-name"]').type('Managed warehouse');
    cy.get('[data-slot="source-import-create-connection-database"]').type('analytics');
    cy.get('[data-slot="source-import-create-connection-credential-ref"]').type(
      'postgres:managed-warehouse'
    );
    cy.contains('button', 'Create connection').click();
    cy.contains('Managed warehouse').should('be.visible');
    cy.get('[data-slot="source-import-connection-search"]').should('be.visible');
    cy.contains('button', /^Done$/).click();
  });
  cy.get('[data-slot="source-import-workspace"]').should('not.exist');
  cy.get(
    '[data-slot="canvas-explorer-connections"] button[aria-label="Configure connections"]'
  ).should('be.focused');
  cy.get('[data-slot="canvas-explorer-connection-count"]').should('have.text', '2');
  cy.get('.react-flow__node').should('have.length', 0);
  cy.then(() => {
    const requests = getE2eApiCalls('/workspace/warehouse/connections', 'POST');
    expect(requests).to.have.length(1);
    expect(requests[0]!.body).to.deep.equal({
      name: 'Managed warehouse',
      type: 'postgres',
      database: 'analytics',
      credentialRef: 'postgres:managed-warehouse',
    });
    expect(getE2eApiCalls('/workspace/sources/import', 'POST')).to.have.length(0);
    expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(writesBeforeManagement);
  });
  cy.get('[data-slot="canvas-explorer-connections"] button[aria-expanded]').first().click();
  cy.get('[data-slot="canvas-explorer-connections"]').should('contain.text', 'Managed warehouse');
  cy.get('@managementObjectReads.all').should('have.length', 0);
  cy.get('[data-slot="canvas-explorer"]').screenshot('project-connections--created');
}
