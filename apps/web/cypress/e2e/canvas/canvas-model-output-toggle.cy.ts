// Owned concern: prove Model output authoring and column-menu lifecycle through save and reload.
import {
  decodeDvtSubstraitProjectionDocument,
  inspectDvtSubstraitProjectionDraft,
} from '../../../src/app/views/canvas/canvasDvtSubstraitProjection';
import { stubStatefulCanvasDraftAuthoring } from '../../support/canvasDraftAuthoring';
import { getE2eApiCalls, stubE2eJsonApi, waitForE2eApiCall } from '../../support/e2eApiStub';
import {
  E2E_PROJECT_WORKSPACE,
  stubShellBootstrapApis,
  visitWithE2eWorkspaceSession,
} from '../../support/workspaceSession';

function stubConnectedModel(): void {
  stubShellBootstrapApis({
    scopes: ['workspace:graph-draft:view', 'workspace:graph-draft:save'],
  });
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
    columnMappingNotNullCustomer: true,
  });
}

function visitCanvas(): void {
  visitWithE2eWorkspaceSession('/canvas', {
    onBeforeLoad(window) {
      window.localStorage.setItem(
        'dvt-web-application-language',
        JSON.stringify({ state: { language: 'en' }, version: 0 })
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
}

type DraftSave = {
  draft?: {
    nodes?: Array<{ id?: string; metadata?: Record<string, unknown> }>;
  };
};

function getModelSemanticSaves(): ReturnType<typeof getE2eApiCalls> {
  return getE2eApiCalls('/workspace/graph/draft', 'PUT').filter((call) => {
    const savedModel = (call.body as DraftSave | undefined)?.draft?.nodes?.find(
      (node) => node.id === 'model-orders'
    );
    return savedModel?.metadata?.transformAuthoring != null;
  });
}

function savedOutputNames(index: number): string[] {
  const savedModel = (
    getModelSemanticSaves()[index]?.body as DraftSave | undefined
  )?.draft?.nodes?.find((node) => node.id === 'model-orders');
  const authority = savedModel?.metadata?.transformAuthoring as
    { semanticDocument?: unknown } | undefined;
  const inspection = inspectDvtSubstraitProjectionDraft(
    decodeDvtSubstraitProjectionDocument(authority?.semanticDocument)
  );
  expect(inspection.ok).to.equal(true);
  if (!inspection.ok) throw new Error('Expected a valid saved projection.');
  return inspection.projection.outputs.map((output) => output.name);
}

function modelCard(): Cypress.Chainable<JQuery<HTMLElement>> {
  return cy.get('.react-flow__node[data-id="model-orders"]');
}

function modelColumnRow(name: string): Cypress.Chainable<JQuery<HTMLElement>> {
  return modelCard().contains('[data-slot="graph-node-column-row"]', name);
}

function expectOutput(name: string, output: boolean): void {
  modelColumnRow(name)
    .find('[data-slot="graph-node-column-output-state"]')
    .should('not.be.disabled')
    .and('have.attr', 'aria-pressed', String(output));
}

function openModelColumns(): void {
  modelCard().contains('button[aria-expanded]:visible', 'Columns').should('be.visible').click();
}

function assertColumnMenuStaysOpenAndReopens(): void {
  modelCard()
    .find('[data-slot="graph-node-column-piece"][data-column-name="customer"]')
    .rightclick(20, 10);
  cy.get('[data-slot="graph-node-column-function-menu"]').should('be.visible');
  cy.wait(1500);
  cy.get('[data-slot="graph-node-column-function-menu"]').should('be.visible');
  cy.get('body').type('{esc}');
  cy.get('[data-slot="graph-node-column-function-menu"]').should('not.exist');
  modelCard()
    .find('[data-slot="graph-node-column-piece"][data-column-name="customer"]')
    .rightclick(20, 10);
  cy.get('[data-slot="graph-node-column-function-menu"]').should('be.visible');
}

describe('Canvas Model output toggle lifecycle', () => {
  it('persists one selected inherited output without timed menu dismissal', () => {
    cy.viewport(1920, 1080);
    stubConnectedModel();
    visitCanvas();

    openModelColumns();
    modelColumnRow('customer')
      .should('contain.text', 'NN')
      .find('[data-slot="graph-node-column-output-state"]')
      .should('not.be.disabled')
      .and('have.attr', 'aria-pressed', 'false')
      .click();

    cy.wrap(null).should(() => {
      expect(getModelSemanticSaves()).to.have.length(1);
      expect(savedOutputNames(0)).to.deep.equal(['customer']);
    });
    modelColumnRow('customer').should('contain.text', 'NN');
    expectOutput('customer', true);
    expectOutput('order_id', false);
    expectOutput('amount', false);

    visitCanvas();
    openModelColumns();
    modelColumnRow('customer').should('contain.text', 'NN');
    expectOutput('customer', true);
    expectOutput('order_id', false);
    expectOutput('amount', false);
    assertColumnMenuStaysOpenAndReopens();

    visitCanvas();
    openModelColumns();
    expectOutput('customer', true);

    modelCard()
      .find('[data-slot="graph-node-column-piece"][data-column-name="amount"]')
      .focus()
      .trigger('keydown', { key: 'ArrowUp', altKey: true })
      .trigger('keydown', { key: 'ArrowUp', altKey: true });
    modelCard()
      .find('[data-slot="graph-node-column-piece"]')
      .then(($columns) => {
        expect([...$columns].map((column) => column.dataset.columnName).slice(0, 3)).to.deep.equal([
          'amount',
          'order_id',
          'customer',
        ]);
      });

    modelColumnRow('customer').find('[data-slot="graph-node-column-output-state"]').click();
    cy.wrap(null).should(() => {
      expect(getModelSemanticSaves()).to.have.length(2);
      expect(savedOutputNames(1)).to.deep.equal([]);
    });
    modelColumnRow('customer').should('contain.text', 'NN');
    expectOutput('customer', false);

    visitCanvas();
    openModelColumns();
    modelColumnRow('customer').should('contain.text', 'NN');
    expectOutput('customer', false);
    expectOutput('order_id', false);
    expectOutput('amount', false);
    cy.wrap(null).should(() => {
      expect(getModelSemanticSaves()).to.have.length(2);
    });
  });
});
