/** Owned concern: prove two-source UNION DISTINCT authoring through the governed Canvas Substrait rail. */
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
    nodes: Array<{ id: string; metadata?: Record<string, unknown> }>;
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

function openPendingComposition(): void {
  cy.get(
    '.react-flow__node[data-id="union-transform"] [data-slot="canvas-node-shell"]'
  ).rightclick();
  cy.contains('[data-slot="canvas-node-context-menu-item"]', 'Properties').click();
  cy.get('[data-slot="canvas-node-workbench-tab-code"]').click();
}

describe('Canvas Substrait UNION DISTINCT', () => {
  beforeEach(() => {
    stubRuntimeCapabilities();
    stubStatefulCanvasDraftAuthoring({
      substraitUnionAll: true,
      title: 'Substrait union distinct',
    });
  });

  it('authors, persists, and reloads exact set semantics without degrading to UNION ALL', () => {
    visitCanvas();
    openPendingComposition();

    cy.get('[data-slot="dvt-select-operation-union-distinct"]').click();
    cy.get('button[data-slot="dvt-start-connected-union-all"]').click();
    cy.get('[data-slot="dvt-substrait-union-all-authoring"]')
      .should('be.visible')
      .and('contain.text', 'UNION')
      .and('not.contain.text', 'UNION ALL');
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
      expect(inspection.ok).to.equal(true);
      if (!inspection.ok) throw new Error('Expected persisted UNION DISTINCT.');
      expect(inspection.projection.operation).to.equal('union_distinct');
      expect(inspection.projection.inputs.map((input) => input.table)).to.deep.equal([
        'customers_north',
        'customers_south',
      ]);
    });
    cy.get('[data-slot="canvas-relational-composition-badge"]').should('not.exist');
    cy.get('[data-slot="canvas-relational-composition-junction"]').should('not.exist');

    cy.get('[data-slot="canvas-node-workbench-close"]').click();
    visitCanvas();
    cy.get(
      '.react-flow__node[data-id="union-transform"] [data-slot="canvas-node-shell"]'
    ).rightclick();
    cy.contains('[data-slot="canvas-node-context-menu-item"]', 'Properties').click();
    cy.get('[data-slot="canvas-node-workbench-tab-columns"]').click();
    cy.get('[data-slot="dvt-substrait-union-all-authoring"]')
      .should('contain.text', 'public.customers_north UNION public.customers_south')
      .and('not.contain.text', 'UNION ALL');
  });
});
