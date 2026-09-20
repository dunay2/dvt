/** Owned concern: prove direct alias authoring through the governed Transform command rail. */
import {
  decodeDvtSubstraitProjectionDocument,
  inspectDvtSubstraitProjectionDraft,
  type DvtSubstraitProjectionSemantics,
} from '../../../src/app/views/canvas/canvasDvtSubstraitProjection';
import { stubStatefulCanvasDraftAuthoring } from '../../support/canvasDraftAuthoring';
import { connectCanvasNodes } from '../../support/canvasGraphAuthoring';
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
    const visibleNode = (): Cypress.Chainable<JQuery<HTMLElement>> =>
      cy
        .get('.react-flow__node[data-id="model-orders"]')
        .filter(':visible')
        .should('have.length', 1)
        .first();
    const visibleTitle = (): Cypress.Chainable<JQuery<HTMLElement>> =>
      visibleNode().find('[data-slot="graph-node-card-title"]');
    const canvasTab = '[data-slot="canvas-workspace-tab"]';
    const modelTab = '[data-slot="canvas-model-main-tab"]';
    const editorTab = '[data-slot="canvas-model-view-tab"][data-view="editor"]';
    const dataTab = '[data-slot="canvas-model-view-tab"][data-view="data"]';
    visibleNode().contains('button', 'Columns').click();
    visibleNode().contains('button', 'Map compatible columns').click();
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
    visibleNode().then(($node) => {
      const position = $node[0]?.style.transform;
      const saves = getE2eApiCalls('/workspace/graph/draft', 'PUT').length;
      for (const entry of ['title', 'metrics', 'keyboard']) {
        visibleTitle().click();
        if (entry === 'title') visibleTitle().dblclick();
        else if (entry === 'metrics')
          visibleNode().find('[data-slot="graph-node-operational-rail"]').dblclick();
        else visibleNode().focus().type('{enter}');
        cy.get(modelTab).should('have.attr', 'aria-selected', 'true');
        cy.get(entry === 'metrics' ? dataTab : editorTab).should(
          'have.attr',
          'aria-selected',
          'true'
        );
        if (entry !== 'metrics') cy.get(dataTab).click();
        cy.get(dataTab).should('have.attr', 'aria-selected', 'true');
        cy.get('[data-slot="canvas-node-workbench-overlay"]').should('not.exist');
        cy.wrap(null).should(() => {
          expect(
            getE2eApiCalls('/workspace/graph/draft', 'PUT'),
            `${entry} is navigation only`
          ).to.have.length(saves);
        });
        cy.get(canvasTab).click().should('have.attr', 'aria-selected', 'true');
      }
      visibleNode().contains('button', 'Columns').click();
      cy.get(dataTab).should('have.attr', 'aria-selected', 'true');
      visibleTitle().rightclick();
      cy.get('[role="menuitem"]').contains('Properties').click();
      cy.get('[data-slot="canvas-node-workbench-overlay"]').should('be.visible');
      visibleNode().should(($current) => {
        expect($current[0]?.style.transform).to.equal(position);
        expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(saves);
      });
    });
  });

  for (const entry of ['add-column', 'field-context-menu'] as const) {
    it(`creates, persists, and restores a direct alias through ${entry}`, () => {
      cy.viewport(1920, 1080);
      visitCanvas();
      const visibleNode = (): Cypress.Chainable<JQuery<HTMLElement>> =>
        cy
          .get('.react-flow__node[data-id="model-orders"]')
          .filter(':visible')
          .should('have.length', 1)
          .first();
      cy.get('.react-flow__node[data-id="model-orders"]')
        .find('button[aria-expanded]')
        .contains('Columns')
        .click();
      cy.get('.react-flow__node[data-id="model-orders"]')
        .contains('button', 'Map compatible columns')
        .click();
      waitForE2eApiCall('/workspace/graph/draft', 'PUT');

      if (entry === 'field-context-menu') {
        visibleNode().find('[data-slot="graph-node-card-title"]').click();
        visibleNode().find('[data-slot="graph-node-card-title"]').dblclick();
        cy.get('[data-slot="canvas-model-view-tab"][data-view="editor"]').should(
          'have.attr',
          'aria-selected',
          'true'
        );
        cy.get('[data-slot="canvas-node-workbench-overlay"]').should('not.exist');
        cy.get('[data-slot="canvas-workspace-tab"]').click();
        visibleNode().find('[data-slot="graph-node-card-title"]').rightclick();
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

  it('preserves a downstream Transform selection when its upstream adds a field and reloads', () => {
    resetE2eApiStubs();
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
    stubStatefulCanvasDraftAuthoring({ authoringGenerated: true, includeLooseNode: true });
    cy.viewport(1920, 1080);
    visitCanvas();

    const upstreamNode = '.react-flow__node[data-id="dvt-transform-1"]';
    const downstreamNode = '.react-flow__node[data-id="orphan-transform-1"]';
    const latestProjection = (nodeId: string): DvtSubstraitProjectionSemantics | null => {
      const saved = getE2eApiCalls('/workspace/graph/draft', 'PUT').at(-1)?.body as
        DraftSave | undefined;
      const authority = saved?.draft.nodes.find((node) => node.id === nodeId)?.metadata
        ?.transformAuthoring as { semanticDocument?: unknown } | undefined;
      if (authority?.semanticDocument == null) return null;
      const inspection = inspectDvtSubstraitProjectionDraft(
        decodeDvtSubstraitProjectionDocument(authority.semanticDocument)
      );
      return inspection.ok ? inspection.projection : null;
    };

    connectCanvasNodes('Transform 1', 'Orphan Transform');
    cy.get('.react-flow__edge[data-id="draft_edge_dvt-transform-1_orphan-transform-1"]').should(
      'be.visible'
    );

    let downstreamFieldIds: string[] = [];
    cy.wrap(null).should(() => {
      const projection = latestProjection('orphan-transform-1');
      expect(projection?.outputs.map((output) => output.name)).to.deep.equal(['order_id', 'total']);
      downstreamFieldIds = projection?.outputs.map((output) => output.fieldId) ?? [];
    });

    cy.get(upstreamNode).contains('button', 'Columns (2)').click();
    cy.get(upstreamNode).find('[data-slot="graph-node-calculated-column-trigger"]').click();
    cy.get('[data-slot="graph-node-calculated-column-form"]').within(() => {
      cy.get('select[name="kind"]').select('string-literal');
      cy.get('input[name="alias"]').type('channel');
      cy.get('input[name="value"]').type('web');
      cy.get('button[type="submit"]').click();
    });

    cy.wrap(null).should(() => {
      expect(
        latestProjection('dvt-transform-1')?.outputs.map((output) => output.name)
      ).to.deep.equal(['order_id', 'total', 'channel']);
      const downstream = latestProjection('orphan-transform-1');
      expect(downstream?.outputs.map((output) => output.name)).to.deep.equal(['order_id', 'total']);
      expect(downstream?.outputs.map((output) => output.fieldId)).to.deep.equal(downstreamFieldIds);
      expect(downstream?.inputFields.map((field) => field.name)).not.to.include('channel');
    });

    cy.get(downstreamNode).find('button[aria-expanded]').contains('Columns').click();
    cy.get(downstreamNode).find('[data-slot="graph-node-column-piece"]').should('have.length', 3);
    cy.get(`${downstreamNode} [data-column-name="channel"]`)
      .find('[data-slot="graph-node-column-output-state"]')
      .should('have.attr', 'aria-pressed', 'false');

    visitCanvas();
    cy.get(downstreamNode).find('button[aria-expanded]').contains('Columns').click();
    cy.get(downstreamNode)
      .find('[data-slot="graph-node-column-piece"]')
      .then(($pieces) => {
        expect([...$pieces].map((piece) => piece.getAttribute('data-column-name'))).to.deep.equal([
          'order_id',
          'total',
          'channel',
        ]);
      });
    cy.get(`${downstreamNode} [data-column-name="channel"]`)
      .find('[data-slot="graph-node-column-output-state"]')
      .should('have.attr', 'aria-pressed', 'false');
    cy.wrap(null).should(() => {
      expect(
        latestProjection('orphan-transform-1')?.outputs.map((output) => output.fieldId)
      ).to.deep.equal(downstreamFieldIds);
    });
  });

  it('keeps one model workspace while switching between opened cards', () => {
    resetE2eApiStubs();
    stubCanvas(true);
    cy.viewport(1920, 1080);
    visitCanvas();
    const canvasTab = '[data-slot="canvas-workspace-tab"]';
    const modelTab = '[data-slot="canvas-model-main-tab"]';
    const editorTab = '[data-slot="canvas-model-view-tab"][data-view="editor"]';
    const dataTab = '[data-slot="canvas-model-view-tab"][data-view="data"]';
    const visibleNode = (nodeId: string): Cypress.Chainable<JQuery<HTMLElement>> =>
      cy
        .get(`.react-flow__node[data-id="${nodeId}"]`)
        .filter(':visible')
        .should('have.length', 1)
        .first();

    visibleNode('model-orders').find('[data-slot="graph-node-card-title"]').dblclick();
    cy.get(modelTab)
      .should('have.attr', 'aria-selected', 'true')
      .and('contain.text', 'Orders model');
    cy.get(editorTab).should('have.attr', 'aria-selected', 'true');
    cy.get(dataTab).click().should('have.attr', 'aria-selected', 'true');

    cy.get(canvasTab).click();
    visibleNode('model-orders-secondary').find('[data-slot="graph-node-card-title"]').dblclick();
    cy.get(modelTab)
      .should('have.attr', 'aria-selected', 'true')
      .and('contain.text', 'Orders model secondary');
    cy.get(editorTab).should('have.attr', 'aria-selected', 'true');

    cy.get(canvasTab).click().should('have.attr', 'aria-selected', 'true');
    cy.get(modelTab).click().should('have.attr', 'aria-selected', 'true');
    cy.get(editorTab).should('have.attr', 'aria-selected', 'true');
  });
});
