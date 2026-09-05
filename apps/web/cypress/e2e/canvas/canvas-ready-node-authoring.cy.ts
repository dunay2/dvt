/** Owned concern: prove governed Canvas draft reads, saves, and reload posture in browser. */
import { resolveCanvasViewCopy, type CanvasViewCopy } from '../../../src/app/views/canvas/copy';
import {
  stubFailingCanvasDraftSave,
  stubCanvasDraftRead,
  stubCanvasDraftSave,
  stubStatefulCanvasDraftAuthoring,
} from '../../support/canvasDraftAuthoring';
import {
  clickCanvasContextMenuItem,
  openCanvasContextMenuAt,
} from '../../support/canvasExecutionSelection';
import { getE2eApiCalls, stubE2eJsonApi, waitForE2eApiCall } from '../../support/e2eApiStub';
import {
  E2E_PROJECT_WORKSPACE,
  stubShellBootstrapApis,
  visitWithE2eWorkspaceSession,
} from '../../support/workspaceSession';

type CanvasDraftSaveRequestBody = {
  draft: {
    nodeIds: string[];
    nodePositions: Record<string, { x: number; y: number }>;
    nodes: Array<{
      id: string;
      name: string;
      kind: string;
      pluginId: string;
      tags?: string[];
      metadata?: Record<string, unknown>;
    }>;
  };
};
type CanvasDraftStatusCopyKey = keyof Pick<
  CanvasViewCopy,
  'draftSyncedLabel' | 'draftSavedLabel' | 'draftSaveFailedLabel'
>;

function stubRuntimeCapabilities(): void {
  stubShellBootstrapApis({
    scopes: ['workspace:graph-draft:view', 'workspace:graph-draft:save', 'run:start'],
  });
  stubE2eJsonApi('GET', '/workspace/context', {
    defaultWorkspace: E2E_PROJECT_WORKSPACE,
    availableWorkspaces: [E2E_PROJECT_WORKSPACE],
  });
  stubE2eJsonApi('GET', '/capabilities', {
    apiVersion: '1.0.0',
    minFrontendVersion: '0.0.1',
    plugins: {
      dbt: { available: true },
      dvt: { available: true },
    },
  });
  stubE2eJsonApi('GET', '/workspace/warehouse/connections', [
    {
      id: 'warehouse-a',
      name: 'Warehouse A',
      type: 'postgres',
      database: 'analytics_a',
    },
    {
      id: 'warehouse-b',
      name: 'Warehouse B',
      type: 'postgres',
      database: 'analytics_b',
    },
  ]);
  stubE2eJsonApi('POST', '/workspace/warehouse/connections/warehouse-b/test', {
    connectionId: 'warehouse-b',
    status: 'passed',
    checkedAt: '2026-08-13T00:00:00.000Z',
    objectCount: 1,
  });
}

function assertNoSeriousAccessibilityViolations(context: string): void {
  cy.get(context).should('be.visible');
  cy.injectAxe();
  cy.checkA11y(
    context,
    {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
      },
      includedImpacts: ['serious', 'critical'],
    },
    (violations) => {
      if (violations.length === 0) {
        return;
      }

      throw new Error(
        violations
          .map(
            (violation) =>
              `${violation.id}: ${violation.help} -> ${violation.nodes
                .map((node) => node.target.join(' '))
                .join(', ')}`
          )
          .join('\n')
      );
    }
  );
}

