/** Owned concern: prove direct alias authoring through the governed Transform command rail. */
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

describe('Canvas calculated-column authoring', () => {
  beforeEach(() => stubCanvas());

  it('creates, persists, and restores a direct alias on the Transform', () => {
    cy.viewport(1920, 1080);
    visitCanvas();
    cy.get('.react-flow__node[data-id="model-orders"]')
      .find('button[aria-expanded]')
      .contains('Columns')
      .click();
    cy.get('.react-flow__node[data-id="model-orders"]')
      .contains('button', 'Map compatible columns')
      .click();
    waitForE2eApiCall('/workspace/graph/draft', 'PUT');

    cy.get('.react-flow__node[data-id="model-orders"]')
      .find('[data-slot="graph-node-calculated-column-trigger"]')
      .focus()
      .should('have.focus')
      .click();
    cy.get('[data-slot="graph-node-calculated-column-form"]').within(() => {
      cy.get('select[name="kind"]').should('have.value', 'field-ref');
      cy.get('select[name="inputFieldId"]').select('customer');
      cy.get('input[name="alias"]').type('customer_alias');
      cy.get('button[type="submit"]').click();
    });

    cy.wrap(null).should(() => {
      const savedNode = getE2eApiCalls('/workspace/graph/draft', 'PUT')
        .map((call) => call.body as DraftSave)
        .map((save) => save.draft.nodes.find((node) => node.id === 'model-orders'))
        .filter((node) => node != null)
        .at(-1);
      const authority = savedNode?.metadata?.transformAuthoring as
        { semanticDocument?: unknown } | undefined;
      const inspection = inspectDvtSubstraitProjectionDraft(
        decodeDvtSubstraitProjectionDocument(authority?.semanticDocument)
      );
      const alias = inspection.ok ? inspection.projection.outputs.at(-1) : null;
      expect(alias).to.deep.include({
        name: 'customer_alias',
        sourceFieldName: 'customer',
      });
      expect(alias?.fieldId).to.match(
        /^dvt_fld_[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
      expect(alias).not.to.have.property('operations');
    });

    cy.get('.react-flow__node[data-id="model-orders"]')
      .contains('button', /Show remaining columns/)
      .click();
    cy.get('.react-flow__node[data-id="model-orders"]').should('contain.text', 'customer_alias');

    visitCanvas();
    cy.get('.react-flow__node[data-id="model-orders"]')
      .find('button[aria-expanded]')
      .contains('Columns')
      .click();
    cy.get('.react-flow__node[data-id="model-orders"]')
      .contains('button', /Show remaining columns/)
      .click();
    cy.get('.react-flow__node[data-id="model-orders"]').should('contain.text', 'customer_alias');
  });
});
