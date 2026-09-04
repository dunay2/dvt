/** Owned concern: prove Source filter authoring persists one canonical relation recipe. */
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

function sourceCard(): Cypress.Chainable<JQuery<HTMLElement>> {
  return cy.get('.react-flow__node[data-id="source-orders"]');
}

function openSourceColumns(): void {
  sourceCard().find('[data-slot="canvas-node-shell"]').rightclick();
  cy.contains('[data-slot="canvas-node-context-menu-item"]', 'Properties').click();
  cy.get('[data-slot="canvas-node-workbench-tab-columns"]').click();
  cy.get('[data-slot="dvt-filter-authoring"]').should('be.visible');
}

function latestFilter(): ReturnType<typeof inspectDvtSubstraitFilter> | undefined {
  const source = getE2eApiCalls('/workspace/graph/draft', 'PUT')
    .map((call) => call.body as DraftSave)
    .map((save) => save.draft.nodes.find((node) => node.id === 'source-orders'))
    .filter((node) => node != null)
    .at(-1);
  const authority = source?.metadata?.transformAuthoring as
    { semanticDocument?: unknown } | undefined;
  if (authority?.semanticDocument == null) return undefined;
  return inspectDvtSubstraitFilter(
    decodeDvtSubstraitProjectionDocument(authority?.semanticDocument)
  );
}

describe('Canvas Source filter authoring', () => {
  beforeEach(() => stubCanvas());

  it('applies, reloads, and removes a filter without changing the Source identity', () => {
    cy.viewport(1920, 1080);
    visitCanvas();
    openSourceColumns();
    cy.get('select[name="dvt-filter-field"]').select('output:customer');
    cy.get('input[name="dvt-filter-value"]').type('Ada');
    cy.get('[data-slot="dvt-filter-apply"]').click();
    cy.get('[data-slot="dvt-filter-active"]').should('contain.text', 'customer');
    cy.contains('button', /^Apply$/).click();
    waitForE2eApiCall('/workspace/graph/draft', 'PUT');

    cy.wrap(null).should(() => {
      expect(latestFilter()).to.deep.include({ fieldName: 'customer', value: 'Ada' });
    });
    sourceCard().should('contain.text', 'customer = "Ada"').and('contain.text', 'Source');

    visitCanvas();
    sourceCard().should('contain.text', 'customer = "Ada"');
    openSourceColumns();
    cy.get('[data-slot="dvt-filter-remove"]').click();
    cy.get('[data-slot="dvt-filter-active"]').should('not.exist');
    cy.contains('button', /^Apply$/).click();
    waitForE2eApiCall('/workspace/graph/draft', 'PUT');

    cy.wrap(null).should(() => expect(latestFilter()).to.equal(null));
    sourceCard().should('not.contain.text', 'customer = "Ada"').and('contain.text', 'Source');
  });
});
