/** Input bindings persist through the real UI; Output never authors a model. */
import { stubStatefulCanvasDraftAuthoring } from '../../support/canvasDraftAuthoring';
import { connectCanvasNodes } from '../../support/canvasGraphAuthoring';
import {
  getE2eApiCalls,
  installE2eApiFetchStub,
  stubE2eJsonApi,
  waitForE2eApiCall,
} from '../../support/e2eApiStub';
import {
  E2E_PROJECT_WORKSPACE,
  stubShellBootstrapApis,
  visitWithE2eWorkspaceSession,
} from '../../support/workspaceSession';

function visitInputs(
  disconnected = false,
  secondProducer = false,
  language = 'en',
  sourceInspectorOrdering = false
): void {
  cy.viewport(1920, 1080);
  stubShellBootstrapApis({ scopes: ['workspace:graph-draft:view', 'workspace:graph-draft:save'] });
  stubE2eJsonApi('GET', '/workspace/context', {
    defaultWorkspace: E2E_PROJECT_WORKSPACE,
    availableWorkspaces: [E2E_PROJECT_WORKSPACE],
  });
  stubE2eJsonApi('GET', '/capabilities', {
    apiVersion: '1.0.0',
    minFrontendVersion: '0.0.1',
    plugins: { dvt: { available: true } },
  });
  stubStatefulCanvasDraftAuthoring({
    canvasKind: 'transformation',
    columnMapping: true,
    columnMappingDisconnected: disconnected,
    columnMappingSecondSource: secondProducer,
    sourceInspectorOrdering,
  });
  visitWithE2eWorkspaceSession('/canvas', {
    onBeforeLoad(window) {
      window.localStorage.setItem(
        'dvt-web-application-language',
        JSON.stringify({ state: { language }, version: 0 })
      );
      window.localStorage.setItem(
        'dvt-web-canvas-interaction',
        JSON.stringify({
          state: {
            impactOverlayEnabled: false,
            columnLevelLineageEnabled: true,
            canvasLayouts: {},
          },
          version: 0,
        })
      );
    },
  });
  waitForE2eApiCall('/workspace/graph/draft', 'GET');
  node('source-orders').should('be.visible');
}
function node(id: string): Cypress.Chainable<JQuery<HTMLElement>> {
  return cy.get(`.react-flow__node[data-id="${id}"]`);
}
function expand(id: string): void {
  node(id)
    .find('button[aria-expanded]')
    .contains(/Columns|Columnas/)
    .click();
}
function showAll(id: string): void {
  node(id).contains('button', 'Show remaining columns').click();
}
function assertNoOutputAuthoring(): void {
  node('model-orders').contains('[role="tab"]', 'Output (Not configured)').click();
  node('model-orders').find('[role="status"]').should('have.text', 'Not configured');
  node('model-orders').find('[data-slot="graph-node-column-row"]').should('not.exist');
  node('model-orders').find('[data-slot="graph-node-column-output-state"]').should('not.exist');
  node('model-orders').contains('Map compatible columns').should('not.exist');
}
function assertSavedWithoutSemantics(): void {
  cy.wrap(null).should(() => {
    const body = getE2eApiCalls('/workspace/graph/draft', 'PUT').at(-1)?.body as
      { draft: { nodes: Array<{ id: string; metadata?: Record<string, unknown> }> } } | undefined;
    const consumer = body?.draft.nodes.find((entry) => entry.id === 'model-orders');
    expect(consumer).to.exist;
    expect(consumer?.metadata ?? {}).not.to.have.property('transformAuthoring');
  });
}
function removeInput(name: string): void {
  cy.get(`.react-flow__edge-columnLineage[aria-label="${name} → ${name}"]`).trigger('keydown', {
    key: ' ',
    code: 'Space',
    force: true,
  });
  cy.get(`button[aria-label="Remove mapping ${name} to ${name}"]`).click({ force: true });
}
function dropPublishedField(producerId: string, name: string): void {
  const transfer = new DataTransfer();
  node(producerId)
    .find(`[data-slot="graph-node-column-piece"][data-column-name="${name}"]`)
    .trigger('dragstart', { dataTransfer: transfer });
  node('model-orders')
    .find('[role="tabpanel"]')
    .trigger('dragover', { dataTransfer: transfer })
    .trigger('drop', { dataTransfer: transfer });
}

