/** Owned concern: prove Substrait INNER JOIN field authoring through the governed Canvas draft rail. */
import {
  decodeDvtSubstraitInnerJoinDocument,
  inspectDvtSubstraitInnerJoinDraft,
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

  it('selects, renames, reorders, persists, and reloads fields from Substrait authority', () => {
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
    cy.contains('[data-slot="canvas-node-workbench-panel"] button', /^Apply$/).click();

    cy.wrap(null).should(() => {
      const savedTransform = getE2eApiCalls('/workspace/graph/draft', 'PUT')
        .map((call) => call.body as CanvasDraftSaveRequestBody)
        .map((body) => body.draft.nodes.find((node) => node.id === 'join-transform'))
        .filter((node) => node != null)
        .at(-1);
      const transformAuthoring = savedTransform?.metadata?.transformAuthoring as
        { semanticDocument?: unknown } | undefined;
      const inspection = inspectDvtSubstraitInnerJoinDraft(
        decodeDvtSubstraitInnerJoinDocument(transformAuthoring?.semanticDocument)
      );

      expect(inspection.ok && inspection.projection.outputs).to.deep.equal([
        {
          fieldKey: 'right.order_id',
          fieldId: 'field:join-transform:order_id',
          name: 'order_id',
          outputOrdinal: 0,
          source: { relation: 'right', name: 'order_id' },
        },
        {
          fieldKey: 'left.name',
          fieldId: 'field:join-transform:name',
          name: 'customer_name',
          outputOrdinal: 1,
          source: { relation: 'left', name: 'name' },
        },
      ]);
    });

    cy.get('[data-slot="canvas-node-workbench-close"]').click();
    visitCanvas();
    cy.get(
      '.react-flow__node[data-id="join-transform"] [data-slot="canvas-node-shell"]'
    ).dblclick();
    cy.get('[data-slot="canvas-node-workbench-tab-columns"]').click();
    cy.get('input[name="dvt-substrait-inner-join-field"][value="left.customer_id"]').should(
      'not.be.checked'
    );
    cy.get(
      'input[data-slot="dvt-substrait-inner-join-output-name"][data-field-key="left.name"]'
    ).should('have.value', 'customer_name');
  });
});
