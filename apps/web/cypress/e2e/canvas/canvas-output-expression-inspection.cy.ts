/** Owned concern: inspect persisted output expressions through real Canvas gestures without writes. */
import { stubStatefulCanvasDraftAuthoring } from '../../support/canvasDraftAuthoring';
import { getE2eApiCalls, stubE2eJsonApi, waitForE2eApiCall } from '../../support/e2eApiStub';
import {
  E2E_PROJECT_WORKSPACE,
  stubShellBootstrapApis,
  visitWithE2eWorkspaceSession,
} from '../../support/workspaceSession';

const CARD = '.react-flow__node[data-id="model-orders"]';
const VIEWER = '[data-slot="semantic-output-expression"]';

function visitCanvas(): void {
  visitWithE2eWorkspaceSession('/canvas', {
    onBeforeLoad(window) {
      window.localStorage.setItem(
        'dvt-web-application-language',
        JSON.stringify({ state: { language: 'en' }, version: 0 })
      );
    },
  });
  waitForE2eApiCall('/workspace/graph/draft', 'GET');
  cy.get(CARD).find('[data-slot="graph-node-column-toggle"]').click();
}

function field(name: string): Cypress.Chainable<JQuery<HTMLElement>> {
  return cy.get(`${CARD} [data-slot="graph-node-column-piece"][data-column-name="${name}"]`);
}

function showAll(): void {
  cy.get(CARD).then(($card) => {
    if ($card.find('[data-slot="graph-node-column-remainder-toggle"]').length > 0) {
      cy.get(CARD).find('[data-slot="graph-node-column-remainder-toggle"]').click();
    }
  });
}

describe('Canvas output expression inspection', () => {
  let scopes: string[];
  beforeEach(() => {
    cy.viewport(1920, 1080);
    scopes = ['workspace:graph-draft:view', 'workspace:graph-draft:save'];
    stubShellBootstrapApis({ scopes });
    stubE2eJsonApi('GET', '/workspace/context', {
      defaultWorkspace: E2E_PROJECT_WORKSPACE,
      availableWorkspaces: [E2E_PROJECT_WORKSPACE],
    });
    stubE2eJsonApi('GET', '/capabilities', {
      apiVersion: '1.0.0',
      minFrontendVersion: '0.0.1',
      plugins: { dvt: { available: true } },
    });
    stubStatefulCanvasDraftAuthoring({ canvasKind: 'transformation', columnMapping: true });
    visitCanvas();
    cy.get(CARD).contains('button', 'Map compatible columns').click();
    field('customer').should('have.attr', 'aria-keyshortcuts', 'Enter');
    cy.wrap(null).should(() => {
      const saved = getE2eApiCalls('/workspace/graph/draft', 'PUT').at(-1)?.body as
        { draft: { nodes: Array<{ id: string; metadata?: Record<string, unknown> }> } } | undefined;
      const model = saved?.draft.nodes.find((node) => node.id === 'model-orders');
      expect(model?.metadata).to.have.property('transformAuthoring');
    });
  });

  it('opens a direct leaf with pointer and keyboard, restores focus, and does not save', () => {
    visitCanvas();
    let saves = 0;
    cy.then(() => {
      saves = getE2eApiCalls('/workspace/graph/draft', 'PUT').length;
    });
    field('customer').dblclick();
    cy.get(VIEWER).should('contain.text', 'Output expression · customer');
    cy.get(`${VIEWER} [data-slot="semantic-workbench-node"]`)
      .should('have.length', 1)
      .and('contain.text', 'customer');
    cy.get('[data-slot="canvas-node-workbench-overlay"]').should('not.exist');
    cy.get(VIEWER).contains('button', 'Back to relational flow').should('have.focus').type('{esc}');
    field('customer')
      .should('have.focus')
      .then(() => cy.press(Cypress.Keyboard.Keys.ENTER));
    cy.get(VIEWER).contains('button', 'Back to relational flow').click();
    field('customer').should('have.focus');
    cy.then(() => expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(saves));
  });

  it('reconstructs nested and branching expressions after reload and permits read-only inspection', () => {
    field('customer').rightclick();
    cy.get('[data-slot="graph-node-column-function-menu"]').contains('TRIM').click();
    cy.get('[data-slot="graph-node-expression-composer"]').within(() => {
      cy.get('[data-slot="graph-node-column-function-alias-input"]').type('customer_trimmed');
      cy.get('[data-slot="graph-node-column-function-alias-submit"]').click();
    });
    field('customer_trimmed').should('be.visible');
    cy.get(CARD).find('[data-slot="graph-node-calculated-column-trigger"]').click();
    cy.get('[data-slot="graph-node-calculated-column-form"]').within(() => {
      cy.get('select[name="kind"]').select('string-literal');
      cy.get('input[name="value"]').type('ES');
      cy.get('input[name="alias"]').type('country_literal');
      cy.get('button[type="submit"]').click();
    });
    field('country_literal').should('be.visible');
    field('country_literal').dblclick();
    cy.get(VIEWER).should('contain.text', 'ES');
    cy.get(VIEWER).contains('button', 'Back to relational flow').click();
    field('customer_trimmed').focus().trigger('keydown', { key: 'F10', shiftKey: true });
    cy.get('[data-slot="graph-node-column-function-menu"]').contains('CONCAT').click();
    cy.get('[data-slot="graph-node-expression-composer"]').within(() => {
      cy.get('select[aria-label="Operand 1"]').select('customer_trimmed');
      cy.get('select[aria-label="Operand 2"]').select('status');
      cy.get('[data-slot="graph-node-column-function-alias-input"]').type('customer_country');
      cy.get('[data-slot="graph-node-column-function-alias-submit"]').click();
    });
    field('customer_country').should('be.visible').dblclick();
    cy.get(VIEWER).should('contain.text', 'concat(trim(customer), status)');
    cy.get(`${VIEWER} [data-slot="semantic-workbench-node"]`).should('have.length', 4);
    cy.get('[role="separator"]')
      .first()
      .focus()
      .then(() => cy.press(Cypress.Keyboard.Keys.HOME));
    cy.get(VIEWER).screenshot('output-expression-tree');
    cy.injectAxe();
    cy.checkA11y(VIEWER, { includedImpacts: ['serious', 'critical'] });
    cy.get(`${VIEWER} [data-slot="semantic-workbench-node"]`).contains('FIELD').click();
    cy.get(`${VIEWER} [data-slot="semantic-workbench-node"][aria-pressed="true"]`).should(
      'contain.text',
      'FIELD'
    );
    cy.get('[data-slot="semantic-output-expression-detail"]').should('contain.text', 'customer');
    cy.get(VIEWER).contains('button', 'Back to relational flow').click();
    // The existing stateful transport serves the saved canonical document, not a visual-tree fixture.
    cy.then(() => {
      scopes.splice(1);
    });
    visitCanvas();
    showAll();
    cy.get(CARD).find('[data-slot="graph-node-calculated-column-trigger"]').should('not.exist');
    let saves = 0;
    cy.then(() => {
      saves = getE2eApiCalls('/workspace/graph/draft', 'PUT').length;
    });
    field('customer_country')
      .focus()
      .then(() => cy.press(Cypress.Keyboard.Keys.ENTER));
    cy.get(VIEWER).should('contain.text', 'concat(trim(customer), status)');
    cy.get(`${VIEWER} [data-slot="semantic-workbench-node"]`).should('have.length', 4);
    cy.get(VIEWER).contains('button', 'Back to relational flow').type('{esc}');
    field('customer_country').should('have.focus');
    cy.then(() => expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(saves));
  });
});
