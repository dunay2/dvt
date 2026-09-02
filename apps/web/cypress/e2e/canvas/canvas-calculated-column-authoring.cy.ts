/** Owned concern: prove calculated-column authoring from the stable card gap. */
import {
  decodeDvtSubstraitProjectionDocument,
  inspectDvtSubstraitProjectionDraft,
} from '../../../src/app/views/canvas/canvasDvtSubstraitProjection';
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
      kind: string;
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
      window.localStorage.setItem(
        'dvt-web-canvas-interaction',
        JSON.stringify({
          state: {
            impactOverlayEnabled: false,
            columnLevelLineageEnabled: true,
            canvasLayouts: {},
          },
          version: 0,
        })
      );
    },
  });
  waitForE2eApiCall('/healthz', 'GET');
  waitForE2eApiCall('/capabilities', 'GET');
  waitForE2eApiCall('/workspace/graph/draft', 'GET');
}

function sourceCard(): Cypress.Chainable<JQuery<HTMLElement>> {
  return cy.get('.react-flow__node[data-id="source-orders"]');
}

describe('Canvas calculated-column authoring', () => {
  beforeEach(() => stubCanvas());

  it('promotes Source in place, persists the Plan, and restores the calculated output', () => {
    cy.viewport(1920, 1080);
    visitCanvas();
    sourceCard().find('[data-slot="graph-node-column-toggle"]').click();
    sourceCard()
      .find('[data-slot="graph-node-calculated-column-trigger"]')
      .focus()
      .should('have.focus')
      .click();
    cy.get('[data-slot="graph-node-calculated-column-form"]').within(() => {
      cy.get('input[name="alias"]').type('channel');
      cy.get('input[name="value"]').type('web');
      cy.get('button[type="submit"]').click();
    });

    cy.wrap(null).should(() => {
      const savedNode = getE2eApiCalls('/workspace/graph/draft', 'PUT')
        .map((call) => call.body as DraftSave)
        .map((save) => save.draft.nodes.find((node) => node.id === 'source-orders'))
        .filter((node) => node != null)
        .at(-1);
      const authority = savedNode?.metadata?.transformAuthoring as
        { semanticDocument?: unknown } | undefined;
      const inspection = inspectDvtSubstraitProjectionDraft(
        decodeDvtSubstraitProjectionDocument(authority?.semanticDocument)
      );
      expect(inspection.ok ? inspection.projection.outputs.at(-1) : null).to.deep.include({
        name: 'channel',
        calculation: { kind: 'string-literal', value: 'web' },
      });
    });

    sourceCard().contains('button', 'Show remaining columns (2)').click();
    sourceCard().should('contain.text', 'channel');
    visitCanvas();
    sourceCard().find('[data-slot="graph-node-column-toggle"]').click();
    sourceCard().contains('button', 'Show remaining columns (2)').click();
    sourceCard().should('contain.text', 'channel');
  });
});
