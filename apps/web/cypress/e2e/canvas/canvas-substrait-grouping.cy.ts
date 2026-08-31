/** Owned concern: prove grouping/count authoring through the governed Canvas Substrait draft rail. */
import { inspectDvtSubstraitPilotAggregationDraft } from '../../../src/app/views/canvas/canvasDvtSubstraitAggregation';
import { decodeDvtSubstraitPilotDocument } from '../../../src/app/views/canvas/canvasDvtSubstraitPilot';
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

describe('Canvas Substrait grouping and count', () => {
  beforeEach(() => {
    stubRuntimeCapabilities();
    stubStatefulCanvasDraftAuthoring({
      substraitPilot: true,
      title: 'Substrait grouping',
    });
  });

  it('groups, counts, persists, and reloads through keyboard and pointer controls', () => {
    visitCanvas();

    cy.get(
      '.react-flow__node[data-id="transform-customers"] [data-slot="canvas-node-shell"]'
    ).dblclick();
    cy.get('[data-slot="canvas-node-workbench-tab-columns"]').click();
    cy.get('select[data-slot="dvt-substrait-grain-field"]')
      .select('field:transform-customers:country')
      .should('have.value', 'field:transform-customers:country');
    cy.get('input[data-slot="dvt-substrait-count-output-name"]').clear().type('customer_count');
    cy.get('button[data-slot="dvt-substrait-apply-aggregation"]')
      .focus()
      .should('have.focus')
      .then(() => cy.press(Cypress.Keyboard.Keys.ENTER));
    cy.get('[data-slot="dvt-substrait-aggregation-authoring"]')
      .should('be.visible')
      .and('have.attr', 'data-capability-id')
      .and('contain', 'count');
    cy.contains('[data-slot="canvas-node-workbench-panel"] button', /^Apply$/).click();

    cy.wrap(null).should(() => {
      const savedTransform = getE2eApiCalls('/workspace/graph/draft', 'PUT')
        .map((call) => call.body as CanvasDraftSaveRequestBody)
        .map((body) => body.draft.nodes.find((node) => node.id === 'transform-customers'))
        .filter((node) => node != null)
        .at(-1);
      const transformAuthoring = savedTransform?.metadata?.transformAuthoring as
        { semanticDocument?: unknown } | undefined;
      const inspection = inspectDvtSubstraitPilotAggregationDraft(
        decodeDvtSubstraitPilotDocument(transformAuthoring?.semanticDocument)
      );

      expect(inspection.ok && inspection.projection.outputs).to.deep.equal([
        {
          name: 'country',
          fieldId: 'field:transform-customers:country',
          outputOrdinal: 0,
        },
        {
          name: 'customer_count',
          fieldId: 'field:transform-customers:count',
          outputOrdinal: 1,
        },
      ]);
    });

    cy.get('[data-slot="canvas-node-workbench-close"]').click();
    visitCanvas();
    cy.get('.react-flow__node[data-id="transform-customers"]')
      .should('contain.text', 'Columns2')
      .find('[data-slot="canvas-node-shell"]')
      .dblclick();
    cy.get('[data-slot="canvas-node-workbench-tab-columns"]').click();
    cy.get('[data-slot="dvt-substrait-grain-field-readonly"]').should('contain.text', 'country');
    cy.get('input[data-slot="dvt-substrait-count-output-name"]').should(
      'have.value',
      'customer_count'
    );
  });
});
