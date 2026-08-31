/** Owned concern: prove row-number window authoring through the governed Canvas Substrait draft rail. */
import { decodeDvtSubstraitPilotDocument } from '../../../src/app/views/canvas/canvasDvtSubstraitPilot';
import { inspectDvtSubstraitPilotWindowDraft } from '../../../src/app/views/canvas/canvasDvtSubstraitWindow';
import { stubStatefulCanvasDraftAuthoring } from '../../support/canvasDraftAuthoring';
import { getE2eApiCalls, stubE2eJsonApi, waitForE2eApiCall } from '../../support/e2eApiStub';
import {
  E2E_PROJECT_WORKSPACE,
  stubShellBootstrapApis,
  visitWithE2eWorkspaceSession,
} from '../../support/workspaceSession';

type CanvasDraftSaveRequestBody = {
  draft: {
    nodes: Array<{
      id: string;
      metadata?: Record<string, unknown>;
    }>;
  };
};

function stubRuntimeCapabilities(): void {
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
}

function visitCanvas(): void {
  visitWithE2eWorkspaceSession('/canvas', {
    onBeforeLoad(window) {
      window.localStorage.setItem(
        'dvt-web-application-language',
        JSON.stringify({ state: { language: 'en' }, version: 0 })
      );
    },
  });
  waitForE2eApiCall('/healthz', 'GET');
  waitForE2eApiCall('/capabilities', 'GET');
  waitForE2eApiCall('/workspace/graph/draft', 'GET');
}

describe('Canvas Substrait row-number window', () => {
  beforeEach(() => {
    stubRuntimeCapabilities();
    stubStatefulCanvasDraftAuthoring({
      substraitPilot: true,
      title: 'Substrait window',
    });
  });

  it('partitions, orders, persists, and reloads through keyboard and pointer controls', () => {
    visitCanvas();

    cy.get(
      '.react-flow__node[data-id="transform-customers"] [data-slot="canvas-node-shell"]'
    ).dblclick();
    cy.get('[data-slot="canvas-node-workbench-tab-columns"]').click();
    cy.get('select[data-slot="dvt-substrait-window-partition-field"]')
      .select('field:transform-customers:country')
      .should('have.value', 'field:transform-customers:country');
    cy.get('select[data-slot="dvt-substrait-window-order-field"]')
      .select('field:transform-customers:name')
      .should('have.value', 'field:transform-customers:name');
    cy.get('input[data-slot="dvt-substrait-window-output-name"]')
      .clear()
      .type('country_row_number');
    cy.get('button[data-slot="dvt-substrait-apply-window"]')
      .focus()
      .should('have.focus')
      .then(() => cy.press(Cypress.Keyboard.Keys.ENTER));
    cy.get('[data-slot="dvt-substrait-window-authoring"]')
      .should('be.visible')
      .and('have.attr', 'data-capability-id')
      .and('contain', 'row_number');
    cy.contains('[data-slot="canvas-node-workbench-panel"] button', /^Apply$/).click();

    cy.wrap(null).should(() => {
      const savedTransform = getE2eApiCalls('/workspace/graph/draft', 'PUT')
        .map((call) => call.body as CanvasDraftSaveRequestBody)
        .map((body) => body.draft.nodes.find((node) => node.id === 'transform-customers'))
        .filter((node) => node != null)
        .at(-1);
      const transformAuthoring = savedTransform?.metadata?.transformAuthoring as
        { semanticDocument?: unknown } | undefined;
      const inspection = inspectDvtSubstraitPilotWindowDraft(
        decodeDvtSubstraitPilotDocument(transformAuthoring?.semanticDocument)
      );

      expect(inspection.ok && inspection.projection.result).to.deep.equal({
        name: 'country_row_number',
        fieldId: 'field:transform-customers:row-number',
        capabilityId:
          'substrait/simple-extension/window-function/extension%3Aio.substrait%3Afunctions_arithmetic/row_number',
      });
    });

    cy.get('[data-slot="canvas-node-workbench-close"]').click();
    visitCanvas();
    cy.get('.react-flow__node[data-id="transform-customers"]')
      .should('contain.text', 'Columns4')
      .find('[data-slot="canvas-node-shell"]')
      .dblclick();
    cy.get('[data-slot="canvas-node-workbench-tab-columns"]').click();
    cy.get('[data-slot="dvt-substrait-window-partition-readonly"]').should(
      'contain.text',
      'country'
    );
    cy.get('[data-slot="dvt-substrait-window-order-readonly"]').should('contain.text', 'name');
    cy.get('input[data-slot="dvt-substrait-window-output-name"]').should(
      'have.value',
      'country_row_number'
    );
  });
});
