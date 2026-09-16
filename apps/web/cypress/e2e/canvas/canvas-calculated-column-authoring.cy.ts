/** Owned concern: prove direct alias authoring through the governed Transform command rail. */
import {
  decodeDvtSubstraitProjectionDocument,
  inspectDvtSubstraitProjectionDraft,
} from '../../../src/app/views/canvas/canvasDvtSubstraitProjection';
import { stubStatefulCanvasDraftAuthoring } from '../../support/canvasDraftAuthoring';
import {
  getE2eApiCalls,
  resetE2eApiStubs,
  stubE2eJsonApi,
  waitForE2eApiCall,
} from '../../support/e2eApiStub';
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

function stubCanvas(secondModel = false): void {
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
  stubStatefulCanvasDraftAuthoring({
    canvasKind: 'transformation',
    columnMapping: true,
    sourceInspectorOrdering: secondModel,
  });
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

  it('keeps Transform data entry separate from semantics, Properties and column controls', () => {
    cy.viewport(1920, 1080);
    visitCanvas();
    const node = '.react-flow__node[data-id="model-orders"]';
    const title = `${node} [data-slot="graph-node-card-title"]`;
    const dataTab = '[data-slot="bottom-operational-drawer-tab"][data-tab="data:model-orders"]';
    const semanticTab = '[data-slot="bottom-operational-drawer-tab"][data-tab="semantic"]';
    cy.get(node).contains('button', 'Columns').click();
    cy.get(node).contains('button', 'Map compatible columns').click();
    waitForE2eApiCall('/workspace/graph/draft', 'PUT');
    cy.wrap(null).should(() => {
      const saved = getE2eApiCalls('/workspace/graph/draft', 'PUT').at(-1)?.body as DraftSave;
      const authority = saved?.draft.nodes.find((item) => item.id === 'model-orders')?.metadata
        ?.transformAuthoring as { semanticDocument?: unknown } | undefined;
      expect(
        inspectDvtSubstraitProjectionDraft(
          decodeDvtSubstraitProjectionDocument(authority?.semanticDocument)
        ).ok,
        'mapped projection was saved before testing navigation'
      ).to.equal(true);
    });
    cy.get(node).then(($node) => {
      const position = $node[0]?.style.transform;
      const saves = getE2eApiCalls('/workspace/graph/draft', 'PUT').length;
      for (const entry of ['title', 'metrics', 'keyboard']) {
        cy.get(title).click();
        cy.get(semanticTab).should('have.attr', 'aria-selected', 'true');
        if (entry === 'title') cy.get(title).dblclick();
        else if (entry === 'metrics')
          cy.get(`${node} [data-slot="graph-node-operational-rail"]`).dblclick();
        else cy.get(node).focus().type('{enter}');
        cy.get(dataTab).should('have.attr', 'aria-selected', 'true');
        cy.get('[data-slot="canvas-node-workbench-overlay"]').should('not.exist');
        cy.wrap(null).should(() => {
          expect(
            getE2eApiCalls('/workspace/graph/draft', 'PUT'),
            `${entry} is navigation only`
          ).to.have.length(saves);
        });
      }
      cy.get(node).contains('button', 'Columns').click();
      cy.get(dataTab).should('have.attr', 'aria-selected', 'true');
      cy.get(title).rightclick();
      cy.get('[role="menuitem"]').contains('Properties').click();
      cy.get('[data-slot="canvas-node-workbench-overlay"]').should('be.visible');
      cy.get(node).should(($current) => {
        expect($current[0]?.style.transform).to.equal(position);
        expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(saves);
      });
    });
  });

  for (const entry of ['add-column', 'field-context-menu'] as const) {
    it(`creates, persists, and restores a direct alias through ${entry}`, () => {
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

      if (entry === 'field-context-menu') {
        cy.get(
          '.react-flow__node[data-id="model-orders"] [data-slot="graph-node-card-title"]'
        ).click();
        cy.get('[data-slot="bottom-operational-drawer-tab"][data-tab="semantic"]').should(
          'have.attr',
          'aria-selected',
          'true'
        );
        cy.get(
          '.react-flow__node[data-id="model-orders"] [data-slot="graph-node-card-title"]'
        ).dblclick();
        cy.get('[data-slot="bottom-operational-drawer-tab"][data-tab="data:model-orders"]').should(
          'have.attr',
          'aria-selected',
          'true'
        );
        cy.get('[data-slot="canvas-node-workbench-overlay"]').should('not.exist');
        cy.get(
          '.react-flow__node[data-id="model-orders"] [data-slot="graph-node-card-title"]'
        ).rightclick();
        cy.get('[role="menuitem"]').contains('Properties').click();
        cy.get('[data-slot="canvas-node-workbench-overlay"]').within(() => {
          cy.contains('[role="tab"]', 'General').should('have.attr', 'aria-selected', 'true');
          cy.get('button[aria-label="Close"]').click();
        });
      }

      if (entry === 'field-context-menu') {
        cy.get(
          '.react-flow__node[data-id="model-orders"] [data-column-name="customer"]'
        ).rightclick();
        cy.get('[data-slot="graph-node-column-alias-action"]').click();
      } else {
        cy.get('.react-flow__node[data-id="model-orders"]')
          .find('[data-slot="graph-node-calculated-column-trigger"]')
          .focus()
          .should('have.focus')
          .click();
      }
      cy.get('[data-slot="graph-node-calculated-column-form"]').within(() => {
        cy.get('select[name="kind"]').should('have.value', 'field-ref');
        if (entry === 'add-column') cy.get('select[name="inputFieldId"]').select('customer');
        else cy.get('select[name="inputFieldId"] option:selected').should('have.text', 'customer');
        cy.get('input[name="alias"]').type('customer_alias');
        cy.get('input[name="alias"]').should('have.value', 'customer_alias');
        cy.get('select[name="inputFieldId"]').should('not.have.value', '');
        cy.get('button[type="submit"]').should('be.enabled').click();
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
  }

  it('creates an alias from an upstream field that is excluded from Transform output', () => {
    cy.viewport(1920, 1080);
    visitCanvas();
    const model = '.react-flow__node[data-id="model-orders"]';

    cy.get(model).find('button[aria-expanded]').contains('Columns').click();
    cy.get(model).contains('button', 'Map compatible columns').click();
    waitForE2eApiCall('/workspace/graph/draft', 'PUT');
    cy.get(`${model} [data-column-name="status"]`)
      .find('[data-slot="graph-node-column-output-state"]')
      .click();
    waitForE2eApiCall('/workspace/graph/draft', 'PUT');
    cy.get(`${model} [data-column-name="status"]`)
      .find('[data-slot="graph-node-column-output-state"]')
      .should('have.attr', 'aria-pressed', 'false');

    cy.get(model).find('[data-slot="graph-node-calculated-column-trigger"]').focus().click();
    cy.get('[data-slot="graph-node-calculated-column-form"]').within(() => {
      cy.get('select[name="inputFieldId"] option').should('contain.text', 'status');
      cy.get('select[name="inputFieldId"]').select('status');
      cy.get('input[name="alias"]').type('status_alias');
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
      expect(alias).to.deep.include({ name: 'status_alias', sourceFieldName: 'status' });
    });
    cy.get(model).should('contain.text', 'status_alias');
  });

  it('keeps one independent data tab per opened card', () => {
    resetE2eApiStubs();
    stubCanvas(true);
    cy.viewport(1920, 1080);
    visitCanvas();
    const firstModel = '.react-flow__node[data-id="model-orders"]';
    const secondModel = '.react-flow__node[data-id="model-orders-secondary"]';
    const firstTab = '[data-slot="bottom-operational-drawer-tab"][data-tab="data:model-orders"]';
    const secondTab =
      '[data-slot="bottom-operational-drawer-tab"][data-tab="data:model-orders-secondary"]';

    cy.get(`${firstModel} [data-slot="graph-node-card-title"]`).dblclick();
    cy.get(firstTab).should('have.attr', 'aria-selected', 'true');
    cy.contains(
      '[data-slot="bottom-operational-drawer-data"]',
      'Run Orders model to publish a result'
    ).should('be.visible');

    cy.get(`${secondModel} [data-slot="graph-node-card-title"]`).dblclick();
    cy.get(secondTab).should('have.attr', 'aria-selected', 'true');
    cy.get(firstTab).should('exist');
    cy.contains(
      '[data-slot="bottom-operational-drawer-data"]',
      'Run Orders model secondary to publish a result'
    ).should('be.visible');

    cy.get(firstTab).click();
    cy.contains(
      '[data-slot="bottom-operational-drawer-data"]',
      'Run Orders model to publish a result'
    ).should('be.visible');
    cy.get(secondTab).click();
    cy.contains(
      '[data-slot="bottom-operational-drawer-data"]',
      'Run Orders model secondary to publish a result'
    ).should('be.visible');
  });
});
