/** Prove card-only materialization uses the durable draft rail, without opening an editor. */
import {
  asIsoUtcString,
  ConnectedSourceRefSchema,
  TransformDataSampleResponseSchema,
  type WorkspaceGraphAuthoringDraft,
} from '@dvt/contracts';

import { stubStatefulCanvasDraftAuthoring } from '../../support/canvasDraftAuthoring';
import {
  getE2eApiCalls,
  stubE2eApi,
  stubE2eJsonApi,
  waitForE2eApiCall,
} from '../../support/e2eApiStub';
import { revisitWorkbenchCanvas } from '../../support/relationalWorkbench/navigation';
import {
  E2E_PROJECT_WORKSPACE,
  stubShellBootstrapApis,
  visitWithE2eWorkspaceSession,
} from '../../support/workspaceSession';

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
  waitForE2eApiCall('/workspace/graph/draft', 'GET');
  // Selection raises overlapping cards, just as it does for a user; no forced interactions.
  cy.get('.react-flow__controls-fitview').click();
  cy.get('.react-flow__node[data-id="transform-customers"]').click('topLeft').as('modelNode');
  cy.get('[data-slot="canvas-node-workbench-close"]').click();
  cy.get('.react-flow__controls-fitview').click();
}

describe('Model card materialization', () => {
  beforeEach(() => {
    cy.viewport(1600, 1000);
    stubShellBootstrapApis();
    stubE2eJsonApi('GET', '/workspace/context', {
      defaultWorkspace: E2E_PROJECT_WORKSPACE,
      availableWorkspaces: [E2E_PROJECT_WORKSPACE],
    });
    stubE2eJsonApi('GET', '/capabilities', {
      apiVersion: '1.0.0',
      minFrontendVersion: '0.0.1',
      plugins: { dvt: { available: true } },
    });
    const draft = stubStatefulCanvasDraftAuthoring({ projectionModel: true });
    const model = draft.nodes.find((node) => node.id === 'transform-customers')!;
    model.metadata = {
      ...model.metadata,
      config: {
        materialized: 'view',
        resultTarget: {
          schemaVersion: 'dvt-transform-result-target.v1',
          connectionRef: {
            schemaVersion: 'connection-ref.v1',
            provider: 'postgres',
            connectionId: 'warehouse-main',
          },
          schema: 'analytics',
          relation: 'customers',
        },
      },
    };
    const source = draft.nodes.find((node) => node.id === 'source-customers')!;
    const sourceRef = ConnectedSourceRefSchema.parse(source.metadata?.connectedSourceRef);
    stubE2eApi('GET', /\/transforms\/transform-customers\/data-sample$/, ({ url }) => ({
      body: TransformDataSampleResponseSchema.parse({
        contractVersion: 1,
        canvasId: draft.canvas.id,
        transformNodeId: model.id,
        draftRevision: 'rev-e2e-graph-ready',
        semanticPlanSha256: url.searchParams.get('semanticPlanSha256'),
        columns: ['name', 'email', 'country'].map((name) => ({
          name,
          type: 'string',
          nullable: false,
        })),
        rows: Array.from({ length: 20 }, (_, index) => ({
          values: [`customer-${index}`, `customer-${index}@example.test`, 'ES'],
        })),
        limit: 20,
        truncated: false,
        provenance: {
          mode: 'live',
          sourceRefs: [sourceRef],
          queriedAt: asIsoUtcString('2026-10-26T10:00:00.000Z'),
          limit: 20,
          navigation: 'bounded-first-page',
        },
      }),
    }));
  });

  it('changes and persists materialization without replacing or shifting the canvas', () => {
    visitCanvas();
    cy.get('@modelNode')
      .find('[data-slot="graph-node-materialization"] [data-icon="eye"]')
      .should('be.visible');
    cy.get('@modelNode').should('not.contain.text', 'Last run');
    cy.get('@modelNode').contains('button[aria-expanded]', 'Columns').click();
    cy.get('@modelNode').find('[data-slot="graph-node-column-piece"]').should('have.length', 3);
    let model: HTMLElement;
    let viewport: HTMLElement;
    let geometry: string;
    let observer: MutationObserver;
    const disruptions: string[] = [];
    cy.get('@modelNode').then(($node) => {
      model = $node[0]!;
      viewport = model.closest<HTMLElement>('.react-flow__viewport')!;
      geometry = `${viewport.style.transform}|${model.style.transform}|${model.offsetHeight}`;
      observer = new MutationObserver(() => {
        const current = `${viewport.style.transform}|${model.style.transform}|${model.offsetHeight}`;
        if (!model.isConnected || !viewport.isConnected || current !== geometry)
          disruptions.push(current);
      });
      observer.observe(viewport, { subtree: true, childList: true, attributes: true });
    });
    cy.get('@modelNode')
      .find('[data-slot="graph-node-materialization"]')
      .should('have.text', 'view')
      .click();
    cy.get('[role="menuitemradio"]').contains('view').should('have.attr', 'aria-checked', 'true');
    cy.screenshot('model-materialization-menu');
    cy.get('[role="menuitemradio"]').contains('table').click();
    cy.get('[role="menu"]').should('not.exist');
    cy.get('[data-slot="canvas-node-workbench-panel"]').should('not.exist');
    waitForE2eApiCall('/workspace/graph/draft', 'PUT');
    cy.get('@modelNode')
      .find('[data-slot="graph-node-materialization"]')
      .should('have.text', 'table');
    cy.wrap(null).should(() => {
      const saved = getE2eApiCalls('/workspace/graph/draft', 'PUT')
        .map((call) =>
          (call.body as { draft: WorkspaceGraphAuthoringDraft }).draft.nodes.find(
            (node) => node.id === 'transform-customers'
          )
        )
        .find(
          (node) =>
            (node?.metadata?.config as { materialized?: string } | undefined)?.materialized ===
            'table'
        );
      expect(saved, 'durably saved native materialization').not.to.be.undefined;
    });
    cy.get('@modelNode').then(($node) => {
      observer.disconnect();
      expect($node[0], 'same mounted card').to.equal(model);
      expect(disruptions, 'no canvas replacement or geometry changes').to.deep.equal([]);
    });
    cy.get('@modelNode').should('have.class', 'selected');
    cy.get('@modelNode')
      .find('[data-slot="graph-node-materialization"] [data-icon="table"]')
      .should('be.visible');
    cy.screenshot('model-materialization-saved');
    revisitWorkbenchCanvas(visitCanvas);
    cy.get('@modelNode')
      .find('[data-slot="graph-node-materialization"]')
      .should('have.text', 'table');
  });

  it('retains the loaded drawer through local storage changes, held saves and acknowledgements', () => {
    visitCanvas();
    cy.get('@modelNode').find('[data-slot="canvas-node-execute"]').focus().click();
    waitForE2eApiCall(/\/transforms\/transform-customers\/data-sample$/, 'GET');
    const drawerSelector = '[data-slot="bottom-operational-drawer"]';
    const tabSelector =
      '[data-slot="bottom-operational-drawer-tab"][data-tab="data:transform-customers"]';
    const searchSelector = '[data-slot="data-grid-toolbar"] input[type="search"]';
    const tableSelector = '[data-slot="bottom-operational-data-table"]';
    const frameSelector = '[data-slot="bottom-operational-data-table-frame"]';
    cy.get(tableSelector).find('tbody tr').should('have.length', 20);
    cy.get(searchSelector).type('customer');
    cy.get(tableSelector).find('[data-column-id="name"]').click();
    cy.get(frameSelector)
      .scrollTo(0, 48)
      .should(($frame) => {
        const frame = $frame[0];
        if (frame === undefined) throw new Error('Expected the loaded result frame.');
        expect(frame.scrollTop, 'loaded rows can scroll').to.be.greaterThan(0);
      });

    let drawer: HTMLElement;
    let tab: HTMLElement;
    let search: HTMLInputElement;
    let table: HTMLElement;
    let frame: HTMLElement;
    let height: number;
    let scrollTop: number;
    let tableText: string;
    let observer: MutationObserver;
    const disruptions: string[] = [];
    type SaveGate = {
      putStarted: boolean;
      getStarted: boolean;
      put: Promise<void>;
      get: Promise<void>;
      releasePut: () => void;
      releaseGet: () => void;
    };
    let activeGate: SaveGate | null = null;
    cy.window().then((window) => {
      drawer = window.document.querySelector<HTMLElement>(drawerSelector)!;
      tab = window.document.querySelector<HTMLElement>(tabSelector)!;
      search = window.document.querySelector<HTMLInputElement>(searchSelector)!;
      table = window.document.querySelector<HTMLElement>(tableSelector)!;
      frame = window.document.querySelector<HTMLElement>(frameSelector)!;
      height = drawer.getBoundingClientRect().height;
      scrollTop = frame.scrollTop;
      tableText = table.textContent!;
      observer = new window.MutationObserver(() => {
        if (![drawer, tab, search, table, frame].every((element) => element.isConnected))
          disruptions.push('loaded drawer DOM was removed');
        if (search.value !== 'customer' || tab.getAttribute('aria-selected') !== 'true')
          disruptions.push('loaded exploration state changed');
      });
      observer.observe(window.document.body, { childList: true, subtree: true, attributes: true });
      const fetch = window.fetch.bind(window);
      window.fetch = async (input, init) => {
        const request = new window.Request(input, init);
        const gate = activeGate;
        if (new URL(request.url).pathname === '/workspace/graph/draft' && gate != null) {
          if (request.method === 'PUT') {
            gate.putStarted = true;
            await gate.put;
          } else if (request.method === 'GET' && gate.putStarted) {
            gate.getStarted = true;
            await gate.get;
          }
        }
        return fetch(input, init);
      };
    });
    const assertContinuity = (): void => {
      cy.get(drawerSelector).should(($drawer) => {
        expect($drawer[0], 'same drawer').to.equal(drawer);
        expect(drawer.getBoundingClientRect().height, 'drawer layout').to.equal(height);
        expect(disruptions, 'no transient empty or replaced drawer').to.deep.equal([]);
      });
      cy.get(tabSelector).should('have.attr', 'aria-selected', 'true');
      cy.get(searchSelector)
        .should('have.value', 'customer')
        .and(($search) => {
          expect($search[0], 'same search control').to.equal(search);
        });
      cy.get(tableSelector).should(($table) => {
        expect($table[0], 'same loaded table').to.equal(table);
        expect(table.textContent, 'same loaded values and order').to.equal(tableText);
      });
      cy.get(frameSelector).should(($frame) => {
        expect($frame[0], 'same table viewport').to.equal(frame);
        expect(frame.scrollTop, 'loaded row position').to.equal(scrollTop);
      });
      cy.then(() => {
        expect(
          getE2eApiCalls(/\/transforms\/transform-customers\/data-sample$/, 'GET')
        ).to.have.length(1);
      });
    };
    for (const materialized of ['table', 'view', 'ephemeral', 'table']) {
      let gate: SaveGate;
      let previousWrites: number;
      cy.then(() => {
        let releasePut!: () => void;
        let releaseGet!: () => void;
        gate = {
          putStarted: false,
          getStarted: false,
          put: new Promise<void>((resolve) => {
            releasePut = resolve;
          }),
          get: new Promise<void>((resolve) => {
            releaseGet = resolve;
          }),
          releasePut: () => releasePut(),
          releaseGet: () => releaseGet(),
        };
        activeGate = gate;
        previousWrites = getE2eApiCalls('/workspace/graph/draft', 'PUT').length;
      });
      cy.get('@modelNode').find('[data-slot="graph-node-materialization"]').click();
      cy.get('[role="menuitemradio"]')
        .contains(new RegExp(`^${materialized}$`))
        .click();
      cy.get('[role="menu"]').should('not.exist');
      cy.get('@modelNode')
        .find('[data-slot="graph-node-materialization"]')
        .should('have.text', materialized);
      assertContinuity();
      cy.wrap(null).should(() => expect(gate.putStarted, 'save is held').to.equal(true));
      assertContinuity();
      cy.then(() => gate.releasePut());
      cy.wrap(null).should(() =>
        expect(gate.getStarted, 'acknowledgement read is held').to.equal(true)
      );
      assertContinuity();
      cy.then(() => gate.releaseGet());
      cy.get('[data-slot="canvas-draft-save-status"]').should('not.exist');
      cy.then(() => {
        activeGate = null;
        const writes = getE2eApiCalls('/workspace/graph/draft', 'PUT');
        expect(writes).to.have.length(previousWrites + 1);
        const saved = (writes.at(-1)!.body as { draft: WorkspaceGraphAuthoringDraft }).draft;
        const config = saved.nodes.find((node) => node.id === 'transform-customers')?.metadata
          ?.config;
        expect(config).to.include({ materialized });
        if (materialized === 'ephemeral') expect(config).not.to.have.property('resultTarget');
      });
      assertContinuity();
    }
    cy.then(() => observer.disconnect());
    cy.get(searchSelector).focus().should('have.focus');
    cy.screenshot('model-materialization-loaded-drawer-continuity');
  });
});
