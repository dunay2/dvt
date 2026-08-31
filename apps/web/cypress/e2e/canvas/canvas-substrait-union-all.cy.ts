/** Owned concern: prove two-source UNION ALL authoring through the governed Canvas Substrait draft rail. */
import {
  decodeDvtSubstraitUnionAllDocument,
  inspectDvtSubstraitUnionAllDraft,
} from '../../../src/app/views/canvas/canvasDvtSubstraitSetComposition';
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

describe('Canvas Substrait UNION ALL', () => {
  beforeEach(() => {
    stubRuntimeCapabilities();
    stubStatefulCanvasDraftAuthoring({
      substraitUnionAll: true,
      title: 'Substrait union all',
    });
  });

  it('composes, persists, and reloads two compatible datasets through one canonical revision', () => {
    visitCanvas();

    cy.get(
      '.react-flow__node[data-id="union-transform"] [data-slot="canvas-node-shell"]'
    ).dblclick();
    cy.get('[data-slot="canvas-node-workbench-tab-code"]').click();
    cy.get('button[data-slot="dvt-start-substrait-union-all"]')
      .focus()
      .should('have.focus')
      .then(() => cy.press(Cypress.Keyboard.Keys.ENTER));
    cy.get('[data-slot="dvt-substrait-union-all-authoring"]')
      .should('be.visible')
      .and('contain.text', 'customers_north')
      .and('contain.text', 'customers_south')
      .and('contain.text', 'customer_id, name, country');
    cy.contains('[data-slot="canvas-node-workbench-panel"] button', /^Apply$/).click();

    cy.wrap(null).should(() => {
      const savedTransform = getE2eApiCalls('/workspace/graph/draft', 'PUT')
        .map((call) => call.body as CanvasDraftSaveRequestBody)
        .map((body) => body.draft.nodes.find((node) => node.id === 'union-transform'))
        .filter((node) => node != null)
        .at(-1);
      const transformAuthoring = savedTransform?.metadata?.transformAuthoring as
        { semanticDocument?: unknown } | undefined;
      const inspection = inspectDvtSubstraitUnionAllDraft(
        decodeDvtSubstraitUnionAllDocument(transformAuthoring?.semanticDocument)
      );

      expect(inspection.ok && inspection.projection.outputs).to.deep.equal([
        {
          name: 'customer_id',
          fieldId: 'field:union-transform:customer_id',
          outputOrdinal: 0,
        },
        { name: 'name', fieldId: 'field:union-transform:name', outputOrdinal: 1 },
        { name: 'country', fieldId: 'field:union-transform:country', outputOrdinal: 2 },
      ]);
    });

    cy.get('[data-slot="canvas-node-workbench-close"]').click();
    visitCanvas();
    cy.get('.react-flow__node[data-id="union-transform"]')
      .should('contain.text', 'Columns3')
      .find('[data-slot="canvas-node-shell"]')
      .dblclick();
    cy.get('[data-slot="canvas-node-workbench-tab-columns"]').click();
    cy.get('[data-slot="dvt-substrait-union-all-authoring"]')
      .should('contain.text', 'public.customers_north UNION ALL public.customers_south')
      .and('contain.text', 'customer_id, name, country');
  });
});
