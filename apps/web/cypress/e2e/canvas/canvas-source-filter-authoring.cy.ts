/** Owned concern: prove filters belong to Transform and never to Source. */
import { inspectDvtSubstraitFilter } from '../../../src/app/views/canvas/canvasDvtSubstraitFilter';
import { decodeDvtSubstraitProjectionDocument } from '../../../src/app/views/canvas/canvasDvtSubstraitProjection';
import { stubStatefulCanvasDraftAuthoring } from '../../support/canvasDraftAuthoring';
import { getE2eApiCalls, stubE2eJsonApi, waitForE2eApiCall } from '../../support/e2eApiStub';
import {
  E2E_PROJECT_WORKSPACE,
  stubShellBootstrapApis,
  visitWithE2eWorkspaceSession,
} from '../../support/workspaceSession';

type DraftSave = {
  draft: {
    nodes: Array<{ id: string; metadata?: Record<string, unknown> }>;
  };
};

function stubCanvas(): void {
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
  stubStatefulCanvasDraftAuthoring({ canvasKind: 'transformation', columnMapping: true });
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
  waitForE2eApiCall('/workspace/graph/draft', 'GET');
}

function card(nodeId: string): Cypress.Chainable<JQuery<HTMLElement>> {
  return cy.get(`.react-flow__node[data-id="${nodeId}"]`);
}

function openColumns(nodeId: string): void {
  card(nodeId).find('[data-slot="canvas-node-shell"]').rightclick();
  cy.contains('[data-slot="canvas-node-context-menu-item"]', 'Properties').click();
  cy.get('[data-slot="canvas-node-workbench-tab-columns"]').click();
}

function latestFilter(nodeId: string): ReturnType<typeof inspectDvtSubstraitFilter> | undefined {
  const node = getE2eApiCalls('/workspace/graph/draft', 'PUT')
    .map((call) => call.body as DraftSave)
    .map((save) => save.draft.nodes.find((candidate) => candidate.id === nodeId))
    .filter((candidate) => candidate != null)
    .at(-1);
  const authority = node?.metadata?.transformAuthoring as
    { semanticDocument?: unknown } | undefined;
  if (authority?.semanticDocument == null) return undefined;
  return inspectDvtSubstraitFilter(
    decodeDvtSubstraitProjectionDocument(authority.semanticDocument)
  );
}

describe('Canvas Source filter boundary', () => {
  beforeEach(() => stubCanvas());

  it('keeps Source stable while a connected Transform authors and reloads the filter', () => {
    cy.viewport(1920, 1080);
    visitCanvas();

    openColumns('source-orders');
    cy.get('[data-slot="dvt-filter-authoring"]').should('not.exist');
    card('source-orders').should('not.contain.text', 'Filter');
    cy.get('[data-slot="canvas-node-workbench-close"]').click();

    card('model-orders').find('[data-slot="graph-node-column-toggle"]').click();
    card('model-orders').contains('button', 'Map compatible columns').click();
    waitForE2eApiCall('/workspace/graph/draft', 'PUT');

    openColumns('model-orders');
    cy.get('[data-slot="dvt-filter-authoring"]').should('be.visible');
    cy.get('select[name="dvt-filter-field"]').select('output:customer');
    cy.get('input[name="dvt-filter-value"]').type('Ada');
    cy.get('[data-slot="dvt-filter-apply"]').click();
    cy.contains('button', /^Apply$/).click();
    waitForE2eApiCall('/workspace/graph/draft', 'PUT');

    cy.wrap(null).should(() => {
      expect(latestFilter('source-orders')).to.equal(undefined);
      expect(latestFilter('model-orders')).to.deep.include({
        fieldName: 'customer',
        value: 'Ada',
      });
    });
    card('source-orders').should('not.contain.text', 'customer = "Ada"');
    card('model-orders').should('contain.text', 'customer = "Ada"');

    visitCanvas();
    card('source-orders').should('not.contain.text', 'customer = "Ada"');
    card('model-orders').should('contain.text', 'customer = "Ada"');
  });
});