describe('Producer fields enter Input; Output is passive', () => {
  it('drags one published column from source properties into a disconnected Model and reloads it', () => {
    visitInputs(true, false, 'en', true);
    cy.viewport(1280, 720);
    node('source-orders').find('[data-slot="canvas-node-shell"]').click(40, 18);
    cy.get('.react-flow__controls-fitview').click();
    cy.get('[data-slot="canvas-node-workbench-tab-columns"]').should(
      'have.attr',
      'aria-selected',
      'true'
    );
    const field = '[data-slot="source-column-row"][data-column-name="customer"]';
    cy.get(field).should('be.visible').and('have.attr', 'draggable', 'true');
    const drop = (): Cypress.Chainable<void> =>
      cy.window().then((window) => {
        const dataTransfer = new window.DataTransfer();
        cy.get(field).trigger('dragstart', { dataTransfer });
        node('model-orders')
          .find('[data-slot="canvas-node-shell"]')
          .trigger('dragover', { dataTransfer })
          .trigger('drop', { dataTransfer });
        cy.get(field).trigger('dragend', { dataTransfer });
      });
    drop();
    node('model-orders').contains('[role="tab"]', 'Input (1)').should('be.visible');
    drop();
    node('model-orders').contains('[role="tab"]', 'Input (1)').should('be.visible');
    expand('model-orders');
    node('model-orders')
      .find('[data-slot="graph-node-column-piece"]')
      .should('have.length', 1)
      .and('contain.text', 'customer');
    cy.get('[data-slot="canvas-node-workbench-tab-columns"]').should(
      'have.attr',
      'aria-selected',
      'true'
    );
    cy.wrap(null).should(() => {
      const body = getE2eApiCalls('/workspace/graph/draft', 'PUT').at(-1)?.body as
        | {
            draft: {
              edges: Array<{
                sourceId: string;
                targetId: string;
                metadata?: { inputBindings?: { fields: unknown[] } };
              }>;
            };
          }
        | undefined;
      const bindings = body?.draft.edges.filter(
        (edge) => edge.sourceId === 'source-orders' && edge.targetId === 'model-orders'
      );
      expect(bindings).to.have.length(1);
      expect(bindings?.[0]?.metadata?.inputBindings?.fields).to.deep.equal([
        { inputId: 'input:source-orders:customer', producerFieldId: 'customer' },
      ]);
    });
    assertSavedWithoutSemantics();
    cy.screenshot('source-properties-one-field');
    cy.on('window:before:load', installE2eApiFetchStub);
    cy.reload();
    node('model-orders').contains('[role="tab"]', 'Input (1)').should('be.visible');
    node('model-orders').contains('[role="tab"]', 'Output (Not configured)').should('be.visible');
  });

  it('connects a producer without inventing operations or published fields', () => {
    visitInputs(true);
    connectCanvasNodes('Orders source', 'Orders Model');
    waitForE2eApiCall('/workspace/graph/draft', 'PUT');
    expand('source-orders');
    expand('model-orders');
    showAll('source-orders');
    showAll('model-orders');
    node('model-orders').contains('[role="tab"]', 'Input (6)').should('be.visible');
    cy.get('.react-flow__edge-columnLineage').should('have.length', 6);
    node('model-orders')
      .find('[data-port-variant="column"][data-port="source"]')
      .should('not.exist');
    assertNoOutputAuthoring();
    cy.get('.react-flow__edge-columnLineage').should('not.exist');
    assertSavedWithoutSemantics();
  });

  it('removes and restores a second producer field through Input and reloads the binding', () => {
    visitInputs(false, true);
    connectCanvasNodes('Health check', 'Orders Model');
    waitForE2eApiCall('/workspace/graph/draft', 'PUT');
    expand('source-orders');
    expand('source-health-check');
    expand('model-orders');
    showAll('source-orders');
    showAll('model-orders');
    node('model-orders').contains('[role="tab"]', 'Input (8)').should('be.visible');
    cy.get('.react-flow__edge-columnLineage').should('have.length', 8);
    removeInput('id');
    node('model-orders').contains('[role="tab"]', 'Input (7)').should('be.visible');
    dropPublishedField('source-health-check', 'id');
    node('model-orders').contains('[role="tab"]', 'Input (8)').should('be.visible');
    cy.get('.react-flow__edge-columnLineage[aria-label="id → id"]').should('exist');
    cy.wrap(null).should(() => {
      const body = getE2eApiCalls('/workspace/graph/draft', 'PUT').at(-1)?.body as
        | {
            draft: {
              edges: Array<{
                sourceId: string;
                metadata?: { inputBindings?: { fields: Array<{ producerFieldId: string }> } };
              }>;
            };
          }
        | undefined;
      expect(
        body?.draft.edges.find((edge) => edge.sourceId === 'source-health-check')?.metadata
          ?.inputBindings?.fields
      ).to.deep.include({ inputId: 'input:source-health-check:id', producerFieldId: 'id' });
    });
    assertNoOutputAuthoring();
    assertSavedWithoutSemantics();
    cy.on('window:before:load', installE2eApiFetchStub);
    cy.reload();
    node('model-orders').contains('[role="tab"]', 'Input (8)').should('be.visible');
    node('model-orders').contains('[role="tab"]', 'Output (Not configured)').should('be.visible');
  });

  it('does not accept a field drop on Output', () => {
    visitInputs();
    expand('source-orders');
    expand('model-orders');
    removeInput('customer');
    node('model-orders').contains('[role="tab"]', 'Input (5)').should('be.visible');
    assertNoOutputAuthoring();
    dropPublishedField('source-orders', 'customer');
    node('model-orders').contains('[role="tab"]', 'Input (5)').should('be.visible');
    node('model-orders').contains('[role="tab"]', 'Output (Not configured)').should('be.visible');
    node('model-orders').contains('[role="tab"]', 'Input (5)').click();
    dropPublishedField('source-orders', 'customer');
    node('model-orders').contains('[role="tab"]', 'Input (6)').should('be.visible');
    assertSavedWithoutSemantics();
  });

  it('exposes localized Input connectors without selection toggles', () => {
    visitInputs(false, false, 'es');
    expand('source-orders');
    expand('model-orders');
    node('source-orders').find('[aria-label="Conectar salida de order_id"]').should('be.visible');
    node('model-orders').find('[aria-label="Asignar a order_id"]').should('be.visible');
    node('model-orders').find('[data-slot="graph-node-column-output-state"]').should('not.exist');
    cy.injectAxe();
    cy.checkA11y('[data-slot="canvas-viewport-context-surface"]', {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
      includedImpacts: ['serious', 'critical'],
    });
  });
});
