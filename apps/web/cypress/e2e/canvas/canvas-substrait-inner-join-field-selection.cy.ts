/** Owned concern: prove Substrait INNER JOIN field authoring through the governed Canvas draft rail. */
import {
  decodeDvtSubstraitInnerJoinDocument,
  inspectDvtSubstraitInnerJoinGroupedWindowDraft,
  inspectDvtSubstraitNInputJoinDraft,
} from '../../../src/app/views/canvas/canvasDvtSubstraitJoinComposition';
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

describe('Canvas Substrait INNER JOIN field selection', () => {
  beforeEach(() => {
    stubRuntimeCapabilities();
    stubStatefulCanvasDraftAuthoring({
      substraitInnerJoin: true,
      title: 'Substrait field selection',
    });
  });

  it('selects, groups, ranks, persists, and reloads fields from Substrait authority', () => {
    visitCanvas();

    cy.get(
      '.react-flow__node[data-id="join-transform"] [data-slot="canvas-node-shell"]'
    ).dblclick();
    cy.get('[data-slot="canvas-node-workbench-tab-columns"]').click();
    cy.get('input[name="dvt-substrait-inner-join-field"][value="left.customer_id"]').uncheck();
    cy.get('input[data-slot="dvt-substrait-inner-join-output-name"][data-field-key="left.name"]')
      .clear()
      .type('customer_name')
      .blur();
    cy.get(
      'button[data-action="move-substrait-inner-join-field-up"][data-field-key="right.order_id"]'
    ).click();
    cy.get('[data-slot="dvt-substrait-inner-join-grain-field"]').select(
      'field:join-transform:name'
    );
    cy.get('[data-slot="dvt-substrait-inner-join-count-output-name"]').clear().type('order_count');
    cy.get('[data-slot="dvt-substrait-inner-join-apply-grouping"]').click();
    cy.get('[data-slot="dvt-substrait-inner-join-window-output-name"]').clear().type('count_rank');
    cy.get('[data-slot="dvt-substrait-inner-join-apply-window"]').click();
    cy.get('[data-slot="dvt-substrait-inner-join-grouped-window-authoring"]').should('exist');
    cy.contains('[data-slot="canvas-node-workbench-panel"] button', /^Apply$/).click();

    cy.wrap(null).should(() => {
      const savedTransform = getE2eApiCalls('/workspace/graph/draft', 'PUT')
        .map((call) => call.body as CanvasDraftSaveRequestBody)
        .map((body) => body.draft.nodes.find((node) => node.id === 'join-transform'))
        .filter((node) => node != null)
        .at(-1);
      const transformAuthoring = savedTransform?.metadata?.transformAuthoring as
        { semanticDocument?: unknown } | undefined;
      const inspection = inspectDvtSubstraitInnerJoinGroupedWindowDraft(
        decodeDvtSubstraitInnerJoinDocument(transformAuthoring?.semanticDocument)
      );

      expect(inspection.ok && inspection.projection.outputs).to.deep.equal([
        {
          fieldId: 'field:join-transform:name',
          name: 'customer_name',
          dataType: 'string',
          outputOrdinal: 0,
        },
        {
          fieldId: 'field:join-transform:join-count',
          name: 'order_count',
          dataType: 'i64',
          outputOrdinal: 1,
        },
        {
          fieldId: 'field:join-transform:join-count-rank',
          name: 'count_rank',
          dataType: 'i64',
          outputOrdinal: 2,
        },
      ]);
    });

    cy.get('[data-slot="canvas-node-workbench-close"]').click();
    visitCanvas();
    cy.get(
      '.react-flow__node[data-id="join-transform"] [data-slot="canvas-node-shell"]'
    ).dblclick();
    cy.get('[data-slot="canvas-node-workbench-tab-columns"]').click();
    cy.get('[data-slot="dvt-substrait-inner-join-grouped-window-authoring"]').should('exist');
    cy.get('[data-slot="dvt-substrait-inner-join-window-output-name"]').should(
      'have.value',
      'count_rank'
    );
  });
});

describe('Canvas Substrait N-input INNER JOIN authoring', () => {
  beforeEach(() => {
    stubRuntimeCapabilities();
    stubStatefulCanvasDraftAuthoring({
      substraitNInputJoin: true,
      title: 'Substrait N-input authoring',
    });
  });

  it('appends two connected inputs through the same explicit predicate control and reloads them', () => {
    visitCanvas();

    cy.get(
      '.react-flow__node[data-id="join-transform"] [data-slot="canvas-node-shell"]'
    ).dblclick();
    cy.get('[data-slot="canvas-node-workbench-tab-columns"]').click();
    cy.get('[data-slot="dvt-substrait-append-right-field"]').select(
      'source-shipments\u001fcustomer_id'
    );
    cy.get('[data-slot="dvt-substrait-append-submit"]').click();
    cy.get('[data-slot="dvt-substrait-n-input-join-authoring"]').should(
      'contain.text',
      'customers + orders + shipments'
    );
    cy.get('[data-slot="dvt-substrait-append-right-field"]').select(
      'source-tickets\u001fcustomer_id'
    );
    cy.get('[data-slot="dvt-substrait-append-submit"]').click();
    cy.get('[data-slot="dvt-substrait-n-input-join-authoring"]').should(
      'contain.text',
      'customers + orders + shipments + tickets'
    );
    cy.contains('[data-slot="canvas-node-workbench-panel"] button', /^Apply$/).click();

    cy.wrap(null).should(() => {
      const savedTransform = getE2eApiCalls('/workspace/graph/draft', 'PUT')
        .map((call) => call.body as CanvasDraftSaveRequestBody)
        .map((body) => body.draft.nodes.find((node) => node.id === 'join-transform'))
        .filter((node) => node != null)
        .at(-1);
      const transformAuthoring = savedTransform?.metadata?.transformAuthoring as
        { semanticDocument?: unknown } | undefined;
      const inspection = inspectDvtSubstraitNInputJoinDraft(
        decodeDvtSubstraitInnerJoinDocument(transformAuthoring?.semanticDocument)
      );

      expect(
        inspection.ok && inspection.projection.inputs.map((input) => input.table)
      ).to.deep.equal(['customers', 'orders', 'shipments', 'tickets']);
    });

    cy.get('[data-slot="canvas-node-workbench-close"]').click();
    visitCanvas();
    cy.get(
      '.react-flow__node[data-id="join-transform"] [data-slot="canvas-node-shell"]'
    ).dblclick();
    cy.get('[data-slot="canvas-node-workbench-tab-columns"]').click();
    cy.get('[data-slot="dvt-substrait-n-input-join-authoring"]').should(
      'contain.text',
      'customers + orders + shipments + tickets'
    );
  });
});
