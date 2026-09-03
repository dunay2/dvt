/** Owned concern: prove structured Transform fields through the canonical Canvas command rail. */
import {
  decodeDvtSubstraitStructuredFieldDocument,
  inspectDvtSubstraitStructuredFieldDraft,
} from '../../../src/app/views/canvas/canvasDvtSubstraitStructuredField';
import { stubStatefulCanvasDraftAuthoring } from '../../support/canvasDraftAuthoring';
import { getE2eApiCalls, stubE2eJsonApi, waitForE2eApiCall } from '../../support/e2eApiStub';
import {
  E2E_PROJECT_WORKSPACE,
  stubShellBootstrapApis,
  visitWithE2eWorkspaceSession,
} from '../../support/workspaceSession';

type DraftSave = {
  draft: {
    nodes: Array<{
      id: string;
      metadata?: Record<string, unknown>;
    }>;
  };
};

function stubCanvas(): void {
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
  waitForE2eApiCall('/healthz', 'GET');
  waitForE2eApiCall('/capabilities', 'GET');
  waitForE2eApiCall('/workspace/graph/draft', 'GET');
}

function modelCard(): Cypress.Chainable<JQuery<HTMLElement>> {
  return cy.get('.react-flow__node[data-id="model-orders"]');
}

function expandAndAssignColumns(): void {
  modelCard().find('[data-slot="graph-node-column-toggle"]').click();
  modelCard().contains('button', 'Map compatible columns').click();
  waitForE2eApiCall('/workspace/graph/draft', 'PUT');
}

function latestStructuredFields(): ReturnType<typeof inspectDvtSubstraitStructuredFieldDraft> {
  const model = getE2eApiCalls('/workspace/graph/draft', 'PUT')
    .map((call) => call.body as DraftSave)
    .map((save) => save.draft.nodes.find((node) => node.id === 'model-orders'))
    .filter((node) => node != null)
    .at(-1);
  const authority = model?.metadata?.transformAuthoring as
    { semanticDocument?: unknown } | undefined;
  return inspectDvtSubstraitStructuredFieldDraft(
    decodeDvtSubstraitStructuredFieldDocument(authority?.semanticDocument)
  );
}

describe('Canvas structured Transform fields', () => {
  beforeEach(() => stubCanvas());

  it('proposes, persists, displays, and restores an ordered structured field', () => {
    cy.viewport(1920, 1080);
    visitCanvas();
    expandAndAssignColumns();

    modelCard()
      .contains('[data-slot="graph-node-column-row"]', 'customer')
      .find('[data-slot="graph-node-column-piece"]')
      .focus()
      .trigger('keydown', { key: 'ArrowLeft', altKey: true });
    cy.get('[data-slot="graph-node-column-composition-structured-field"]').click();
    cy.get('[data-slot="graph-node-structured-field-form"]').within(() => {
      cy.get('[data-slot="graph-node-structured-field-name"]').type('identity');
      cy.get('[data-slot="graph-node-structured-field-apply"]').click();
    });

    cy.wrap(null).should(() => {
      expect(latestStructuredFields()).to.deep.equal({
        ok: true,
        fields: [
          {
            fieldId: 'output:identity',
            name: 'identity',
            children: [
              { fieldId: 'output:order_id', name: 'order_id' },
              { fieldId: 'output:customer', name: 'customer' },
            ],
          },
          { fieldId: 'output:amount', name: 'amount' },
          { fieldId: 'output:status', name: 'status' },
          { fieldId: 'output:created_at', name: 'created_at' },
          { fieldId: 'output:region', name: 'region' },
        ],
      });
    });
    modelCard().should('contain.text', 'identity').and('contain.text', 'order_id');

    visitCanvas();
    modelCard().find('[data-slot="graph-node-column-toggle"]').click();
    modelCard().should('contain.text', 'identity').and('contain.text', 'customer');
  });
});