function visitReadyCanvas(): void {
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

function waitForDraftSaveCount(expectedCount: number): void {
  cy.wrap(null).should(() => {
    expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(expectedCount);
  });
}

function findDraftSaveContainingNode(nodeId: string): CanvasDraftSaveRequestBody | undefined {
  return getE2eApiCalls('/workspace/graph/draft', 'PUT')
    .map((call) => call.body as CanvasDraftSaveRequestBody)
    .find((body) => body.draft.nodeIds.includes(nodeId));
}

function waitForDraftSaveContainingNode(nodeId: string): void {
  cy.wrap(null).should(() => {
    expect(findDraftSaveContainingNode(nodeId), `saved draft containing ${nodeId}`).to.not.be
      .undefined;
  });
}

function assertNoManualSaveCommand(): void {
  cy.contains('button', /^Save$/).should('not.exist');
  cy.contains('button', /^Guardar$/).should('not.exist');
}

function assertDraftSaveStatus(copyKey: CanvasDraftStatusCopyKey): void {
  cy.window({ log: false }).then((window) => {
    const copy = resolveCanvasViewCopy(window.document.documentElement.lang);

    cy.get('[data-slot="canvas-draft-save-status"]').should('contain.text', copy[copyKey]);
  });
}

function assertNoDraftSaveStatus(): void {
  cy.get('[data-slot="canvas-draft-save-status"]').should('not.exist');
}

function chooseSqlTransformFromCanvasContextMenu(): void {
  openCanvasContextMenuAt(560, 260);
  clickCanvasContextMenuItem(/^(Add|Anadir)\.\.\.$/);
  cy.contains(
    '[data-slot="canvas-context-menu-add-catalog-item"]',
    /^(Add model|Anadir modelo)/
  ).click();
}

function addSqlTransformNode(): void {
  cy.get('.react-flow__node').should('have.length.greaterThan', 0);
  cy.get('[data-slot="canvas-add-node-palette"]').should('not.exist');
  chooseSqlTransformFromCanvasContextMenu();
}

function removeCanvasNode(nodeId: string): void {
  cy.get(`.react-flow__node[data-id="${nodeId}"]`)
    .find('[data-slot="graph-node-card-actions"]')
    .should('be.visible')
    .click();
  cy.contains('[data-slot="canvas-node-context-menu-item"]', 'Delete').click();
}

describe('Canvas ready node authoring', () => {
  beforeEach(() => {
    stubRuntimeCapabilities();
  });

  it('persists business tags while semantic tags stay protected and directly filterable', () => {
    stubStatefulCanvasDraftAuthoring({
      authoringGenerated: true,
      title: 'Actionable tags',
    });

    visitReadyCanvas();

    cy.get(
      '.react-flow__node[data-id="dvt-transform-1"] [data-slot="canvas-node-shell"]'
    ).dblclick();
    cy.get('[data-slot="canvas-node-workbench-tab-general"]').click();
    cy.get('input[name="node-tags"]').should('have.value', '').type('finance');
    cy.contains('[data-slot="canvas-node-workbench-panel"] button', /^Apply$/).click();

    cy.wrap(null).should(() => {
      const savedNode = getE2eApiCalls('/workspace/graph/draft', 'PUT')
        .map((call) => call.body as CanvasDraftSaveRequestBody)
        .map((body) => body.draft.nodes.find((candidate) => candidate.id === 'dvt-transform-1'))
        .find(
          (node) => node?.tags?.includes('authoring') === true && node.tags.includes('finance')
        );

      expect(savedNode, 'saved business and semantic tags').to.not.be.undefined;
    });
    cy.get('[data-slot="canvas-node-workbench-close"]').click();

    const englishTagAction =
      '.react-flow__node[data-id="dvt-transform-1"] button[aria-label="Filter graph by tag finance"]';
    cy.get(englishTagAction)
      .focus()
      .should('have.focus')
      .then(() => cy.press(Cypress.Keyboard.Keys.ENTER));
    cy.get('[data-slot="canvas-graph-filter-control"]').should('contain.text', 'Tag: finance');
    cy.get(englishTagAction).click();
    cy.get('[aria-label="Remove Tag filter finance"]').should('have.length', 1);
    cy.get('button[aria-label="Clear graph filters"]').click();
    cy.get('[aria-label="Remove Tag filter finance"]').should('not.exist');

    visitReadyCanvas();

    cy.get(
      '.react-flow__node[data-id="dvt-transform-1"] [data-slot="canvas-node-shell"]'
    ).dblclick();
    cy.get('[data-slot="canvas-node-workbench-tab-general"]').click();
    cy.get('input[name="node-tags"]').should('have.value', 'finance');
    cy.get('[data-slot="canvas-node-workbench-close"]').click();

    cy.get('[data-slot="shell-menu-trigger"]').click();
    cy.get('[data-slot="shell-language-option-es"]').click();
    cy.get(
      '.react-flow__node[data-id="dvt-transform-1"] button[aria-label="Filtrar el grafo por la etiqueta finance"]'
    ).click();
    cy.get('[data-slot="canvas-graph-filter-control"]').should('contain.text', 'Etiqueta: finance');
    assertNoSeriousAccessibilityViolations('[data-slot="canvas-graph-filter-control"]');
  });

  it('adds a governed authoring node from the canvas context menu on an existing canvas', () => {
    stubStatefulCanvasDraftAuthoring();

    visitReadyCanvas();

    cy.contains('Sales canvas').should('be.visible');
    assertNoManualSaveCommand();
    assertNoDraftSaveStatus();
    cy.contains('.react-flow__node', 'model_orders').should('be.visible');
    addSqlTransformNode();

    cy.get('.react-flow__node[data-id="dvt-transform-1"]').should('be.visible');
    waitForDraftSaveContainingNode('dvt-transform-1');
    cy.then(() => {
      const saveBody = findDraftSaveContainingNode('dvt-transform-1');
      const createdNode = saveBody?.draft.nodes.find((node) => node.id === 'dvt-transform-1');
      const createdPosition = saveBody?.draft.nodePositions['dvt-transform-1'];

      expect(saveBody?.draft.nodeIds).to.include('dvt-transform-1');
      expect(createdPosition?.x).to.be.a('number');
      expect(createdPosition?.y).to.be.a('number');
      expect(createdNode).to.deep.include({
        id: 'dvt-transform-1',
        name: 'Model 1',
        kind: 'transform',
        pluginId: 'dvt',
      });
    });
    assertNoManualSaveCommand();
  });

  it('keeps the canvas context menu visible after a real browser right-click gesture', () => {
    stubCanvasDraftRead();
    stubCanvasDraftSave();

    visitReadyCanvas();

    cy.get('.react-flow__pane').should('be.visible').rightclick(320, 260, { force: true });

    cy.get('[data-slot="canvas-context-menu"]').should('be.visible');
    cy.wait(1_500);
    cy.get('[data-slot="canvas-context-menu"]').should('be.visible');
    cy.contains(
      '[data-slot="canvas-context-menu"] [role="menuitem"]',
      /^(Add|Anadir)\.\.\.$/
    ).should('be.visible');
    cy.get('[data-slot="canvas-context-menu"]').should('not.contain.text', 'Explore project');
  });

  it('projects semantic health borders without a visible status chip', () => {
    stubCanvasDraftRead();
    stubCanvasDraftSave();

    visitReadyCanvas();

    cy.contains('.react-flow__node', 'Src Orders').as('sourceNode').should('be.visible');
    cy.get('@sourceNode')
      .find('[data-slot="graph-node-card"]')
      .should('have.class', 'border-green-500');
    cy.get('@sourceNode')
      .should('have.attr', 'aria-label')
      .and('match', /Ready$/);
    cy.get('@sourceNode').find('[data-slot="graph-node-status-chip"]').should('not.exist');

    cy.contains('.react-flow__node', 'Model Orders').as('ordersNode').should('be.visible').click();
    cy.get('@ordersNode')
      .find('[data-slot="graph-node-card"]')
      .should('have.class', 'border-slate-700')
      .and('have.class', 'ring-2');
    cy.get('@ordersNode')
      .should('have.attr', 'aria-label')
      .and('match', /Draft$/);
    cy.get('@ordersNode').find('[data-slot="graph-node-status-chip"]').should('not.exist');
  });

  it('opens node Properties from double-click while ellipsis remains operations-only', () => {
    stubCanvasDraftRead();
    stubCanvasDraftSave();

    visitReadyCanvas();

    cy.contains('.react-flow__node', 'Model Orders').as('ordersNode').should('be.visible').click();
    cy.get('@ordersNode')
      .should('have.attr', 'aria-label')
      .and('match', /Draft$/);
    cy.get('@ordersNode')
      .find(
        '[data-slot="graph-node-metric-hotspot"][aria-label*="models/analytics/model_orders.sql"]'
      )
      .should('be.visible');
    cy.get('[data-slot="canvas-node-floating-toolbar"]').should('not.exist');
    cy.get('[data-slot="canvas-node-workbench-overlay"]').should('not.exist');

    cy.get('@ordersNode').find('[data-slot="graph-node-card-actions"]').click();
    cy.get('[data-slot="canvas-node-context-menu"]').should('be.visible');
    cy.get('[data-slot="canvas-node-context-menu"] [data-menu-action="inspect-node"]').should(
      'not.exist'
    );
    cy.get('body').type('{esc}', { force: true });

    cy.get('@ordersNode').find('[data-slot="canvas-node-shell"]').dblclick();

    cy.get('[data-slot="canvas-node-workbench-overlay"]').should('be.visible');
    cy.get('[data-slot="canvas-node-workbench-panel"]').should('contain.text', 'model_orders');
  });

  it('persists add and remove authoring changes across route reloads', () => {
    stubStatefulCanvasDraftAuthoring();

    visitReadyCanvas();

    addSqlTransformNode();
    cy.get('.react-flow__node[data-id="dvt-transform-1"]').should('be.visible');
    waitForDraftSaveCount(1);

    visitReadyCanvas();

    cy.get('.react-flow__node[data-id="dvt-transform-1"]').should('be.visible');
    removeCanvasNode('dvt-transform-1');
    cy.get('.react-flow__node[data-id="dvt-transform-1"]').should('not.exist');
    waitForDraftSaveCount(2);

    visitReadyCanvas();

    cy.contains('.react-flow__node', 'model_orders').should('be.visible');
    cy.get('.react-flow__node[data-id="dvt-transform-1"]').should('not.exist');
  });

  it('roundtrips dbt properties while generated SQL remains read-only', () => {
    stubStatefulCanvasDraftAuthoring({
      dbtGraph: true,
      authoringGenerated: true,
      title: 'dbt properties roundtrip',
    });

    visitReadyCanvas();

    cy.get('.react-flow__node[data-id="raw_orders"]')
      .should('contain.text', 'Source')
      .and('not.contain.text', 'dbt:source')
      .find('[data-slot="graph-node-operational-rail"]')
      .should('contain.text', 'Rows')
      .and('contain.text', '18.2k')
      .and('contain.text', 'Size')
      .and('contain.text', '3.9 MB');

    cy.get('.react-flow__node[data-id="orders_model"]').as('ordersModel').should('be.visible');
    cy.get('@ordersModel').find('[data-slot="canvas-node-shell"]').dblclick();
    cy.get('[data-slot="canvas-node-workbench-overlay"]').should('be.visible');
    cy.get('[data-slot="canvas-node-workbench-tab-code"]')
      .should('be.visible')
      .and('have.attr', 'aria-selected', 'true');
    cy.get('[data-testid="monaco-code-viewer"]').should('be.visible');
    cy.get('textarea[name="dbt-model-sql"]').should('not.exist');
    cy.get('[data-slot="canvas-node-workbench-tab-general"]').click();
    cy.get('[data-slot="canvas-node-workbench-panel"]')
      .should('contain.text', 'Model')
      .and('contain.text', 'dbt export')
      .and('not.contain.text', 'dbt:model');
    cy.contains('[data-slot="canvas-node-workbench-panel"]', 'analytics').should('be.visible');
    cy.contains('[data-slot="canvas-node-workbench-panel"]', 'raw_orders').should('be.visible');
  });

  it('roundtrips Source and Sink properties while Model semantics stay canonical', () => {
    stubStatefulCanvasDraftAuthoring({
      authoringGenerated: true,
      title: 'DVT properties roundtrip',
    });

    visitReadyCanvas();

    cy.get('.react-flow__node[data-id="source-1"] [data-slot="canvas-node-shell"]').dblclick();
    cy.contains('h3', 'DVT source').should('be.visible');
    waitForE2eApiCall('/workspace/warehouse/connections', 'GET');
    cy.get('select[name="dvt-source-connection"]').select('warehouse-b');
    cy.get('input[name="dvt-source-schema"]').clear().type('curated');
    cy.get('input[name="dvt-source-table"]').clear().type('orders_clean');
    cy.get('input[name="dvt-source-alias"]').clear().type('orders_curated');
    cy.contains('[data-slot="canvas-node-workbench-panel"] button', /^Apply$/).click();
    cy.wrap(null).should(() => {
      const savedSource = getE2eApiCalls('/workspace/graph/draft', 'PUT')
        .map((call) => call.body as CanvasDraftSaveRequestBody)
        .map((body) => body.draft.nodes.find((candidate) => candidate.id === 'source-1'))
        .find((node) => {
          const config = node?.metadata?.config as
            { alias?: string; database?: string; schema?: string; table?: string } | undefined;
          return (
            config?.schema === 'curated' &&
            config.table === 'orders_clean' &&
            config.alias === 'orders_curated' &&
            config.database === 'legacy_warehouse' &&
            (node?.metadata?.connectionRef as { connectionId?: string } | undefined)
              ?.connectionId === 'warehouse-b'
          );
        });
      expect(savedSource, 'saved Source properties').to.not.be.undefined;
    });
    cy.get('[data-slot="canvas-node-workbench-close"]').click();

    cy.get('.react-flow__node[data-id="sink-1"] [data-slot="canvas-node-shell"]').dblclick();
    cy.get('[data-slot="canvas-node-workbench-tab-sink"]').click();
    cy.contains('h3', 'DVT sink').should('be.visible');
    cy.contains('label', 'Schema').scrollIntoView().should('be.visible');
    cy.get('input[name="dvt-sink-schema"]').clear().type('published');
    cy.get('input[name="dvt-sink-table"]').clear().type('orders_monthly');
    cy.get('select[name="dvt-sink-materialization"]').select('view');
    cy.get('select[name="dvt-sink-write-mode"]').select('append');
    cy.contains('[data-slot="canvas-node-workbench-panel"] button', /^Apply$/).click();
    cy.wrap(null).should(() => {
      const savedSink = getE2eApiCalls('/workspace/graph/draft', 'PUT')
        .map((call) => call.body as CanvasDraftSaveRequestBody)
        .map((body) => body.draft.nodes.find((candidate) => candidate.id === 'sink-1'))
        .find((node) => {
          const config = node?.metadata?.config as
            | {
                database?: string;
                materialization?: string;
                partitionStrategy?: string;
                schema?: string;
                table?: string;
                writeMode?: string;
              }
            | undefined;
          return (
            config?.schema === 'published' &&
            config.table === 'orders_monthly' &&
            config.materialization === 'view' &&
            config.writeMode === 'append' &&
            config.database === 'legacy_warehouse' &&
            config.partitionStrategy === 'daily_by_order_date'
          );
        });
      expect(savedSink, 'saved Sink properties').to.not.be.undefined;
    });
    cy.get('[data-slot="canvas-node-workbench-close"]').click();

    cy.get(
      '.react-flow__node[data-id="dvt-transform-1"] [data-slot="canvas-node-shell"]'
    ).dblclick();
    cy.get('[data-slot="canvas-node-workbench-tab-code"]').should(
      'have.attr',
      'aria-selected',
      'true'
    );
    cy.get('[data-testid="monaco-code-viewer"]').should('be.visible');
    cy.get('[data-testid="monaco-code-editor"]').should('not.exist');
    cy.get('[data-slot="canvas-node-workbench-close"]').click();

    visitReadyCanvas();

    cy.get('.react-flow__node[data-id="source-1"] [data-slot="canvas-node-shell"]').dblclick();
    cy.get('input[name="dvt-source-schema"]').should('have.value', 'curated');
    cy.get('input[name="dvt-source-table"]').should('have.value', 'orders_clean');
    cy.get('input[name="dvt-source-alias"]').should('have.value', 'orders_curated');
    cy.get('select[name="dvt-source-connection"]').should('have.value', 'warehouse-b');
    cy.get('[data-slot="canvas-node-workbench-close"]').click();

    cy.get('.react-flow__node[data-id="sink-1"] [data-slot="canvas-node-shell"]').dblclick();
    cy.get('[data-slot="canvas-node-workbench-tab-sink"]').click();
    cy.get('input[name="dvt-sink-schema"]').should('have.value', 'published');
    cy.get('input[name="dvt-sink-table"]').should('have.value', 'orders_monthly');
    cy.get('select[name="dvt-sink-materialization"]').should('have.value', 'view');
    cy.get('select[name="dvt-sink-write-mode"]').should('have.value', 'append');
    cy.get('[data-slot="canvas-node-workbench-close"]').click();
  });
  it('does not present failed draft saves as persisted after reload', () => {
    stubCanvasDraftRead();
    stubFailingCanvasDraftSave();

    visitReadyCanvas();

    addSqlTransformNode();
    cy.get('.react-flow__node[data-id="dvt-transform-1"]').should('be.visible');
    waitForDraftSaveContainingNode('dvt-transform-1');
    assertNoManualSaveCommand();
    assertDraftSaveStatus('draftSaveFailedLabel');

    visitReadyCanvas();

    cy.contains('.react-flow__node', 'model_orders').should('be.visible');
    cy.get('.react-flow__node[data-id="dvt-transform-1"]').should('not.exist');
  });

  it('does not expose ready-canvas node creation when draft capability is read-only', () => {
    stubCanvasDraftRead({ readOnly: true });
    stubCanvasDraftSave();

    visitReadyCanvas();

    cy.contains('Sales canvas').should('be.visible');
    cy.get('[data-slot="canvas-toolbar-insert-command"]').should('not.exist');
    cy.get('.react-flow__pane').should('be.visible').rightclick(620, 340, { force: true });
    cy.get('[data-slot="canvas-context-menu"]').should('not.exist');
    cy.contains('[role="menuitem"]', /^(Add|Anadir)\.\.\.$/).should('not.exist');
    cy.contains('[role="menuitem"]', 'Add model').should('not.exist');
    cy.contains('[role="menuitem"]', 'Add source').should('not.exist');
    cy.then(() => {
      const calls = getE2eApiCalls('/workspace/graph/draft', 'PUT');
      const createdNode = calls
        .map((call) => call.body as CanvasDraftSaveRequestBody)
        .flatMap((body) => body.draft.nodes)
        .find((node) => node.id === 'dvt-transform-1');
      expect(createdNode, 'no model created through the read-only surface').to.be.undefined;
    });
  });

  it(
    'keeps critical Canvas interactions operable on the canonical 1,000-node graph',
    { defaultCommandTimeout: 30_000 },
    () => {
      stubStatefulCanvasDraftAuthoring({ largeGraph: true });

      visitReadyCanvas();

      cy.contains('Large Canvas regression fixture').should('be.visible');
      cy.get('.react-flow__node[data-id="large-node-00-00"]')
        .should('exist')
        .click({ force: true });
      cy.get('.react-flow__node[data-id="large-node-00-00"]')
        .find('[data-slot="graph-node-card-actions"]')
        .should('be.visible');
      cy.get('[data-slot="canvas-node-floating-toolbar"]').should('not.exist');

      cy.get('.react-flow__node[data-id="large-node-01-00"]')
        .should('exist')
        .click({ force: true });
      cy.get('.react-flow__node[data-id="large-node-01-00"]')
        .find('[data-slot="graph-node-card-actions"]')
        .should('be.visible');
      cy.get('[data-slot="canvas-node-floating-toolbar"]').should('not.exist');

      cy.get('.react-flow__viewport')
        .invoke('attr', 'style')
        .then((initialTransform) => {
          cy.get('.react-flow__controls-zoomin').click({ force: true });
          cy.get('.react-flow__viewport').should(($viewport) => {
            expect($viewport.attr('style')).not.to.equal(initialTransform);
          });
        });

      cy.get('.react-flow__viewport')
        .invoke('attr', 'style')
        .then((zoomedTransform) => {
          cy.window().then((browserWindow) => {
            cy.get('.react-flow__pane')
              .trigger('mousedown', {
                button: 0,
                clientX: 520,
                clientY: 360,
                force: true,
                view: browserWindow,
              })
              .trigger('mousemove', {
                buttons: 1,
                clientX: 620,
                clientY: 420,
                force: true,
                view: browserWindow,
              })
              .trigger('mouseup', {
                button: 0,
                clientX: 620,
                clientY: 420,
                force: true,
                view: browserWindow,
              });
          });
          cy.get('.react-flow__viewport').should(($viewport) => {
            expect($viewport.attr('style')).not.to.equal(zoomedTransform);
          });
        });

      cy.get('.react-flow__node[data-id="large-node-01-00"]')
        .find('[data-slot="canvas-node-shell"]')
        .dblclick({ force: true });
      cy.get('[data-slot="canvas-node-workbench-panel"]')
        .should('be.visible')
        .and('contain.text', 'large-node-01-00');
      cy.contains('[data-slot="canvas-node-workbench-panel"] button', /^(Close|Cerrar)$/).click();
      cy.get('[data-slot="canvas-node-workbench-panel"]').should('not.exist');
    }
  );
});
